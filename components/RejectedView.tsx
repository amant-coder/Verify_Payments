import React from "react";
import { PaymentOrder } from "@/types/order";
import { formatINR } from "@/lib/upi";
import { XCircle, ArrowLeft } from "lucide-react";

interface RejectedViewProps {
  order: PaymentOrder;
}

export const RejectedView: React.FC<RejectedViewProps> = ({ order }) => {
  const formattedAmount = formatINR(order.amountPaise);

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl text-center space-y-4 sm:space-y-6 mx-auto">
      {/* Rejected Icon */}
      <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center border border-red-100">
        <XCircle className="w-8 h-8 sm:w-10 sm:h-10" />
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Verification Declined
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          The merchant was unable to verify incoming credit for this transaction.
        </p>
      </div>

      <div className="bg-red-50/70 border border-red-100 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-xs text-red-800 space-y-1.5 text-left">
        <p className="font-semibold">What happened?</p>
        <p>
          The payment could not be matched with our receiving bank records for Order{" "}
          <span className="font-mono font-bold">{order.orderId}</span> ({formattedAmount}).
        </p>
        <p className="text-[11px] text-red-700 mt-2">
          • If money was debited from your bank account, your UPI bank will automatically refund it within 24-48 hours.
          <br />• If you completed the transfer, please contact support with your Order ID and UTR reference.
        </p>
      </div>

      {order.utr && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600">
          Submitted Reference / UTR: <span className="font-mono font-semibold">{order.utr}</span>
        </div>
      )}

      <div className="space-y-2 pt-2">
        <a
          href="/"
          className="w-full py-3.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl flex items-center justify-center space-x-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </a>
      </div>
    </div>
  );
};
