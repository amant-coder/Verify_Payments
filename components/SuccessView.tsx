import React from "react";
import { PaymentOrder } from "@/types/order";
import { formatINR } from "@/lib/upi";
import { CheckCircle2, ArrowRight, ShieldCheck, Calendar, Hash, Store } from "lucide-react";

interface SuccessViewProps {
  order: PaymentOrder;
  businessName: string;
}

export const SuccessView: React.FC<SuccessViewProps> = ({ order, businessName }) => {
  const formattedAmount = formatINR(order.amountPaise);
  const formattedDate = order.approvedAt
    ? new Date(order.approvedAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Success Badge */}
      <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Payment Approved
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your order has been confirmed by the merchant.
        </p>
      </div>

      {/* Amount Card */}
      <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4">
        <span className="text-xs uppercase tracking-wider font-semibold text-emerald-800">
          Amount Verified
        </span>
        <div className="text-3xl font-extrabold text-emerald-900 mt-0.5">
          {formattedAmount}
        </div>
      </div>

      {/* Order Details List */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs space-y-2.5 text-left">
        <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
          <span className="text-slate-500 flex items-center space-x-1.5">
            <Store className="w-3.5 h-3.5" />
            <span>Merchant</span>
          </span>
          <span className="font-semibold text-slate-800">{businessName}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
          <span className="text-slate-500 flex items-center space-x-1.5">
            <Hash className="w-3.5 h-3.5" />
            <span>Order ID</span>
          </span>
          <span className="font-mono font-semibold text-slate-800">{order.orderId}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
          <span className="text-slate-500 flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Approved At</span>
          </span>
          <span className="text-slate-700 font-medium">{formattedDate}</span>
        </div>

        {order.utr && (
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500">UTR / Reference</span>
            <span className="font-mono text-slate-700">{order.utr}</span>
          </div>
        )}

        <div className="flex justify-between items-center py-1">
          <span className="text-slate-500 flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verification Status</span>
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
            Confirmed
          </span>
        </div>
      </div>

      {/* Clarifying Disclaimer */}
      <p className="text-[11px] text-slate-400 leading-relaxed">
        * This document is a merchant-authorized order confirmation based on verified bank credit.
      </p>

      {/* Return to Store Action */}
      <a
        href="/"
        className="w-full py-3.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl flex items-center justify-center space-x-2 transition shadow-md"
      >
        <span>Return to Store</span>
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
};
