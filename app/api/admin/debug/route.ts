import { NextResponse } from "next/server";
import { getDbStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbStatus = getDbStatus();

  return NextResponse.json({
    firestoreConnected: dbStatus.isFirestore,
    dbStatus,
    envCheck: {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "(NOT SET)",
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "(NOT SET)",
      FIREBASE_PRIVATE_KEY_SET: Boolean(process.env.FIREBASE_PRIVATE_KEY),
      FIREBASE_PRIVATE_KEY_LENGTH: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
      TELEGRAM_BOT_TOKEN_SET: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "(NOT SET)",
      TELEGRAM_ALLOWED_ADMIN_IDS: process.env.TELEGRAM_ALLOWED_ADMIN_IDS || "(NOT SET)",
      ADMIN_SECRET_KEY_SET: Boolean(process.env.ADMIN_SECRET_KEY),
    },
  });
}
