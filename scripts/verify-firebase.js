const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const admin = require("firebase-admin");
const { initializeApp } = require("firebase/app");
const { getAuth, signInAnonymously } = require("firebase/auth");

async function verify() {
  console.log("==================================================");
  console.log("   FIREBASE CONNECTION VERIFICATION REPORT");
  console.log("==================================================\n");

  let serverOk = false;
  let clientOk = false;

  // 1. Verify Server-Side (Admin SDK -> Firestore)
  console.log("1. Checking Firebase Admin SDK (Server-Side)...");
  console.log(`   Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`   Client Email: ${process.env.FIREBASE_CLIENT_EMAIL}`);

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        }),
      });
    }

    const db = admin.firestore();
    const testDoc = db.collection("_healthcheck").doc("ping");
    await testDoc.set({ ping: true, checkedAt: new Date().toISOString() });
    await testDoc.get();
    await testDoc.delete();

    console.log("   [SUCCESS] Admin SDK connected & Firestore Read/Write passed!\n");
    serverOk = true;
  } catch (err) {
    console.error("   [FAILED] Server-side connection failed:");
    console.error(`   ${err.message}\n`);
    if (err.message.includes("Cloud Firestore API has not been used") || err.message.includes("NOT_FOUND")) {
      console.log("   -> FIX: Create your database in Firebase Console: Build > Firestore Database > Create database\n");
    }
  }

  // 2. Verify Client-Side (Client SDK -> Anonymous Auth)
  console.log("2. Checking Firebase Client SDK (Web Client)...");
  console.log(`   Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  console.log(`   Auth Domain: ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}`);

  try {
    const app = initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });

    const auth = getAuth(app);
    const userCredential = await signInAnonymously(auth);
    console.log(`   [SUCCESS] Client Auth passed! Anonymous Session UID: ${userCredential.user.uid}\n`);
    clientOk = true;
  } catch (err) {
    console.error("   [FAILED] Client-side Auth failed:");
    console.error(`   Code: ${err.code} | Message: ${err.message}\n`);
    if (err.code === "auth/configuration-not-found" || err.code === "auth/admin-restricted-operation") {
      console.log("   -> FIX: In Firebase Console: Build > Authentication > Sign-in method > Enable 'Anonymous'\n");
    }
  }

  console.log("==================================================");
  if (serverOk && clientOk) {
    console.log(" RESULT: ALL FIREBASE CONNECTIONS ARE HEALTHY & READY!");
  } else {
    console.log(" RESULT: ACTION REQUIRED IN FIREBASE CONSOLE (SEE ABOVE)");
  }
  console.log("==================================================");
}

verify().catch((e) => console.error(e));
