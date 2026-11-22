import { NextRequest, NextResponse } from "next/server";
import { createOrder, listOrders, isFirestoreConnected } from "@/lib/db";
import { isValidAdminSecret } from "@/lib/auth";
import { PaymentOrder } from "@/types/order";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amountPaise, customerName, customerPhone, customerUid } = body;

    // Validate amount in integer paise
    if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
      return NextResponse.json(
        { error: "amountPaise must be a positive integer in paise." },
        { status: 400 }
      );
    }

    // Minimum 100 paise (₹1.00), maximum ₹1,00,000 (10,000,000 paise)
    if (amountPaise < 100 || amountPaise > 10000000) {
      return NextResponse.json(
        { error: "Amount must be between ₹1.00 and ₹1,00,000.00." },
        { status: 400 }
      );
    }

    const orderId = "ORD-" + Math.random().toString(36).substring(2, 8).toUpperCase() + "-" + Date.now().toString().slice(-4);

    const newOrder: PaymentOrder = {
      orderId,
      customerUid: customerUid || "anon_" + Math.random().toString(36).substring(2, 10),
      amountPaise,
      currency: "INR",
      status: "AWAITING_PAYMENT",
      customerName: customerName ? String(customerName).slice(0, 50) : undefined,
      customerPhone: customerPhone ? String(customerPhone).slice(0, 15) : undefined,
      createdAt: new Date().toISOString(),
    };

    await createOrder(newOrder);

    return NextResponse.json({ success: true, order: newOrder }, { status: 201 });
  } catch (err: any) {
    console.error("Order creation failed:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("x-admin-secret");
    if (!isValidAdminSecret(authHeader)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orders = await listOrders();
    return NextResponse.json({
      success: true,
      orders,
      storage: isFirestoreConnected() ? "FIRESTORE" : "IN_MEMORY",
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to list orders" }, { status: 500 });
  }
}
