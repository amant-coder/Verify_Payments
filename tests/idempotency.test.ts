import { describe, it, expect, beforeEach } from "vitest";
import {
  createOrder,
  recordPaymentLaunch,
  recordPaymentReturn,
  recordOrderDecision,
  updateOrderUtr,
  _resetStoreForTesting,
} from "../lib/db";
import { PaymentOrder } from "../types/order";

describe("Return Detection & Idempotency", () => {
  beforeEach(() => {
    _resetStoreForTesting();
  });

  it("initializes verification on the first return event", async () => {
    const order: PaymentOrder = {
      orderId: "ORD-TEST-1",
      customerUid: "cust_123",
      amountPaise: 50000,
      currency: "INR",
      status: "AWAITING_PAYMENT",
      createdAt: new Date().toISOString(),
    };
    await createOrder(order);

    // Customer launches payment
    await recordPaymentLaunch("ORD-TEST-1");

    // First return from app
    const returnResult1 = await recordPaymentReturn("ORD-TEST-1");
    expect(returnResult1).not.toBeNull();
    expect(returnResult1!.isFirstReturn).toBe(true);
    expect(returnResult1!.order.status).toBe("VERIFICATION_PENDING");
    expect(returnResult1!.order.verificationStartedAt).toBeDefined();
    expect(returnResult1!.order.initialDeadlineAt).toBeDefined();
    expect(returnResult1!.order.extendedDeadlineAt).toBeDefined();
    expect(returnResult1!.order.telegramNotificationSent).toBe(true);

    const startedTime = returnResult1!.order.verificationStartedAt;

    // Second return (e.g. repeated focus, navigation, or page refresh)
    const returnResult2 = await recordPaymentReturn("ORD-TEST-1");
    expect(returnResult2).not.toBeNull();
    expect(returnResult2!.isFirstReturn).toBe(false); // IDEMPOTENT: Not a first return
    expect(returnResult2!.order.verificationStartedAt).toBe(startedTime); // Timers are NOT reset
  });

  it("prevents changing order once finalized as APPROVED or REJECTED", async () => {
    const order: PaymentOrder = {
      orderId: "ORD-DECIDED",
      customerUid: "cust_456",
      amountPaise: 100000,
      currency: "INR",
      status: "VERIFICATION_PENDING",
      createdAt: new Date().toISOString(),
      verificationStartedAt: new Date().toISOString(),
    };
    await createOrder(order);

    // Merchant approves
    const dec1 = await recordOrderDecision("ORD-DECIDED", "APPROVED", "MerchantBot", "TELEGRAM");
    expect(dec1.success).toBe(true);
    expect(dec1.order?.status).toBe("APPROVED");

    // Replay attack / duplicate click
    const dec2 = await recordOrderDecision("ORD-DECIDED", "APPROVED", "MerchantBot", "TELEGRAM");
    expect(dec2.success).toBe(false);
    expect(dec2.alreadyDecided).toBe(true);

    // Conflicting reject attempt
    const dec3 = await recordOrderDecision("ORD-DECIDED", "REJECTED", "AnotherUser", "ADMIN");
    expect(dec3.success).toBe(false);
    expect(dec3.alreadyDecided).toBe(true);

    // Customer return after decision does not alter status
    const returnPostDecision = await recordPaymentReturn("ORD-DECIDED");
    expect(returnPostDecision?.order.status).toBe("APPROVED");
    expect(returnPostDecision?.isFirstReturn).toBe(false);
  });

  it("blocks approval while order is still AWAITING_PAYMENT, but allows rejection", async () => {
    const order: PaymentOrder = {
      orderId: "ORD-UNVERIFIED",
      customerUid: "cust_unver",
      amountPaise: 20000,
      currency: "INR",
      status: "AWAITING_PAYMENT",
      createdAt: new Date().toISOString(),
    };
    await createOrder(order);

    // Premature approval must be blocked
    const decApproved = await recordOrderDecision("ORD-UNVERIFIED", "APPROVED", "AdminUser", "ADMIN");
    expect(decApproved.success).toBe(false);
    expect(decApproved.error).toContain("Cannot approve order while awaiting payment");

    // Rejection of abandoned/unpaid order is permitted
    const decRejected = await recordOrderDecision("ORD-UNVERIFIED", "REJECTED", "AdminUser", "ADMIN");
    expect(decRejected.success).toBe(true);
    expect(decRejected.order?.status).toBe("REJECTED");
  });

  it("updates customer UTR without modifying verification timestamps", async () => {
    const order: PaymentOrder = {
      orderId: "ORD-UTR",
      customerUid: "cust_789",
      amountPaise: 75000,
      currency: "INR",
      status: "VERIFICATION_PENDING",
      createdAt: new Date().toISOString(),
      verificationStartedAt: new Date().toISOString(),
    };
    await createOrder(order);

    const updated = await updateOrderUtr("ORD-UTR", "412345678901");
    expect(updated).not.toBeNull();
    expect(updated?.utr).toBe("412345678901");
    expect(updated?.status).toBe("VERIFICATION_PENDING");
  });
});
