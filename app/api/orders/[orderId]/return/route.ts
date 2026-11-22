import { NextRequest, NextResponse } from "next/server";
import { recordPaymentReturn, updateTelegramMessageMeta } from "@/lib/db";
import { sendVerificationNotification } from "@/lib/telegram";

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }

    const result = await recordPaymentReturn(orderId);
    if (!result) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { order, isFirstReturn } = result;

    // Send Telegram alert on return only if not already sent upon creation
    if (isFirstReturn && order.status === "VERIFICATION_PENDING" && !order.telegramMessageId) {
      try {
        const tgResult = await sendVerificationNotification(order);
        if (tgResult.success && tgResult.messageId && tgResult.chatId) {
          await updateTelegramMessageMeta(orderId, tgResult.messageId, tgResult.chatId);
        }
      } catch (tgErr) {
        console.error("[Return Route] Error sending Telegram alert:", tgErr);
        // Do not fail customer flow if Telegram fails
      }
    }

    return NextResponse.json({
      success: true,
      order,
      isFirstReturn,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to process payment return:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
