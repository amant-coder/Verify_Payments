"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, ArrowRight, ShieldCheck, Zap, Bot, Smartphone } from "lucide-react";
import { formatINR } from "@/lib/upi";

export default function DemoStorefrontPage() {
  const router = useRouter();
  const [amountInput, setAmountInput] = useState<string>("499");
  const [customerName, setCustomerName] = useState<string>("Rahul Sharma");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const presetAmounts = [1, 199, 499, 999, 1499];

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountFloat = parseFloat(amountInput);
    if (isNaN(amountFloat) || amountFloat < 1) {
      setError("Please enter a valid amount (minimum ₹1.00)");
      return;
    }

    const amountPaise = Math.round(amountFloat * 100);

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPaise,
          customerName: customerName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to initialize order.");
        setLoading(false);
        return;
      }

      router.push(`/checkout/${data.order.orderId}`);
    } catch (err) {
      console.error(err);
      setError("Network error while creating test order.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Banner Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                UPI Minimal Checkout
              </h1>
              <p className="text-xs text-slate-500">
                Automatic Return Detection & Telegram Approval
              </p>
            </div>
          </div>

          <a
            href="/admin"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition"
          >
            Admin Portal
          </a>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <div className="space-y-1">
            <Smartphone className="w-4 h-4 mx-auto text-blue-600" />
            <span className="font-semibold block">Mobile Deep-Link</span>
            <span className="text-[10px] text-slate-400">One-tap app launch</span>
          </div>
          <div className="space-y-1 border-x border-slate-200">
            <Zap className="w-4 h-4 mx-auto text-purple-600" />
            <span className="font-semibold block">Auto Return</span>
            <span className="text-[10px] text-slate-400">2m + 5m timers</span>
          </div>
          <div className="space-y-1">
            <Bot className="w-4 h-4 mx-auto text-emerald-600" />
            <span className="font-semibold block">Telegram Bot</span>
            <span className="text-[10px] text-slate-400">Instant approval</span>
          </div>
        </div>

        {/* Create Order Form */}
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payable Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="499"
                className="w-full pl-8 pr-3.5 py-2.5 text-base font-bold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Presets */}
            <div className="flex items-center space-x-1.5 mt-2">
              <span className="text-[10px] text-slate-400 font-medium">Quick:</span>
              {presetAmounts.map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setAmountInput(String(amt))}
                  className="px-2 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition"
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-70"
          >
            <span>{loading ? "Creating Order..." : "Proceed to UPI Checkout"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Zero third-party gateway fee • 100% Direct P2M verification</span>
        </div>
      </div>
    </div>
  );
}
