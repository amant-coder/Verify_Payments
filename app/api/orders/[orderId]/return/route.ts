import { NextRequest, NextResponse } from "next/server";
import { recordPaymentReturn, getOrder, updateTelegramMessageMeta } from "@/lib/db";
import { sendVerificationNotification } from "@/lib/telegram";
import { isValidAdminSecret } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }

    const current = await getOrder(orderId);
    if (!current) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify customer ownership or admin
    const customerUid = req.headers.get("x-customer-uid");
    const adminSecret = req.headers.get("x-admin-secret");
    const isOwner = Boolean(current.customerUid && customerUid === current.customerUid);
    const isAdmin = isValidAdminSecret(adminSecret);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const result = await recordPaymentReturn(orderId);
    if (!result) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { order, isFirstReturn } = result;

    // Send Telegram alert on return if not already sent
    if (isFirstReturn && order.status === "VERIFICATION_PENDING" && !order.telegramMessageId) {
      try {
        const tgResult = await sendVerificationNotification(order);
        if (tgResult.success && tgResult.messageId && tgResult.chatId) {
          await updateTelegramMessageMeta(orderId, tgResult.messageId, tgResult.chatId);
        }
      } catch (tgErr) {
        console.error("[Return Route] Error sending Telegram alert:", tgErr);
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
