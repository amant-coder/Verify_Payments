import { PaymentOrder } from "@/types/order";
import { formatINR } from "./upi";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_ALLOWED_ADMIN_IDS = (process.env.TELEGRAM_ALLOWED_ADMIN_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface TelegramNotificationResult {
  success: boolean;
  messageId?: number;
  chatId?: string | number;
  error?: string;
  skipped?: boolean;
}

/**
 * Sends a high-priority payment verification request to the merchant's Telegram bot/channel.
 * Includes inline APPROVE and REJECT buttons with callback_data.
 */
export async function sendVerificationNotification(
  order: PaymentOrder
): Promise<TelegramNotificationResult> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured. Skipping alert.");
    return { success: false, skipped: true, error: "Telegram credentials not configured." };
  }

  const amountFormatted = escapeHtml(formatINR(order.amountPaise));
  const customerDisplay = escapeHtml(order.customerName ? order.customerName : "Anonymous / Web Customer");
  const utrDisplay = order.utr ? `\n<b>UTR / Ref:</b> <code>${escapeHtml(order.utr)}</code>` : "";

  const text = [
    `🚨 <b>NEW UPI VERIFICATION REQUEST</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `<b>Order ID:</b> <code>${escapeHtml(order.orderId)}</code>`,
    `<b>Amount:</b> <b>${amountFormatted}</b>`,
    `<b>Customer:</b> ${customerDisplay}`,
    order.customerPhone ? `<b>Phone:</b> ${escapeHtml(order.customerPhone)}` : null,
    utrDisplay ? utrDisplay : null,
    `<b>Payment Status:</b> ⏳ <b>NOT BANK VERIFIED</b>`,
    `<b>Window:</b> 2 min (Standard) + 5 min (Extended)`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `⚠️ <b>ACTION REQUIRED:</b>`,
    `Please check your receiving bank account / UPI statement for incoming credit of <b>${amountFormatted}</b> before approving.`,
  ]
    .filter(Boolean)
    .join("\n");

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: "✅ APPROVE", callback_data: `approve:${order.orderId}` },
        { text: "❌ REJECT", callback_data: `reject:${order.orderId}` },
      ],
    ],
  };

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error("[Telegram] API error:", data);
      return { success: false, error: data.description || "Telegram API call failed" };
    }

    return {
      success: true,
      messageId: data.result?.message_id,
      chatId: data.result?.chat?.id,
    };
  } catch (err) {
    console.error("[Telegram] Network exception:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Updates an existing Telegram verification message to reflect the merchant's decision.
 */
export async function updateTelegramDecision(
  chatId: string | number,
  messageId: number,
  orderId: string,
  decision: "APPROVED" | "REJECTED",
  adminUser: string,
  amountPaise: number
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;

  const symbol = decision === "APPROVED" ? "✅" : "❌";
  const statusColor = decision === "APPROVED" ? "VERIFIED &amp; APPROVED" : "REJECTED";
  const amountFormatted = escapeHtml(formatINR(amountPaise));
  const safeAdmin = escapeHtml(adminUser || "admin");

  const updatedText = [
    `${symbol} <b>UPI ORDER ${statusColor}</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `<b>Order ID:</b> <code>${escapeHtml(orderId)}</code>`,
    `<b>Amount:</b> <b>${amountFormatted}</b>`,
    `<b>Decision:</b> <b>${decision}</b>`,
    `<b>Decided By:</b> @${safeAdmin}`,
    `<b>Timestamp:</b> ${new Date().toISOString()}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `<i>Customer checkout page updated in real time.</i>`,
  ].join("\n");

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: updatedText,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [] }, // Remove buttons once decided
      }),
    });
    return true;
  } catch (err) {
    console.error("[Telegram] Failed to edit message:", err);
    return false;
  }
}

/**
 * Answers a Telegram callback query with toast text.
 */
export async function answerTelegramCallback(
  callbackQueryId: string,
  text: string,
  showAlert: boolean = false
): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });
  } catch (err) {
    console.error("[Telegram] Failed to answer callback query:", err);
  }
}

/**
 * Validates whether a Telegram user ID is authorized to approve payments.
 */
export function isTelegramAdmin(userId: number | string): boolean {
  if (!userId) return false;
  // If allowed list is empty, disallow by default for security
  if (TELEGRAM_ALLOWED_ADMIN_IDS.length === 0) {
    console.warn("[Security] TELEGRAM_ALLOWED_ADMIN_IDS is empty. All Telegram actions will be denied.");
    return false;
  }
  return TELEGRAM_ALLOWED_ADMIN_IDS.includes(String(userId).trim());
}
