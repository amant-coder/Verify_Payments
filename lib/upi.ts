export interface UpiParams {
  upiId: string;
  businessName: string;
  amountPaise: number;
  orderId: string;
  transactionNote?: string;
}

/**
 * Safely converts integer paise to standard INR formatted decimal string (e.g. 99900 -> "999.00").
 */
export function paiseToRupees(paise: number): string {
  if (!Number.isInteger(paise) || paise < 0) {
    throw new Error("Amount in paise must be a non-negative integer.");
  }
  return (paise / 100).toFixed(2);
}

/**
 * Formats integer paise into user-facing currency string (e.g. 99900 -> "₹999.00").
 */
export function formatINR(paise: number): string {
  return `₹${paiseToRupees(paise)}`;
}

/**
 * Constructs a fully encoded UPI URI compliant with NPCI specifications.
 * Format: upi://pay?pa={vpa}&pn={name}&am={amount}&cu=INR&tr={orderId}&tn={note}
 */
export function buildUpiUri(params: UpiParams): string {
  const { upiId, businessName, amountPaise, orderId, transactionNote } = params;

  if (!upiId || !businessName || !orderId) {
    throw new Error("Missing required UPI parameters.");
  }

  const amountRupees = paiseToRupees(amountPaise);
  const note = transactionNote || `Payment for Order ${orderId}`;

  const queryParams = new URLSearchParams({
    pa: upiId.trim(),
    pn: businessName.trim(),
    am: amountRupees,
    cu: "INR",
    tr: orderId.trim(),
    tn: note.trim(),
  });

  return `upi://pay?${queryParams.toString().replace(/\+/g, "%20")}`;
}

export type DeviceType = "android" | "ios" | "desktop";

/**
 * Detects device category from user agent.
 */
export function detectDevice(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "desktop";
}

/**
 * Client-side launcher for UPI deep-link.
 * Attempts to launch deep link and returns fallback instruction if unsupported.
 */
export function launchUpiApp(
  upiUri: string,
  onFallback?: () => void
): { launched: boolean; method: string } {
  if (typeof window === "undefined") {
    return { launched: false, method: "server" };
  }

  const device = detectDevice(navigator.userAgent);

  if (device === "desktop") {
    if (onFallback) onFallback();
    return { launched: false, method: "desktop-qr-fallback" };
  }

  // Mobile launch: Use location.href for direct URI protocol handling
  try {
    window.location.href = upiUri;
    return { launched: true, method: device };
  } catch (err) {
    console.error("Failed to launch UPI deep link:", err);
    if (onFallback) onFallback();
    return { launched: false, method: "error-fallback" };
  }
}
