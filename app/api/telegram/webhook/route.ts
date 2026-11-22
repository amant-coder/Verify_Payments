import { NextRequest, NextResponse } from "next/server";
import { recordOrderDecision, getOrder } from "@/lib/db";
import {
  answerTelegramCallback,
  isTelegramAdmin,
  updateTelegramDecision,
} from "@/lib/telegram";

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Telegram secret token header
    if (TELEGRAM_WEBHOOK_SECRET) {
      const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
      if (headerSecret !== TELEGRAM_WEBHOOK_SECRET) {
        console.warn("[Security] Unauthorized Telegram webhook request: secret mismatch.");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      console.error("[Security] TELEGRAM_WEBHOOK_SECRET not set in production. Rejecting request.");
      return NextResponse.json({ error: "Webhook secret not configured." }, { status: 401 });
    }

    const payload = await req.json();

    // Check if this update contains a callback_query (inline button click)
    const callbackQuery = payload.callback_query;
    if (!callbackQuery) {
      // Just a normal message or command - acknowledge OK
      return NextResponse.json({ ok: true });
    }

    const callbackId = callbackQuery.id;
    const fromUser = callbackQuery.from;
    const userId = fromUser?.id;
    const userName = fromUser?.username || fromUser?.first_name || `User_${userId}`;
    const callbackData = callbackQuery.data as string; // e.g. "approve:ORD-1234" or "reject:ORD-1234"
    const message = callbackQuery.message;
    const chatId = message?.chat?.id;
    const messageId = message?.message_id;

    // 2. Validate that the user who clicked the button is an authorized admin
    if (!isTelegramAdmin(userId)) {
      console.warn(`[Security] Unauthorized user ${userId} (@${userName}) attempted approval.`);
      await answerTelegramCallback(
        callbackId,
        "⛔ You are not authorized to approve/reject payments.",
        true
      );
      return NextResponse.json({ ok: true });
    }

    // 3. Parse action and orderId
    const [action, orderId] = (callbackData || "").split(":");
    if (!action || !orderId || (action !== "approve" && action !== "reject")) {
      await answerTelegramCallback(callbackId, "Invalid action request.", false);
      return NextResponse.json({ ok: true });
    }

    const targetStatus = action === "approve" ? "APPROVED" : "REJECTED";

    // 4. Atomically record decision in database
    const decisionResult = await recordOrderDecision(
      orderId,
      targetStatus,
      userName,
      "TELEGRAM"
    );

    if (!decisionResult.success) {
      if (decisionResult.alreadyDecided) {
        await answerTelegramCallback(
          callbackId,
          `⚠️ Order ${orderId} was already finalized as ${decisionResult.order?.status}.`,
          true
        );
      } else {
        await answerTelegramCallback(
          callbackId,
          `❌ Error: ${decisionResult.error || "Order not found."}`,
          true
        );
      }
      return NextResponse.json({ ok: true });
    }

    // 5. Update Telegram message to reflect decision and remove buttons
    if (chatId && messageId && decisionResult.order) {
      await updateTelegramDecision(
        chatId,
        messageId,
        orderId,
        targetStatus,
        userName,
        decisionResult.order.amountPaise
      );
    }

    // 6. Acknowledge callback query
    const toastMessage =
      targetStatus === "APPROVED"
        ? `✅ Order ${orderId} APPROVED successfully!`
        : `❌ Order ${orderId} REJECTED.`;

    await answerTelegramCallback(callbackId, toastMessage, false);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook handler exception:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
