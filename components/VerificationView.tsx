import React, { useState } from "react";
import { PaymentOrder, TimerState } from "@/types/order";
import { CountdownTimer } from "./CountdownTimer";
import { formatINR } from "@/lib/upi";
import { Send, Check, Shield, HelpCircle } from "lucide-react";

interface VerificationViewProps {
  order: PaymentOrder;
  timerState: TimerState;
  businessName: string;
  onRefreshStatus: () => void;
  onSubmitUtr: (utr: string) => Promise<boolean>;
}

export const VerificationView: React.FC<VerificationViewProps> = ({
  order,
  timerState,
  businessName,
  onRefreshStatus,
  onSubmitUtr,
}) => {
  const [utrInput, setUtrInput] = useState<string>(order.utr || "");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedUtr, setSubmittedUtr] = useState<string | null>(order.utr || null);
  const [utrError, setUtrError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = utrInput.trim().replace(/[^a-zA-Z0-9]/g, "");
    if (clean.length < 6) {
      setUtrError("Please enter at least 6 alphanumeric characters for the reference.");
      return;
    }
    setUtrError(null);
    setIsSubmitting(true);
    const success = await onSubmitUtr(clean);
    setIsSubmitting(false);
    if (success) {
      setSubmittedUtr(clean);
    }
  };

  return (
    <div className="w-full max-w-md space-y-3 sm:space-y-4 mx-auto">
      {/* Top summary card */}
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400">Merchant</span>
          <p className="text-xs sm:text-sm font-semibold text-slate-800">{businessName}</p>
          <p className="text-[10px] sm:text-[11px] font-mono text-slate-500">Order: {order.orderId}</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400">Payable</span>
          <p className="text-sm sm:text-base font-extrabold text-slate-900">
            {formatINR(order.amountPaise)}
          </p>
        </div>
      </div>

      {/* Authoritative Dual Countdown Timer */}
      <CountdownTimer timerState={timerState} onRefreshStatus={onRefreshStatus} />

      {/* Optional UTR / Reference Input */}
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Have a UPI Reference / UTR Number?</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">Optional</span>
        </div>
        <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight">
          Submitting your 12-digit bank UTR reference helps the merchant locate your credit faster.
          It does not interrupt the countdown.
        </p>

        {submittedUtr ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-emerald-800">
            <div>
              <span className="text-[10px] text-emerald-600 block">Submitted Reference:</span>
              <span className="font-mono font-bold tracking-wide">{submittedUtr}</span>
            </div>
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2 pt-1">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value)}
                placeholder="e.g. 423456789012"
                maxLength={24}
                className="w-full sm:flex-1 px-3 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider min-h-[42px]"
              />
              <button
                type="submit"
                disabled={isSubmitting || !utrInput.trim()}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 disabled:opacity-50 transition min-h-[42px] shrink-0"
              >
                <span>{isSubmitting ? "Saving..." : "Submit"}</span>
                <Send className="w-3 h-3" />
              </button>
            </div>
            {utrError && <p className="text-[11px] text-red-500">{utrError}</p>}
          </form>
        )}
      </div>

      {/* Safety Reassurance */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl p-3 flex items-center space-x-2 text-[10px] sm:text-[11px] text-slate-500">
        <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Your browser state is preserved. This page will update automatically.</span>
      </div>
    </div>
  );
};
