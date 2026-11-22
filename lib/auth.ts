import crypto from "crypto";

/**
 * Validates the admin secret key for dashboard and decision endpoints.
 * Uses constant-time comparison to prevent timing side-channel attacks.
 * Fails closed in production if unset or set to the default placeholder.
 */
export function isValidAdminSecret(providedSecret: string | null | undefined): boolean {
  if (!providedSecret) return false;
  const secret = process.env.ADMIN_SECRET_KEY;

  if (process.env.NODE_ENV === "production") {
    if (!secret || secret === "admin123") return false;
    try {
      const a = Buffer.from(providedSecret, "utf8");
      const b = Buffer.from(secret, "utf8");
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  // Development / test fallback
  const expected = secret || "admin123";
  try {
    const a = Buffer.from(providedSecret, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
