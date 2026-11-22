import { NextRequest, NextResponse } from "next/server";
import { updateOrderUtr } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const body = await req.json();
    const { utr } = body;

    if (!utr || typeof utr !== "string" || utr.trim().length < 6) {
      return NextResponse.json(
        { error: "Please enter a valid 12-digit UTR or transaction reference." },
        { status: 400 }
      );
    }

    const updated = await updateOrderUtr(orderId, utr);
    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    console.error("Failed to update UTR:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
