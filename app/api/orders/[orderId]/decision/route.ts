import { NextRequest, NextResponse } from "next/server";
import { recordOrderDecision, getOrder } from "@/lib/db";
import { updateTelegramDecision } from "@/lib/telegram";
import { isValidAdminSecret } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const authHeader = req.headers.get("x-admin-secret");
    const body = await req.json();
    const { decision, adminSecret, adminUser } = body;

    // Verify admin secret authentication
    const providedSecret = authHeader || adminSecret;
    if (!isValidAdminSecret(providedSecret)) {
      return NextResponse.json({ error: "Unauthorized. Invalid admin secret." }, { status: 401 });
    }

    if (decision !== "APPROVED" && decision !== "REJECTED") {
      return NextResponse.json(
        { error: "Invalid decision. Must be APPROVED or REJECTED." },
        { status: 400 }
      );
    }

    const result = await recordOrderDecision(
      orderId,
      decision,
      adminUser || "DashboardAdmin",
      "ADMIN"
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Decision failed", alreadyDecided: result.alreadyDecided },
        { status: 400 }
      );
    }

    // Attempt to update Telegram message if it exists
    if (result.order?.telegramChatId && result.order?.telegramMessageId) {
      try {
        await updateTelegramDecision(
          result.order.telegramChatId,
          result.order.telegramMessageId,
          orderId,
          decision,
          adminUser || "admin",
          result.order.amountPaise
        );
      } catch (err) {
        console.warn("Failed to sync Telegram message on dashboard decision:", err);
      }
    }

    return NextResponse.json({ success: true, order: result.order });
  } catch (err) {
    console.error("Decision endpoint error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
