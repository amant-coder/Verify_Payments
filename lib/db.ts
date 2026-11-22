import { PaymentOrder } from "@/types/order";
import { STAGE_1_DURATION_SECONDS, STAGE_2_DURATION_SECONDS } from "./timer";
import type { Firestore } from "firebase-admin/firestore";

// In-memory store used during local testing or when Firebase Admin credentials are not provided
const inMemoryOrders = new Map<string, PaymentOrder>();

// Try to initialize Firebase Admin if configured with non-placeholder credentials
let firestoreDb: Firestore | null = null;

const isPlaceholder = (val?: string) =>
  !val || val.includes("your-app") || val.includes("...") || val.includes("xxxxx");

const hasConfiguredKeys = Boolean(
  process.env.FIREBASE_PROJECT_ID && !isPlaceholder(process.env.FIREBASE_PROJECT_ID) &&
  process.env.FIREBASE_CLIENT_EMAIL && !isPlaceholder(process.env.FIREBASE_CLIENT_EMAIL) &&
  process.env.FIREBASE_PRIVATE_KEY && !isPlaceholder(process.env.FIREBASE_PRIVATE_KEY)
);

try {
  if (hasConfiguredKeys) {
    const admin = require("firebase-admin");
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        }),
      });
    }
    firestoreDb = admin.firestore();
    console.log("[DB] Initialized with real Firebase Firestore.");
  } else {
    // Fail fast in production runtime to prevent cross-instance data loss on serverless
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error("[DB] Fatal: Firebase credentials must be configured in production.");
    }
    console.info("[DB] Running with high-performance In-Memory repository (set Firebase env vars to use cloud Firestore).");
  }
} catch (err) {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw err;
  }
  console.warn("[DB] Firebase Admin init failed or skipped, using fallback store:", err);
}

const ORDERS_COLLECTION = "orders";

export async function getOrder(orderId: string): Promise<PaymentOrder | null> {
  if (firestoreDb) {
    const doc = await firestoreDb.collection(ORDERS_COLLECTION).doc(orderId).get();
    if (!doc.exists) return null;
    return doc.data() as PaymentOrder;
  }
  return inMemoryOrders.get(orderId) || null;
}

export async function createOrder(order: PaymentOrder): Promise<PaymentOrder> {
  if (firestoreDb) {
    await firestoreDb.collection(ORDERS_COLLECTION).doc(order.orderId).set(order);
    return order;
  }
  inMemoryOrders.set(order.orderId, { ...order });
  return order;
}

export async function recordPaymentLaunch(orderId: string): Promise<PaymentOrder | null> {
  const nowIso = new Date().toISOString();

  if (firestoreDb) {
    const docRef = firestoreDb.collection(ORDERS_COLLECTION).doc(orderId);
    let updatedOrder: PaymentOrder | null = null;

    await firestoreDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists) return;
      const current = snap.data() as PaymentOrder;

      // Only transition to PAYMENT_LAUNCHED if still AWAITING_PAYMENT
      if (current.status === "AWAITING_PAYMENT") {
        transaction.update(docRef, {
          status: "PAYMENT_LAUNCHED",
          paymentLaunchedAt: nowIso,
        });
        updatedOrder = { ...current, status: "PAYMENT_LAUNCHED", paymentLaunchedAt: nowIso };
      } else {
        updatedOrder = current;
      }
    });

    return updatedOrder;
  }

  const existing = inMemoryOrders.get(orderId);
  if (!existing) return null;

  if (existing.status === "AWAITING_PAYMENT") {
    existing.status = "PAYMENT_LAUNCHED";
    existing.paymentLaunchedAt = nowIso;
    inMemoryOrders.set(orderId, { ...existing });
  }
  return existing;
}

export interface ReturnRecordResult {
  order: PaymentOrder;
  isFirstReturn: boolean;
}

/**
 * Atomically marks the return of a customer from the payment app.
 * Idempotent: Only initializes timestamps and triggers verification on the first return.
 */
export async function recordPaymentReturn(orderId: string): Promise<ReturnRecordResult | null> {
  const now = new Date();
  const nowIso = now.toISOString();

  const initialDeadline = new Date(now.getTime() + STAGE_1_DURATION_SECONDS * 1000).toISOString();
  const extendedDeadline = new Date(
    now.getTime() + (STAGE_1_DURATION_SECONDS + STAGE_2_DURATION_SECONDS) * 1000
  ).toISOString();

  if (firestoreDb) {
    const docRef = firestoreDb.collection(ORDERS_COLLECTION).doc(orderId);
    let result: ReturnRecordResult | null = null;

    await firestoreDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists) return;
      const current = snap.data() as PaymentOrder;

      // Already decided - do not touch
      if (current.status === "APPROVED" || current.status === "REJECTED") {
        result = { order: current, isFirstReturn: false };
        return;
      }

      // If verification has already started, do NOT reset timers or duplicate notifications
      if (current.verificationStartedAt) {
        result = { order: current, isFirstReturn: false };
        return;
      }

      // First return: Initialize timestamps atomically
      const updates: Partial<PaymentOrder> = {
        status: "VERIFICATION_PENDING",
        verificationStartedAt: nowIso,
        initialDeadlineAt: initialDeadline,
        extendedDeadlineAt: extendedDeadline,
        telegramNotificationSent: true,
      };

      transaction.update(docRef, updates);
      result = {
        order: { ...current, ...updates },
        isFirstReturn: true,
      };
    });

    return result;
  }

  const existing = inMemoryOrders.get(orderId);
  if (!existing) return null;

  if (existing.status === "APPROVED" || existing.status === "REJECTED") {
    return { order: existing, isFirstReturn: false };
  }

  if (existing.verificationStartedAt) {
    return { order: existing, isFirstReturn: false };
  }

  existing.status = "VERIFICATION_PENDING";
  existing.verificationStartedAt = nowIso;
  existing.initialDeadlineAt = initialDeadline;
  existing.extendedDeadlineAt = extendedDeadline;
  existing.telegramNotificationSent = true;
  inMemoryOrders.set(orderId, { ...existing });

  return { order: { ...existing }, isFirstReturn: true };
}

/**
 * Updates an order with customer-provided UTR / reference number.
 */
export async function updateOrderUtr(orderId: string, utr: string): Promise<PaymentOrder | null> {
  const cleanUtr = utr.trim().replace(/[^a-zA-Z0-9]/g, "");
  if (!cleanUtr) return null;

  if (firestoreDb) {
    const docRef = firestoreDb.collection(ORDERS_COLLECTION).doc(orderId);
    await docRef.update({ utr: cleanUtr });
    const snap = await docRef.get();
    return snap.data() as PaymentOrder;
  }

  const existing = inMemoryOrders.get(orderId);
  if (!existing) return null;

  existing.utr = cleanUtr;
  inMemoryOrders.set(orderId, { ...existing });
  return existing;
}

/**
 * Records merchant decision (APPROVED or REJECTED) atomically.
 * Prevents race conditions, duplicates, or changing an already-finalized order.
 */
export async function recordOrderDecision(
  orderId: string,
  decision: "APPROVED" | "REJECTED",
  decidedBy: string,
  source: "TELEGRAM" | "ADMIN"
): Promise<{ success: boolean; order?: PaymentOrder; alreadyDecided?: boolean; error?: string }> {
  const nowIso = new Date().toISOString();

  if (firestoreDb) {
    const docRef = firestoreDb.collection(ORDERS_COLLECTION).doc(orderId);
    let finalResult: { success: boolean; order?: PaymentOrder; alreadyDecided?: boolean; error?: string } = {
      success: false,
    };

    await firestoreDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists) {
        finalResult = { success: false, error: "Order not found." };
        return;
      }

      const current = snap.data() as PaymentOrder;

      // If already decided, reject replayed or conflicting actions
      if (current.status === "APPROVED" || current.status === "REJECTED") {
        finalResult = {
          success: false,
          alreadyDecided: true,
          order: current,
          error: `Order already finalized as ${current.status}.`,
        };
        return;
      }

      const updates: Partial<PaymentOrder> = {
        status: decision,
        decisionSource: source,
        approvedBy: decidedBy,
        ...(decision === "APPROVED" ? { approvedAt: nowIso } : { rejectedAt: nowIso }),
      };

      transaction.update(docRef, updates);
      finalResult = {
        success: true,
        order: { ...current, ...updates },
      };
    });

    return finalResult;
  }

  const existing = inMemoryOrders.get(orderId);
  if (!existing) return { success: false, error: "Order not found." };

  if (existing.status === "APPROVED" || existing.status === "REJECTED") {
    return {
      success: false,
      alreadyDecided: true,
      order: existing,
      error: `Order already finalized as ${existing.status}.`,
    };
  }

  existing.status = decision;
  existing.decisionSource = source;
  existing.approvedBy = decidedBy;
  if (decision === "APPROVED") {
    existing.approvedAt = nowIso;
  } else {
    existing.rejectedAt = nowIso;
  }

  inMemoryOrders.set(orderId, { ...existing });
  return { success: true, order: { ...existing } };
}

export async function updateTelegramMessageMeta(
  orderId: string,
  messageId: number,
  chatId: string | number
): Promise<void> {
  if (firestoreDb) {
    await firestoreDb.collection(ORDERS_COLLECTION).doc(orderId).update({
      telegramMessageId: messageId,
      telegramChatId: chatId,
    });
    return;
  }
  const existing = inMemoryOrders.get(orderId);
  if (existing) {
    existing.telegramMessageId = messageId;
    existing.telegramChatId = chatId;
    inMemoryOrders.set(orderId, { ...existing });
  }
}

export async function listOrders(): Promise<PaymentOrder[]> {
  if (firestoreDb) {
    const snap = await firestoreDb.collection(ORDERS_COLLECTION).orderBy("createdAt", "desc").get();
    return snap.docs.map((doc) => doc.data() as PaymentOrder);
  }
  return Array.from(inMemoryOrders.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Helper to reset in-memory store in tests
export function _resetStoreForTesting() {
  inMemoryOrders.clear();
}
