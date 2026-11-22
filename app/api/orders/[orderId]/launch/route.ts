import { NextRequest, NextResponse } from "next/server";
import { recordPaymentLaunch } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }

    const updated = await recordPaymentLaunch(orderId);
    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    console.error("Failed to record payment launch:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
