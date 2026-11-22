import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { PaymentOrder } from "@/types/order";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

const app = hasFirebaseConfig
  ? !getApps().length
    ? initializeApp(firebaseConfig)
    : getApp()
  : null;

export const auth = app ? getAuth(app) : null;
export const firestore = app ? getFirestore(app) : null;

/**
 * Ensures anonymous authentication for the customer checkout session.
 * Returns the customer UID.
 */
export async function getOrCreateCustomerUid(): Promise<string> {
  if (typeof window === "undefined") {
    return "server-uid";
  }

  // Check localStorage for persisted anonymous customer UID
  const cachedUid = localStorage.getItem("upi_customer_uid");
  if (cachedUid) return cachedUid;

  if (auth) {
    try {
      const cred = await signInAnonymously(auth);
      const uid = cred.user.uid;
      localStorage.setItem("upi_customer_uid", uid);
      return uid;
    } catch (err) {
      console.warn("[Auth] Anonymous sign-in failed, falling back to local UUID:", err);
    }
  }

  // Fallback UUID generation
  const localUid = "cust_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
  localStorage.setItem("upi_customer_uid", localUid);
  return localUid;
}

/**
 * Real-time order document listener.
 * Uses Firebase Firestore onSnapshot when configured,
 * or falls back to an SSE stream with lightweight polling backup.
 */
export function subscribeToOrder(
  orderId: string,
  onUpdate: (order: PaymentOrder) => void,
  onError?: (err: Error) => void
): () => void {
  if (firestore) {
    try {
      const orderRef = doc(firestore, "orders", orderId);
      return onSnapshot(
        orderRef,
        (snap) => {
          if (snap.exists()) onUpdate(snap.data() as PaymentOrder);
        },
        (err) => {
          console.warn("[Firestore] onSnapshot error:", err);
          if (onError) onError(err);
        }
      );
    } catch (err) {
      console.warn("[Firestore] Listener error, falling back to SSE:", err);
    }
  }

  // Fallback: EventSource (SSE) with poll-on-error fallback
  let isSubscribed = true;
  let eventSource: EventSource | null = null;
  let pollInterval: NodeJS.Timeout | null = null;

  const startPolling = () => {
    if (pollInterval || !isSubscribed) return;
    pollInterval = setInterval(async () => {
      if (!isSubscribed) return;
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.order) onUpdate(data.order);
        }
      } catch {}
    }, 2500);
  };

  try {
    eventSource = new EventSource(`/api/orders/${orderId}/stream`);
    eventSource.onmessage = (event) => {
      if (!isSubscribed) return;
      try {
        onUpdate(JSON.parse(event.data) as PaymentOrder);
      } catch (e) {
        console.error("Failed to parse SSE order event:", e);
      }
    };
    eventSource.onerror = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      startPolling();
    };
  } catch {
    startPolling();
  }

  return () => {
    isSubscribed = false;
    if (pollInterval) clearInterval(pollInterval);
    if (eventSource) eventSource.close();
  };
}
