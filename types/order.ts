export type OrderStatus =
  | "AWAITING_PAYMENT"
  | "PAYMENT_LAUNCHED"
  | "VERIFICATION_PENDING"
  | "APPROVED"
  | "REJECTED";

export interface PaymentOrder {
  orderId: string;
  customerUid: string;
  amountPaise: number; // Stored as integer paise (e.g. 99900 = ₹999.00)
  currency: "INR";
  status: OrderStatus;

  customerName?: string;
  customerPhone?: string;
  utr?: string;

  createdAt: string; // ISO string for portability & Firestore Timestamp serialization
  paymentLaunchedAt?: string;
  verificationStartedAt?: string;
  initialDeadlineAt?: string; // Started + 2 minutes
  extendedDeadlineAt?: string; // Started + 7 minutes (2m + 5m)

  approvedAt?: string;
  rejectedAt?: string;
  approvedBy?: string;
  decisionSource?: "TELEGRAM" | "ADMIN";

  telegramMessageId?: number;
  telegramChatId?: string | number;
  telegramNotificationSent?: boolean;
}

export type TimerStage =
  | "NOT_STARTED"
  | "STAGE_1" // 2-minute initial verification
  | "STAGE_2" // 5-minute extended verification
  | "OVERDUE" // > 7 minutes total, still pending manual decision
  | "DECIDED"; // APPROVED or REJECTED

export interface TimerState {
  stage: TimerStage;
  secondsRemaining: number;
  formattedTime: string; // "MM:SS"
  title: string;
  subtitle: string;
  isOverdue: boolean;
  totalStageSeconds: number;
  progressPercent: number; // 0 - 100
}

export interface CreateOrderRequest {
  amountPaise: number;
  customerName?: string;
  customerPhone?: string;
}

export interface DecisionRequest {
  decision: "APPROVE" | "REJECT";
  adminSecret: string;
}

export interface UtrSubmitRequest {
  utr: string;
}
