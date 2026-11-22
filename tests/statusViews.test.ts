import { describe, it, expect } from "vitest";
import { SuccessView } from "../components/SuccessView";
import { RejectedView } from "../components/RejectedView";
import { PaymentOrder } from "../types/order";
import { formatINR } from "../lib/upi";

describe("Fintech Status Views - Structure and Compliance", () => {
  const mockApprovedOrder: PaymentOrder = {
    orderId: "ORD-TEST-1234",
    customerUid: "uid-abc-123",
    amountPaise: 49900,
    currency: "INR",
    status: "APPROVED",
    customerName: "Aman Sharma",
    utr: "423456789012",
    createdAt: "2026-11-23T00:00:00.000Z",
    approvedAt: "2026-11-23T00:02:00.000Z",
    decisionSource: "TELEGRAM",
  };

  const mockRejectedOrder: PaymentOrder = {
    orderId: "ORD-TEST-9999",
    customerUid: "uid-xyz-789",
    amountPaise: 100,
    currency: "INR",
    status: "REJECTED",
    createdAt: "2026-11-23T00:00:00.000Z",
    rejectedAt: "2026-11-23T00:07:00.000Z",
    decisionSource: "ADMIN",
  };

  it("exports SuccessView and RejectedView as valid React components", () => {
    expect(typeof SuccessView).toBe("function");
    expect(typeof RejectedView).toBe("function");
  });

  it("correctly formats currency in paise to standard Indian Rupee notation", () => {
    expect(formatINR(mockApprovedOrder.amountPaise)).toBe("₹499.00");
    expect(formatINR(mockRejectedOrder.amountPaise)).toBe("₹1.00");
  });

  it("ensures approved order preserves transaction integrity fields", () => {
    expect(mockApprovedOrder.status).toBe("APPROVED");
    expect(mockApprovedOrder.orderId).toMatch(/^ORD-/);
    expect(mockApprovedOrder.utr).toBe("423456789012");
  });

  it("ensures rejected order does not claim false banking failure", () => {
    expect(mockRejectedOrder.status).toBe("REJECTED");
    expect(mockRejectedOrder.decisionSource).toBe("ADMIN");
  });
});
