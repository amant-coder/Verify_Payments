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
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Merchant Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            Paying Merchant
          </span>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">
            {businessName}
          </h1>
          <p className="text-xs text-slate-500 font-mono">Order: {order.orderId}</p>
        </div>
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-xl border border-blue-100">
          ₹
        </div>
      </div>

      {/* Amount Display */}
      <div className="text-center bg-slate-50/80 rounded-2xl p-5 border border-slate-100">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Amount Payable
        </span>
        <div className="text-4xl font-extrabold text-slate-900 tracking-tight mt-1">
          {formattedAmount}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Inclusive of all taxes</p>
      </div>

      {/* Primary Mobile Action: Pay Now */}
      <div className="space-y-3">
        <button
          onClick={onPayNow}
          disabled={isLaunching}
          className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <Smartphone className="w-5 h-5" />
          <span className="text-base tracking-wide">
            {isLaunching ? "Opening UPI App..." : "Pay Now with UPI"}
          </span>
        </button>

        <p className="text-center text-[11px] text-slate-400">
          Supports GPay, PhonePe, Paytm, BHIM, CRED & any UPI App
        </p>
      </div>

      {/* Desktop / Alternate Payment: Dynamic QR Code */}
      <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3 text-center">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 px-1">
          <span className="flex items-center space-x-1.5">
            <QrCode className="w-4 h-4 text-slate-600" />
            <span>Scan UPI QR Code</span>
          </span>
          <span className="text-[11px] text-blue-600 font-medium">Any Banking App</span>
        </div>

        <div className="flex justify-center p-2 bg-white rounded-xl shadow-sm border border-slate-100">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="UPI QR Code"
              className="w-48 h-48 rounded-lg object-contain"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400 animate-pulse">
              Generating secure QR...
            </div>
          )}
        </div>

        {/* Copy UPI ID */}
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
          <div className="truncate text-left mr-2">
            <span className="text-[10px] text-slate-400 block">UPI ID / VPA</span>
            <span className="font-mono text-slate-700 font-semibold truncate block">
              {upiId}
            </span>
          </div>
          <button
            onClick={copyUpiId}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium transition text-xs shrink-0"
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
      <div className="pt-1 text-center space-y-2">
        <button
          onClick={onManualCheckStatus}
          className="w-full py-3.5 px-4 bg-emerald-50 hover:bg-emerald-100 active:scale-[0.99] border-2 border-emerald-500/40 text-emerald-800 font-bold rounded-2xl flex items-center justify-center space-x-2 transition shadow-sm"
        >
          <Check className="w-5 h-5 text-emerald-600" />
          <span className="text-sm">I Have Paid via QR (Verify Payment)</span>
        </button>
        <p className="text-[11px] text-slate-400">
          Tap this after completing payment in your UPI app to start verification
        </p>
      </div>

      {/* Security Disclaimer */}
      <div className="bg-slate-50 rounded-xl p-3 flex items-start space-x-2 text-[11px] text-slate-500">
        <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p>
          Never share your UPI PIN or OTP with anyone. Your order will be confirmed once
          the merchant validates incoming bank credit.
        </p>
      </div>
    </div>
  );
};
