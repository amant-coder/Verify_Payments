import { describe, it, expect } from "vitest";
import { buildUpiUri, paiseToRupees, formatINR, detectDevice } from "../lib/upi";

describe("UPI URI and Formatting", () => {
  it("converts integer paise to standard rupee string", () => {
    expect(paiseToRupees(100)).toBe("1.00");
    expect(paiseToRupees(49900)).toBe("499.00");
    expect(paiseToRupees(99950)).toBe("999.50");
    expect(paiseToRupees(0)).toBe("0.00");
  });

  it("throws on invalid paise input", () => {
    expect(() => paiseToRupees(-100)).toThrow();
    expect(() => paiseToRupees(100.5)).toThrow();
  });

  it("formats user-facing INR string with symbol", () => {
    expect(formatINR(49900)).toBe("₹499.00");
    expect(formatINR(123456)).toBe("₹1234.56");
  });

  it("constructs compliant, properly encoded UPI URI", () => {
    const uri = buildUpiUri({
      upiId: "merchant@okhdfcbank",
      businessName: "Acme Store India",
      amountPaise: 49900,
      orderId: "ORD-TEST-1001",
      transactionNote: "Order ORD-TEST-1001",
    });

    expect(uri.startsWith("upi://pay?")).toBe(true);
    expect(uri).toContain("pn=Acme%20Store%20India");
    expect(uri).not.toContain("+");
    const parsed = new URL(uri);
    expect(parsed.searchParams.get("pa")).toBe("merchant@okhdfcbank");
    expect(parsed.searchParams.get("pn")).toBe("Acme Store India");
    expect(parsed.searchParams.get("am")).toBe("499.00");
    expect(parsed.searchParams.get("cu")).toBe("INR");
    expect(parsed.searchParams.get("tr")).toBe("ORD-TEST-1001");
  });

  it("detects user device category", () => {
    const androidUa = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36";
    expect(detectDevice(androidUa)).toBe("android");

    const iosUa = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
    expect(detectDevice(iosUa)).toBe("ios");

    const desktopUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    expect(detectDevice(desktopUa)).toBe("desktop");
  });
});
