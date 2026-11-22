import React, { useState } from "react";
import { PaymentOrder } from "@/types/order";
import { formatINR } from "@/lib/upi";
import {
  AlertCircle,
  ArrowLeft,
  Headphones,
  Copy,
  Check,
  RotateCcw,
  ShieldAlert,
  Info,
  Calendar,
  Hash,
  CreditCard,
  ExternalLink,
} from "lucide-react";

interface RejectedViewProps {
  order: PaymentOrder;
  businessName?: string;
  onRetry?: () => void;
}

export const RejectedView: React.FC<RejectedViewProps> = ({
  order,
  businessName = "Merchant",
  onRetry,
}) => {
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [copiedUtr, setCopiedUtr] = useState<boolean>(false);
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false);

  const formattedAmount = formatINR(order.amountPaise);
  const rejectedDateObj = order.rejectedAt ? new Date(order.rejectedAt) : new Date();

  const formattedDate = rejectedDateObj.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const formattedTime = rejectedDateObj.toLocaleTimeString("en-IN", {
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

  const supportSubject = encodeURIComponent(
    `Verification Inquiry: Order ${order.orderId} (${formattedAmount})`
  );
  const supportBody = encodeURIComponent(
    `Hello Merchant Support,\n\nI am inquiring about the verification status of my transaction.\n\nOrder ID: ${order.orderId}\nAmount: ${formattedAmount}\nDate: ${formattedDate} ${formattedTime}\nUTR: ${order.utr || "Not available"}\n\nPlease help me check the bank credit record.\n\nThank you.`
  );
  const supportMailto = `mailto:support@example.com?subject=${supportSubject}&body=${supportBody}`;

  return (
    <div className="relative w-full max-w-md mx-auto px-1 sm:px-0 py-2 sm:py-4">
      {/* Main Glassmorphic Container with Subtle Shake Animation */}
      <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-rose-950/5 dark:shadow-black/50 space-y-5 animate-in fade-in zoom-in-95 duration-400">
        {/* Ambient Top Glow (Subtle Crimson) */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-500/15 dark:bg-rose-500/10 blur-3xl rounded-full pointer-events-none" />

        {/* Status Badge & Heading with Soft Shake */}
        <div className="text-center space-y-3 pt-1">
          {/* Elegant Red Error Icon with Shake Animation */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center animate-shake-soft">
            <div className="absolute inset-0 bg-rose-500/20 dark:bg-rose-500/10 rounded-full animate-ping opacity-25" />
            <div className="absolute inset-1 bg-gradient-to-tr from-rose-600 to-red-500 rounded-full shadow-lg shadow-rose-500/30 flex items-center justify-center animate-spring-pop">
              <AlertCircle className="w-10 h-10 text-white stroke-[2.5]" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Payment Could Not Be Verified
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              The merchant was unable to verify incoming credit for this checkout.
            </p>
          </div>
        </div>

        {/* Honest Explanation Card (Legal & NPCI Clarification) */}
        <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 rounded-2xl p-4 text-xs space-y-2 text-left">
          <div className="flex items-center space-x-1.5 text-rose-800 dark:text-rose-300 font-bold text-xs">
            <Info className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>Understanding this notice</span>
          </div>
          <p className="text-rose-900/80 dark:text-rose-200 leading-relaxed text-[11px] sm:text-xs">
            This notice indicates a <strong>merchant verification decision</strong>, not a confirmed banking failure. We could not match incoming credit in our receiving bank account with Order <span className="font-mono font-bold">{order.orderId}</span>.
          </p>
          <div className="pt-1 border-t border-rose-200/60 dark:border-rose-900/40 text-[10px] sm:text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed space-y-1">
            <p>
              • <strong>If money was debited from your bank:</strong> NPCI mandates your UPI app/bank to automatically reverse and credit the unverified funds to your account within 24–48 banking hours.
            </p>
            <p>
              • <strong>If you completed the transfer:</strong> Please tap &apos;Contact Support&apos; below with your 12-digit bank UTR reference for manual reconciliation.
            </p>
          </div>
        </div>

        {/* Transaction Ledger Card */}
        <div className="relative bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-400">
              Attempted Amount
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              {formattedAmount}
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
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
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title="Copy Order ID"
                >
                  {copiedId ? (
                    <Check className="w-3 h-3 text-rose-500" />
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
                <span>Timestamp</span>
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                {formattedDate}, {formattedTime}
              </span>
            </div>

            {/* UTR if available */}
            {order.utr && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-400 dark:text-slate-400 flex items-center space-x-1.5 text-[11px]">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Submitted UTR</span>
                </span>
                <div className="flex items-center space-x-1">
                  <span className="font-mono font-bold text-rose-700 dark:text-rose-400 text-[11px]">
                    {order.utr}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUtr}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                    title="Copy UTR"
                  >
                    {copiedUtr ? (
                      <Check className="w-3 h-3 text-rose-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Status */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 dark:text-slate-400 text-[11px]">Verification Result</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
                Declined by Merchant
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <a
            href={supportMailto}
            className="w-full py-3 sm:py-3.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.99] text-slate-800 dark:text-white font-bold rounded-2xl flex items-center justify-center space-x-2 transition shadow-sm text-xs sm:text-sm min-h-[44px]"
          >
            <Headphones className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Contact Support</span>
          </a>

          <button
            type="button"
            onClick={onRetry || (() => { if (typeof window !== "undefined") window.location.href = "/"; })}
            className="w-full py-3 sm:py-3.5 px-5 bg-slate-900 hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-500 active:scale-[0.99] text-white font-bold rounded-2xl flex items-center justify-center space-x-2 transition shadow-md shadow-slate-900/10 text-xs sm:text-sm min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Back to Checkout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
