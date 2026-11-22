import { describe, it, expect } from "vitest";
import { getTimerState, formatSeconds, STAGE_1_DURATION_SECONDS, STAGE_2_DURATION_SECONDS } from "../lib/timer";
import { PaymentOrder } from "../types/order";

describe("Dual Countdown Timer System", () => {
  it("formats seconds into MM:SS correctly", () => {
    expect(formatSeconds(120)).toBe("02:00");
    expect(formatSeconds(119)).toBe("01:59");
    expect(formatSeconds(60)).toBe("01:00");
    expect(formatSeconds(5)).toBe("00:05");
    expect(formatSeconds(0)).toBe("00:00");
    expect(formatSeconds(-10)).toBe("00:00");
  });

  it("returns NOT_STARTED when verification hasn't begun", () => {
    const order: Pick<PaymentOrder, "status" | "verificationStartedAt" | "initialDeadlineAt" | "extendedDeadlineAt"> = {
      status: "AWAITING_PAYMENT",
    };
    const state = getTimerState(order);
    expect(state.stage).toBe("NOT_STARTED");
    expect(state.formattedTime).toBe("02:00");
    expect(state.isOverdue).toBe(false);
  });

  it("calculates STAGE 1 (2-minute window) accurately", () => {
    const now = 1000000;
    const startedAt = new Date(now).toISOString();
    const initialDeadline = new Date(now + 120 * 1000).toISOString();
    const extendedDeadline = new Date(now + 420 * 1000).toISOString();

    const order: Pick<PaymentOrder, "status" | "verificationStartedAt" | "initialDeadlineAt" | "extendedDeadlineAt"> = {
      status: "VERIFICATION_PENDING",
      verificationStartedAt: startedAt,
      initialDeadlineAt: initialDeadline,
      extendedDeadlineAt: extendedDeadline,
    };

    // Exactly at start
    const state0 = getTimerState(order, now, 0);
    expect(state0.stage).toBe("STAGE_1");
    expect(state0.secondsRemaining).toBe(120);
    expect(state0.formattedTime).toBe("02:00");
    expect(state0.title).toBe("Verifying Your Payment");

    // 45 seconds in
    const state45 = getTimerState(order, now + 45 * 1000, 0);
    expect(state45.stage).toBe("STAGE_1");
    expect(state45.secondsRemaining).toBe(75);
    expect(state45.formattedTime).toBe("01:15");
  });

  it("automatically transitions into STAGE 2 (5-minute window) after 120s without customer action", () => {
    const now = 1000000;
    const startedAt = new Date(now).toISOString();
    const initialDeadline = new Date(now + 120 * 1000).toISOString();
    const extendedDeadline = new Date(now + 420 * 1000).toISOString();

    const order: Pick<PaymentOrder, "status" | "verificationStartedAt" | "initialDeadlineAt" | "extendedDeadlineAt"> = {
      status: "VERIFICATION_PENDING",
      verificationStartedAt: startedAt,
      initialDeadlineAt: initialDeadline,
      extendedDeadlineAt: extendedDeadline,
    };

    // 121 seconds in -> Stage 2
    const state121 = getTimerState(order, now + 121 * 1000, 0);
    expect(state121.stage).toBe("STAGE_2");
    expect(state121.secondsRemaining).toBe(299); // 420 - 121
    expect(state121.formattedTime).toBe("04:59");
    expect(state121.title).toBe("Verification Is Taking Longer Than Expected");

    // Halfway through Stage 2 (now + 270s)
    const state270 = getTimerState(order, now + 270 * 1000, 0);
    expect(state270.stage).toBe("STAGE_2");
    expect(state270.secondsRemaining).toBe(150); // 420 - 270
    expect(state270.formattedTime).toBe("02:30");
  });

  it("transitions to OVERDUE after 7 minutes (420s) without declaring failure", () => {
    const now = 1000000;
    const startedAt = new Date(now).toISOString();
    const initialDeadline = new Date(now + 120 * 1000).toISOString();
    const extendedDeadline = new Date(now + 420 * 1000).toISOString();

    const order: Pick<PaymentOrder, "status" | "verificationStartedAt" | "initialDeadlineAt" | "extendedDeadlineAt"> = {
      status: "VERIFICATION_PENDING",
      verificationStartedAt: startedAt,
      initialDeadlineAt: initialDeadline,
      extendedDeadlineAt: extendedDeadline,
    };

    // 500 seconds in (> 420s)
    const stateOverdue = getTimerState(order, now + 500 * 1000, 0);
    expect(stateOverdue.stage).toBe("OVERDUE");
    expect(stateOverdue.secondsRemaining).toBe(0);
    expect(stateOverdue.formattedTime).toBe("00:00");
    expect(stateOverdue.isOverdue).toBe(true);
    expect(stateOverdue.title).toBe("Payment Verification Still Pending");
    expect(stateOverdue.subtitle).toContain("do not pay again");
  });

  it("immediately overrides timer when APPROVED or REJECTED", () => {
    const orderApproved: Pick<PaymentOrder, "status" | "verificationStartedAt" | "initialDeadlineAt" | "extendedDeadlineAt"> = {
      status: "APPROVED",
      verificationStartedAt: new Date().toISOString(),
    };
    const stateApproved = getTimerState(orderApproved);
    expect(stateApproved.stage).toBe("DECIDED");
    expect(stateApproved.title).toBe("Payment Approved");

    const orderRejected: Pick<PaymentOrder, "status" | "verificationStartedAt" | "initialDeadlineAt" | "extendedDeadlineAt"> = {
      status: "REJECTED",
      verificationStartedAt: new Date().toISOString(),
    };
    const stateRejected = getTimerState(orderRejected);
    expect(stateRejected.stage).toBe("DECIDED");
    expect(stateRejected.title).toBe("Payment Rejected");
  });

  it("accounts for client-server clock offset correctly", () => {
    const nowServer = 1000000;
    const clientOffset = 30000; // Client is 30 seconds ahead of server
    const clientNow = nowServer + clientOffset;

    const startedAt = new Date(nowServer).toISOString();
    const initialDeadline = new Date(nowServer + 120 * 1000).toISOString();
    const extendedDeadline = new Date(nowServer + 420 * 1000).toISOString();

    const order: Pick<PaymentOrder, "status" | "verificationStartedAt" | "initialDeadlineAt" | "extendedDeadlineAt"> = {
      status: "VERIFICATION_PENDING",
      verificationStartedAt: startedAt,
      initialDeadlineAt: initialDeadline,
      extendedDeadlineAt: extendedDeadline,
    };

    const state = getTimerState(order, clientNow, clientOffset);
    expect(state.stage).toBe("STAGE_1");
    expect(state.secondsRemaining).toBe(120);
    expect(state.formattedTime).toBe("02:00");
  });
});
