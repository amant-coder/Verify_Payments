import React, { useState } from "react";
import { PaymentOrder } from "@/types/order";
import { formatINR } from "@/lib/upi";
import {
  CheckCircle2,
  ArrowRight,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  Clock,
  Hash,
  Store,
  User,
  CreditCard,
  Share2,
} from "lucide-react";

interface SuccessViewProps {
  order: PaymentOrder;
  businessName: string;
}

// Particle colors for celebration confetti
const CONFETTI_PARTICLES = [
  { id: 1, left: "10%", delay: "0.1s", color: "bg-emerald-400", size: "w-2 h-2 rounded-full", rotate: "rotate-12" },
  { id: 2, left: "18%", delay: "0.3s", color: "bg-teal-400", size: "w-2.5 h-1.5 rounded-sm", rotate: "rotate-45" },
  { id: 3, left: "28%", delay: "0.2s", color: "bg-amber-400", size: "w-2 h-2 rounded-full", rotate: "rotate-90" },
  { id: 4, left: "40%", delay: "0.4s", color: "bg-blue-400", size: "w-2.5 h-1 rounded-sm", rotate: "rotate-180" },
  { id: 5, left: "55%", delay: "0.15s", color: "bg-emerald-500", size: "w-2 h-2 rounded-full", rotate: "rotate-45" },
  { id: 6, left: "68%", delay: "0.35s", color: "bg-indigo-400", size: "w-3 h-1.5 rounded-sm", rotate: "rotate-12" },
  { id: 7, left: "80%", delay: "0.25s", color: "bg-amber-300", size: "w-2 h-2 rounded-full", rotate: "rotate-90" },
  { id: 8, left: "90%", delay: "0.05s", color: "bg-teal-400", size: "w-2.5 h-2 rounded-sm", rotate: "rotate-45" },
  { id: 9, left: "15%", delay: "0.5s", color: "bg-blue-500", size: "w-2 h-2 rounded-full", rotate: "rotate-12" },
  { id: 10, left: "32%", delay: "0.45s", color: "bg-emerald-400", size: "w-2.5 h-1.5 rounded-sm", rotate: "rotate-45" },
  { id: 11, left: "62%", delay: "0.55s", color: "bg-amber-400", size: "w-2 h-2 rounded-full", rotate: "rotate-90" },
  { id: 12, left: "85%", delay: "0.4s", color: "bg-indigo-400", size: "w-2 h-2 rounded-full", rotate: "rotate-180" },
];

export const SuccessView: React.FC<SuccessViewProps> = ({ order, businessName }) => {
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [copiedUtr, setCopiedUtr] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const formattedAmount = formatINR(order.amountPaise);
  const approvedDateObj = order.approvedAt ? new Date(order.approvedAt) : new Date();

  const formattedDate = approvedDateObj.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const formattedTime = approvedDateObj.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handleCopyOrderId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(order.orderId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCopyUtr = () => {
    if (order.utr && navigator.clipboard) {
      navigator.clipboard.writeText(order.utr);
      setCopiedUtr(true);
      setTimeout(() => setCopiedUtr(false), 2000);
    }
  };

  const handleDownloadReceipt = () => {
    setIsDownloading(true);
    // Use native window.print() styled via @media print in globals.css
    if (typeof window !== "undefined") {
      window.print();
    }
    setTimeout(() => setIsDownloading(false), 1500);
  };

  return (
    <div className="relative w-full max-w-md mx-auto px-1 sm:px-0 py-2 sm:py-4">
      {/* Subtle Confetti Celebration Particles */}
      <div className="absolute inset-x-0 -top-4 h-24 overflow-hidden pointer-events-none z-10 no-print">
        {CONFETTI_PARTICLES.map((p) => (
          <div
            key={p.id}
            className={`absolute top-1/2 ${p.size} ${p.color} ${p.rotate} opacity-90 animate-bounce`}
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: "2s",
            }}
          />
        ))}
      </div>

      {/* Main Glassmorphic Container */}
      <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-emerald-950/5 dark:shadow-black/50 space-y-5 animate-in fade-in zoom-in-95 duration-400">
        {/* Ambient Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/15 dark:bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />

        {/* Status Badge & Heading */}
        <div className="text-center space-y-3 pt-1">
          {/* Animated Green Checkmark with Glow Rings */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 bg-emerald-500/20 dark:bg-emerald-400/20 rounded-full animate-ping opacity-30" />
            <div className="absolute inset-1 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center animate-spring-pop">
              <CheckCircle2 className="w-10 h-10 text-white stroke-[2.5]" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Payment Successful!
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Your order has been verified and confirmed by the merchant.
            </p>
          </div>
        </div>

        {/* Transaction Receipt Card (Fintech Ticket Style) */}
        <div
          id="printable-receipt"
          className="relative bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4"
        >
          {/* Top Amount Banner */}
          <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-700/50">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-400 block">
              Amount Paid
            </span>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-mono mt-0.5">
              {formattedAmount}
            </div>
            <div className="inline-flex items-center space-x-1 mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Merchant Verified & Settled</span>
            </div>
          </div>

          {/* Ticket Perforation Notches */}
          <div className="relative my-1 no-print">
            <div className="border-t border-dashed border-slate-200 dark:border-slate-700/70" />
            <div className="absolute -left-6 -top-2 w-4 h-4 bg-white dark:bg-slate-900 rounded-full border-r border-slate-200 dark:border-slate-700" />
            <div className="absolute -right-6 -top-2 w-4 h-4 bg-white dark:bg-slate-900 rounded-full border-l border-slate-200 dark:border-slate-700" />
          </div>

          {/* Receipt Breakdown List */}
          <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            {/* Merchant */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400 dark:text-slate-400 flex items-center space-x-1.5 text-[11px]">
                <Store className="w-3.5 h-3.5" />
                <span>Merchant</span>
              </span>
              <span className="font-semibold text-slate-900 dark:text-white text-right">
                {businessName}
              </span>
            </div>

            {/* Customer Name */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400 dark:text-slate-400 flex items-center space-x-1.5 text-[11px]">
                <User className="w-3.5 h-3.5" />
                <span>Customer</span>
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {order.customerName || "Rahul Sharma"}
              </span>
            </div>

            {/* Order ID */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400 dark:text-slate-400 flex items-center space-x-1.5 text-[11px]">
                <Hash className="w-3.5 h-3.5" />
                <span>Order ID</span>
              </span>
              <div className="flex items-center space-x-1">
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                  {order.orderId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyOrderId}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition no-print"
                  title="Copy Order ID"
                >
                  {copiedId ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400 dark:text-slate-400 flex items-center space-x-1.5 text-[11px]">
                <Calendar className="w-3.5 h-3.5" />
                <span>Date & Time</span>
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                {formattedDate}, {formattedTime}
              </span>
            </div>

            {/* Bank UTR Reference */}
            {order.utr && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-400 dark:text-slate-400 flex items-center space-x-1.5 text-[11px]">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Bank UTR</span>
                </span>
                <div className="flex items-center space-x-1">
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                    {order.utr}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUtr}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition no-print"
                    title="Copy UTR"
                  >
                    {copiedUtr ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="flex justify-between items-center py-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 dark:text-slate-400 text-[11px]">Payment Mode</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                UPI Instant Settlement
              </span>
            </div>
          </div>
        </div>

        {/* Verification Guarantee Disclaimer */}
        <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed px-2 no-print">
          * This receipt reflects merchant-validated incoming credit. Please retain your Order ID for reference.
        </p>

        {/* Primary Action Buttons */}
        <div className="space-y-2.5 pt-1 no-print">
          <button
            onClick={handleDownloadReceipt}
            disabled={isDownloading}
            className="w-full py-3 sm:py-3.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.99] text-slate-800 dark:text-white font-bold rounded-2xl flex items-center justify-center space-x-2 transition shadow-sm text-xs sm:text-sm min-h-[44px]"
          >
            <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>{isDownloading ? "Preparing Receipt..." : "Download Receipt"}</span>
          </button>

          <a
            href="/"
            className="w-full py-3 sm:py-3.5 px-5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 active:scale-[0.99] text-white font-bold rounded-2xl flex items-center justify-center space-x-2 transition shadow-md shadow-slate-900/10 text-xs sm:text-sm min-h-[44px]"
          >
            <span>Back to Home</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
