/**
 * Validates the admin secret key for dashboard and decision endpoints.
 * Fails closed in production if unset or set to the default placeholder.
 */
export function isValidAdminSecret(providedSecret: string | null | undefined): boolean {
  if (!providedSecret) return false;
  const secret = process.env.ADMIN_SECRET_KEY;

  if (process.env.NODE_ENV === "production") {
    // shortcut: string equality ok for token, upgrade to timingSafeEqual if public attack surface grows
    return Boolean(secret && secret !== "admin123" && providedSecret === secret);
  }

  // Development / test fallback
  return providedSecret === (secret || "admin123");
}
