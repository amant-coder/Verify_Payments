# Minimal UPI Checkout with Automatic Return Detection, Dual Countdown Timers, and Telegram Payment Approval

A production-oriented, minimal-code UPI payment verification system built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Firebase Firestore / Auth**, and the **Telegram Bot API**.

---

## ⚡ The Core Workflow

```
Customer Opens Checkout
       │
       ▼
Order-Specific UPI QR & Amount Displayed
       │
       ▼
Customer clicks "Pay Now" (Mobile Deep Link)
       │
       ▼
UPI App Opens (GPay, PhonePe, Paytm, BHIM, CRED)
       │
       ▼
Customer returns to Checkout Browser Tab
       │
       ▼
[Automatic Return Detection] (visibilitychange / pageshow)
       │
       ├─► 1. Atomically sets verification timestamps
       ├─► 2. Changes order status to VERIFICATION_PENDING
       ├─► 3. Starts Stage 1 Countdown (02:00 -> 00:00)
       └─► 4. Sends Verification Request to Merchant Telegram
              │
              ├── Merchant checks receiving bank account
              │
              ├── [APPROVE] tapped ──► Customer sees Success Page immediately
              │
              ├── [REJECT] tapped ──► Customer sees Declined Page
              │
              └── No decision in 2m ──► Automatically transitions to Stage 2 (05:00)
                                          │
                                          └── If 5m expires ──► Awaiting manual review
                                                                (Payment NOT marked failed)
```

> **Important:** There is **NO "I've Paid" button**. The merchant alone verifies incoming bank credit before approving.

---

## 🎯 Key Features

1. **Mobile-First UPI Launching**:
   - Clean `upi://pay` URI conforming to NPCI standards.
   - Deep links for Android & iOS with desktop QR code fallback.
2. **Authoritative Dual Countdown Timers**:
   - **Stage 1 (Initial Verification)**: `02:00 → 00:00` (*"Verifying Your Payment"*).
   - **Stage 2 (Extended Verification)**: `05:00 → 00:00` (*"Verification Is Taking Longer Than Expected"*).
   - **Overdue Grace State**: After 7 minutes, stays in manual pending state without falsely declaring failure.
   - Timers derive strictly from server timestamps (`initialDeadlineAt`, `extendedDeadlineAt`) with client-server clock offset adjustment. Timers **never reset on refresh or reconnect**.
3. **Automatic Return Detection**:
   - Listens to `visibilitychange`, `pageshow`, and `focus`.
   - Idempotent: repeated focus or navigation events never duplicate notifications or restart timers.
4. **Instant Merchant Decisioning via Telegram**:
   - Secure private Telegram bot with inline `[APPROVE]` and `[REJECT]` buttons.
   - Strict admin allowlisting (`TELEGRAM_ALLOWED_ADMIN_IDS`) and secret webhook authentication.
   - Atomic state transitions prevent double-decisions and race conditions.
5. **Real-time Customer Updates**:
   - Firestore `onSnapshot` updates customer checkout page the exact millisecond the merchant approves or rejects.
   - Fallback SSE stream for local zero-config development.
6. **Deny-by-Default Firestore Security**:
   - Only the authenticated customer UID can read their order document.
   - Direct client writes to `orders` collection are strictly denied (`allow write: if false`). All state mutations are handled via verified Next.js route handlers.
7. **Paise Integer Safety**:
   - All amounts are handled strictly in integer paise (`₹999.00 = 99900 paise`) to prevent floating-point rounding errors.

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd minimal-upi-checkout
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and add your Firebase and Telegram credentials:

```bash
cp .env.example .env.local
```

### 3. Verify Firebase Connection

Check your client auth and server-side Firestore connection in one command:

```bash
npm run verify:firebase
```

### 4. Apply Firestore Security Rules

Copy the rules from `firestore.rules` into **Firebase Console > Firestore Database > Rules** and click **Publish**. This protects customer order data from unauthorized reads and blocks direct client writes.

### 5. Run Automated Tests

```bash
npm run test
```

### 6. Start Local Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000):
- Create a test order on the storefront.
- Experience the checkout at `/checkout/[orderId]`.
- Open the Admin Dashboard at `/admin` to approve or reject.

---

## 🤖 Telegram Bot Configuration

1. **Create Bot**:
   - Open Telegram and search for `@BotFather`.
   - Send `/newbot`, name your bot, and save your `TELEGRAM_BOT_TOKEN`.

2. **Get Your Telegram User ID**:
   - Message `@userinfobot` on Telegram to get your numeric user ID.
   - Set this as `TELEGRAM_ALLOWED_ADMIN_IDS` and `TELEGRAM_CHAT_ID`.

3. **Set Webhook**:
   When deployed (or using ngrok/localtunnel for local dev):
   ```bash
   curl -F "url=https://your-domain.vercel.app/api/telegram/webhook" \
        -F "secret_token=YOUR_WEBHOOK_SECRET" \
        https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
   ```

---

## 🚀 Production Deployment Checklist

1. **Set Merchant UPI ID**: In `.env.local` (and your host's environment settings), set `NEXT_PUBLIC_MERCHANT_UPI_ID` to your receiving UPI VPA.
2. **Secure Admin Secret**: Change `ADMIN_SECRET_KEY` to a private password.
3. **Add Env Vars to Hosting Provider**: When deploying to Vercel/Netlify, copy all variables from `.env.local` into the platform dashboard.
4. **Register Telegram Webhook**: Run step 3 above with your deployed domain and webhook secret.

---

## 🔒 Security Best Practices

- **Never bypass merchant check**: The return of a customer from a UPI app is purely a signal of payment intent, **never proof of payment**.
- **No Banking Credentials**: The application never asks for UPI PINs, passwords, or OTPs.
- **Atomic Transactions**: All decisions and return events use atomic Firestore transactions to prevent duplicate processing.
