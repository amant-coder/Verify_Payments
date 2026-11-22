import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { PaymentOrder } from "@/types/order";
import { formatINR } from "@/lib/upi";
import { Copy, Check, Smartphone, QrCode, Shield, RefreshCw } from "lucide-react";

interface CheckoutViewProps {
  order: PaymentOrder;
  upiUri: string;
  upiId: string;
  businessName: string;
  isLaunching: boolean;
  onPayNow: () => void;
  onManualCheckStatus: () => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  order,
  upiUri,
  upiId,
  businessName,
  isLaunching,
  onPayNow,
  onManualCheckStatus,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    QRCode.toDataURL(upiUri, {
      width: 280,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error("QR generation error:", err));
  }, [upiUri]);

  const copyUpiId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const formattedAmount = formatINR(order.amountPaise);

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl space-y-4 sm:space-y-6 mx-auto">
      {/* Merchant Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
        <div>
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            Paying Merchant
          </span>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {businessName}
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 font-mono">Order: {order.orderId}</p>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-lg sm:text-xl border border-blue-100 shrink-0">
          ₹
        </div>
      </div>

      {/* Amount Display */}
      <div className="text-center bg-slate-50/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-100">
        <span className="text-[11px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">
          Amount Payable
        </span>
        <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-0.5 sm:mt-1">
          {formattedAmount}
        </div>
        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">Inclusive of all taxes</p>
      </div>

      {/* Primary Mobile Action: Pay Now */}
      <div className="space-y-2.5 sm:space-y-3">
        <button
          onClick={onPayNow}
          disabled={isLaunching}
          className="w-full py-3.5 sm:py-4 px-4 sm:px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold rounded-xl sm:rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed min-h-[48px]"
        >
          <Smartphone className="w-5 h-5 shrink-0" />
          <span className="text-sm sm:text-base tracking-wide">
            {isLaunching ? "Opening UPI App..." : "Pay Now with UPI"}
          </span>
        </button>

        <p className="text-center text-[10px] sm:text-[11px] text-slate-400 px-2">
          Supports GPay, PhonePe, Paytm, BHIM, CRED & any UPI App
        </p>
      </div>

      {/* Desktop / Alternate Payment: Dynamic QR Code */}
      <div className="border border-slate-100 rounded-2xl p-3 sm:p-4 bg-slate-50/50 space-y-3 text-center">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 px-1">
          <span className="flex items-center space-x-1.5">
            <QrCode className="w-4 h-4 text-slate-600" />
            <span>Scan UPI QR Code</span>
          </span>
          <span className="text-[11px] text-blue-600 font-medium">Any Banking App</span>
        </div>

        <div className="flex justify-center p-2 sm:p-3 bg-white rounded-xl shadow-sm border border-slate-100 max-w-[240px] sm:max-w-[260px] mx-auto">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="UPI QR Code"
              className="w-44 h-44 sm:w-52 sm:h-52 rounded-lg object-contain mx-auto"
            />
          ) : (
            <div className="w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center text-xs text-slate-400 animate-pulse">
              Generating secure QR...
            </div>
          )}
        </div>

        {/* Copy UPI ID */}
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-2.5 sm:px-3 py-2 text-xs gap-2 min-w-0">
          <div className="min-w-0 flex-1 text-left">
            <span className="text-[10px] text-slate-400 block">UPI ID / VPA</span>
            <span className="font-mono text-slate-700 font-semibold truncate block text-xs sm:text-sm">
              {upiId}
            </span>
          </div>
          <button
            onClick={copyUpiId}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium transition text-xs shrink-0 min-h-[36px]"
            aria-label="Copy UPI ID"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Prominent Action for QR Scanners: I Have Paid */}
      <div className="pt-0.5 sm:pt-1 text-center space-y-2">
        <button
          onClick={onManualCheckStatus}
          className="w-full py-3 sm:py-3.5 px-3 sm:px-4 bg-emerald-50 hover:bg-emerald-100 active:scale-[0.99] border-2 border-emerald-500/40 text-emerald-800 font-bold rounded-xl sm:rounded-2xl flex items-center justify-center space-x-2 transition shadow-sm min-h-[48px]"
        >
          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
          <span className="text-xs sm:text-sm tracking-wide">I Have Paid via QR (Verify Payment)</span>
        </button>
        <p className="text-[10px] sm:text-[11px] text-slate-400 px-2">
          Tap this after completing payment in your UPI app to start verification
        </p>
      </div>

      {/* Security Disclaimer */}
      <div className="bg-slate-50 rounded-xl p-3 flex items-start space-x-2 text-[10px] sm:text-[11px] text-slate-500">
        <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="leading-tight">
          Never share your UPI PIN or OTP with anyone. Your order will be confirmed once
          the merchant validates incoming bank credit.
        </p>
      </div>
    </div>
  );
};
