"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { PaymentOrder, TimerState } from "@/types/order";
import { getTimerState } from "@/lib/timer";
import { buildUpiUri, launchUpiApp } from "@/lib/upi";
import { getOrCreateCustomerUid, subscribeToOrder } from "@/lib/firebase";
import { CheckoutView } from "@/components/CheckoutView";
import { VerificationView } from "@/components/VerificationView";
import { SuccessView } from "@/components/SuccessView";
import { RejectedView } from "@/components/RejectedView";
import { Loader2 } from "lucide-react";

const BUSINESS_NAME = process.env.NEXT_PUBLIC_MERCHANT_NAME || "Acme Store India";
const UPI_ID = process.env.NEXT_PUBLIC_MERCHANT_UPI_ID || "acmestore@okhdfcbank";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;

  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState<number>(0);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [customerUid, setCustomerUid] = useState<string>("");

  // Derive timer state
  const [timerState, setTimerState] = useState<TimerState | null>(null);

  // Return detection guard: prevent duplicate return posts within the same visibility cycle
  const hasTriggeredReturnRef = useRef<boolean>(false);

  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {};
    const uid = customerUid || (typeof window !== "undefined" ? localStorage.getItem("upi_customer_uid") || "" : "");
    if (uid) headers["x-customer-uid"] = uid;
    return headers;
  }, [customerUid]);

  // 1. Initial order fetch & clock offset estimation
  const fetchOrderData = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404) {
          setError("Order not found or has expired.");
        } else if (res.status === 403) {
          setError("Access denied. You do not have permission to view this order.");
        } else {
          setError("Failed to load checkout details.");
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.order) {
        setOrder(data.order);
        if (data.serverTime) {
          const clientNow = Date.now();
          const serverNow = new Date(data.serverTime).getTime();
          setServerClockOffsetMs(clientNow - serverNow);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error("Order fetch error:", err);
      setError("Network error while connecting to payment service.");
      setLoading(false);
    }
  }, [orderId, getAuthHeaders]);

  // 2. Initialize customer UID and fetch order
  useEffect(() => {
    getOrCreateCustomerUid()
      .then((uid) => {
        setCustomerUid(uid);
        setAuthReady(true);
      })
      .catch((err) => {
        console.warn(err);
        setAuthReady(true);
      });
    fetchOrderData();
  }, [fetchOrderData]);

  // 3. Subscribe to real-time order updates once auth is established
  useEffect(() => {
    if (!orderId || !authReady) return;
    const unsubscribe = subscribeToOrder(
      orderId,
      (updatedOrder) => {
        setOrder(updatedOrder);
      },
      (err) => {
        console.warn("Real-time listener warning:", err);
      }
    );
    return () => unsubscribe();
  }, [orderId, authReady]);

  // 4. Send Return Event to backend
  const handleCustomerReturn = useCallback(async () => {
    if (!orderId) return;
    if (hasTriggeredReturnRef.current) return;

    // Check if a payment launch attempt was recorded for this session
    const launchKey = `upi_launch_${orderId}`;
    const wasLaunched = sessionStorage.getItem(launchKey);

    // If never launched in this session, don't auto-start verification
    if (!wasLaunched) return;

    hasTriggeredReturnRef.current = true;
    sessionStorage.removeItem(launchKey);

    try {
      const res = await fetch(`/api/orders/${orderId}/return`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setOrder(data.order);
        }
      }
    } catch (err) {
      console.error("Failed to post return event:", err);
    }
  }, [orderId, getAuthHeaders]);

  // 5. Automatic browser return detection (visibilitychange, pageshow, focus)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleCustomerReturn();
      }
    };

    const onPageShow = (e: PageTransitionEvent) => {
      handleCustomerReturn();
    };

    const onFocus = () => {
      handleCustomerReturn();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
    };
  }, [handleCustomerReturn]);

  // 6. Timer interval: re-calculate timer state every second
  useEffect(() => {
    if (!order) return;

    const updateTimer = () => {
      const state = getTimerState(order, Date.now(), serverClockOffsetMs);
      setTimerState(state);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order, serverClockOffsetMs]);

  // 7. Pay Now click handler
  const handlePayNow = async () => {
    if (!order) return;
    setIsLaunching(true);

    const launchKey = `upi_launch_${order.orderId}`;
    sessionStorage.setItem(launchKey, "pending");
    hasTriggeredReturnRef.current = false;

    // Record launch on backend
    try {
      await fetch(`/api/orders/${order.orderId}/launch`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch (err) {
      console.warn("Failed to record launch on server:", err);
    }

    // Build URI and launch
    const uri = buildUpiUri({
      upiId: UPI_ID,
      businessName: BUSINESS_NAME,
      amountPaise: order.amountPaise,
      orderId: order.orderId,
      transactionNote: `Order ${order.orderId}`,
    });

    launchUpiApp(uri);

    setTimeout(() => {
      setIsLaunching(false);
    }, 2000);
  };

  // 8. Manual Status Check handler (fallback for QR scan on desktop / secondary device)
  const handleManualCheckStatus = async () => {
    if (!order) return;
    // Mark as return to start verification countdown if not yet started
    try {
      const res = await fetch(`/api/orders/${order.orderId}/return`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setOrder(data.order);
        }
      }
    } catch (err) {
      console.error("Manual check status failed:", err);
    }
  };

  // 9. Customer submits optional UTR
  const handleSubmitUtr = async (utr: string): Promise<boolean> => {
    if (!order) return false;
    try {
      const res = await fetch(`/api/orders/${order.orderId}/utr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ utr }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.order) setOrder(data.order);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to submit UTR:", err);
      return false;
    }
  };

  // Render Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Securing checkout session...</p>
      </div>
    );
  }

  // Render Error
  if (error || !order) {
    return (
      <div className="w-full max-w-md bg-white border border-red-200 rounded-3xl p-6 text-center space-y-4 shadow-sm">
        <h2 className="text-lg font-bold text-red-600">Checkout Error</h2>
        <p className="text-sm text-slate-600">{error || "Unable to display this order."}</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
        >
          Return to Store
        </button>
      </div>
    );
  }

  // Render Success (APPROVED)
  if (order.status === "APPROVED") {
    return <SuccessView order={order} businessName={BUSINESS_NAME} />;
  }

  // Render Rejected (REJECTED)
  if (order.status === "REJECTED") {
    return (
      <RejectedView
        order={order}
        businessName={BUSINESS_NAME}
        onRetry={() => router.push("/")}
      />
    );
  }

  // Render Verification in progress (VERIFICATION_PENDING or timers active)
  if (order.status === "VERIFICATION_PENDING" || order.verificationStartedAt) {
    return (
      <VerificationView
        order={order}
        timerState={
          timerState || getTimerState(order, Date.now(), serverClockOffsetMs)
        }
        businessName={BUSINESS_NAME}
        onRefreshStatus={fetchOrderData}
        onSubmitUtr={handleSubmitUtr}
      />
    );
  }

  // Render Initial Checkout View (AWAITING_PAYMENT or PAYMENT_LAUNCHED before return)
  const upiUri = buildUpiUri({
    upiId: UPI_ID,
    businessName: BUSINESS_NAME,
    amountPaise: order.amountPaise,
    orderId: order.orderId,
    transactionNote: `Order ${order.orderId}`,
  });

  return (
    <CheckoutView
      order={order}
      upiUri={upiUri}
      upiId={UPI_ID}
      businessName={BUSINESS_NAME}
      isLaunching={isLaunching}
      onPayNow={handlePayNow}
      onManualCheckStatus={handleManualCheckStatus}
    />
  );
}
