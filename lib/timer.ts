import { PaymentOrder, TimerStage, TimerState } from "@/types/order";

export const STAGE_1_DURATION_SECONDS = 120; // 2 minutes
export const STAGE_2_DURATION_SECONDS = 300; // 5 minutes
export const TOTAL_VERIFICATION_SECONDS = STAGE_1_DURATION_SECONDS + STAGE_2_DURATION_SECONDS; // 7 minutes (420s)

/**
 * Derives current timer stage and countdown from persisted server timestamps.
 * Server timestamps are authoritative.
 *
 * @param order - The payment order
 * @param clientNowMs - Current timestamp in ms (defaults to Date.now())
 * @param serverClockOffsetMs - Difference between server time and client time (clientNow - serverNow)
 */
export function getTimerState(
  order: Pick<PaymentOrder, "status" | "verificationStartedAt" | "initialDeadlineAt" | "extendedDeadlineAt">,
  clientNowMs: number = Date.now(),
  serverClockOffsetMs: number = 0
): TimerState {
  if (order.status === "APPROVED" || order.status === "REJECTED") {
    return {
      stage: "DECIDED",
      secondsRemaining: 0,
      formattedTime: "00:00",
      title: order.status === "APPROVED" ? "Payment Approved" : "Payment Rejected",
      subtitle: order.status === "APPROVED" ? "Your transaction was verified." : "Verification was declined.",
      isOverdue: false,
      totalStageSeconds: 0,
      progressPercent: 100,
    };
  }

  if (order.status === "AWAITING_PAYMENT" || order.status === "PAYMENT_LAUNCHED" || !order.verificationStartedAt) {
    return {
      stage: "NOT_STARTED",
      secondsRemaining: STAGE_1_DURATION_SECONDS,
      formattedTime: formatSeconds(STAGE_1_DURATION_SECONDS),
      title: "Ready to Pay",
      subtitle: "Click Pay Now or scan QR code to initiate payment.",
      isOverdue: false,
      totalStageSeconds: STAGE_1_DURATION_SECONDS,
      progressPercent: 0,
    };
  }

  // Adjusted authoritative current time
  const effectiveNowMs = clientNowMs - serverClockOffsetMs;
  const initialDeadlineMs = order.initialDeadlineAt
    ? new Date(order.initialDeadlineAt).getTime()
    : new Date(order.verificationStartedAt).getTime() + STAGE_1_DURATION_SECONDS * 1000;

  const extendedDeadlineMs = order.extendedDeadlineAt
    ? new Date(order.extendedDeadlineAt).getTime()
    : initialDeadlineMs + STAGE_2_DURATION_SECONDS * 1000;

  // STAGE 1: Within first 2 minutes
  if (effectiveNowMs < initialDeadlineMs) {
    const msRemaining = Math.max(0, initialDeadlineMs - effectiveNowMs);
    const secondsRemaining = Math.ceil(msRemaining / 1000);
    const elapsedSeconds = STAGE_1_DURATION_SECONDS - secondsRemaining;
    const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedSeconds / STAGE_1_DURATION_SECONDS) * 100)));

    return {
      stage: "STAGE_1",
      secondsRemaining,
      formattedTime: formatSeconds(secondsRemaining),
      title: "Verifying Your Payment",
      subtitle: "Your transaction is being reviewed. Please keep this page open.",
      isOverdue: false,
      totalStageSeconds: STAGE_1_DURATION_SECONDS,
      progressPercent,
    };
  }

  // STAGE 2: Between 2 minutes and 7 minutes
  if (effectiveNowMs < extendedDeadlineMs) {
    const msRemaining = Math.max(0, extendedDeadlineMs - effectiveNowMs);
    const secondsRemaining = Math.ceil(msRemaining / 1000);
    const elapsedSeconds = STAGE_2_DURATION_SECONDS - secondsRemaining;
    const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedSeconds / STAGE_2_DURATION_SECONDS) * 100)));

    return {
      stage: "STAGE_2",
      secondsRemaining,
      formattedTime: formatSeconds(secondsRemaining),
      title: "Verification Is Taking Longer Than Expected",
      subtitle: "We're continuing to verify your transaction. You do not need to make another payment.",
      isOverdue: false,
      totalStageSeconds: STAGE_2_DURATION_SECONDS,
      progressPercent,
    };
  }

  // STAGE 3: Overdue (> 7 minutes total, still pending)
  return {
    stage: "OVERDUE",
    secondsRemaining: 0,
    formattedTime: "00:00",
    title: "Payment Verification Still Pending",
    subtitle: "We haven't completed verification yet. Please do not pay again. Keep your order ID for assistance.",
    isOverdue: true,
    totalStageSeconds: TOTAL_VERIFICATION_SECONDS,
    progressPercent: 100,
  };
}

export function formatSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
