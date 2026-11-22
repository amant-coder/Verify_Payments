import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UPI Fast Checkout",
  description: "Secure, minimal UPI checkout with real-time merchant verification",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased flex flex-col justify-between">
        <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6">
          {children}
        </main>
        <footer className="py-4 text-center text-xs text-slate-400">
          Secure UPI Merchant Verification System • Fast & Transparent
        </footer>
      </body>
    </html>
  );
}
