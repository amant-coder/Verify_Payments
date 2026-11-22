import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isValidAdminSecret } from "../lib/auth";

describe("Admin Secret Authentication", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("allows configured secret in development", () => {
    process.env.NODE_ENV = "development";
    process.env.ADMIN_SECRET_KEY = "my-custom-key";
    expect(isValidAdminSecret("my-custom-key")).toBe(true);
    expect(isValidAdminSecret("wrong-key")).toBe(false);
  });

  it("falls back to admin123 in development if unset", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ADMIN_SECRET_KEY;
    expect(isValidAdminSecret("admin123")).toBe(true);
    expect(isValidAdminSecret("other")).toBe(false);
  });

  it("fails closed in production if secret is unset", () => {
    process.env.NODE_ENV = "production";
    delete process.env.ADMIN_SECRET_KEY;
    expect(isValidAdminSecret("admin123")).toBe(false);
    expect(isValidAdminSecret("")).toBe(false);
  });

  it("fails closed in production if secret is set to default admin123", () => {
    process.env.NODE_ENV = "production";
    process.env.ADMIN_SECRET_KEY = "admin123";
    expect(isValidAdminSecret("admin123")).toBe(false);
  });

  it("authenticates valid strong secret in production", () => {
    process.env.NODE_ENV = "production";
    process.env.ADMIN_SECRET_KEY = "super-secret-production-key";
    expect(isValidAdminSecret("super-secret-production-key")).toBe(true);
    expect(isValidAdminSecret("admin123")).toBe(false);
    expect(isValidAdminSecret(null)).toBe(false);
  });
});
