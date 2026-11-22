import { describe, it, expect } from "vitest";
import { isTelegramAdmin } from "../lib/telegram";

describe("Telegram Security & Allowlist", () => {
  it("denies access when user ID is not on the admin allowlist", () => {
    // With dummy ID
    expect(isTelegramAdmin("99999999")).toBe(false);
    expect(isTelegramAdmin(12345678)).toBe(false);
  });

  it("rejects empty or falsy user ID", () => {
    // @ts-expect-error test invalid values
    expect(isTelegramAdmin(null)).toBe(false);
    // @ts-expect-error test invalid values
    expect(isTelegramAdmin(undefined)).toBe(false);
    expect(isTelegramAdmin("")).toBe(false);
  });
});
