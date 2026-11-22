import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID." }, { status: 400 });
    }

    const order = await getOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Provide server current time for accurate client-server clock offset calculation
    return NextResponse.json({
      success: true,
      order,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error fetching order:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
