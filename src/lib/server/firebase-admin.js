// src/lib/server/firebase-admin.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FIREBASE_SERVICE_ACCOUNT } from '$env/static/private';

let adminAuth;

if (!getApps().length) {
    if (!FIREBASE_SERVICE_ACCOUNT) {
        throw new Error("❌ FIREBASE_SERVICE_ACCOUNT environment variable is not set");
    }

    try {
        // Remove outer quotes if present
        let jsonString = FIREBASE_SERVICE_ACCOUNT.trim();
        if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
            jsonString = jsonString.slice(1, -1);
        }

        // Parse JSON
        const serviceAccount = JSON.parse(jsonString);

        // Fix escaped newlines in private_key
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        // Initialize Firebase Admin
        initializeApp({ credential: cert(serviceAccount) });
        console.log("🔥 Firebase Admin initialized successfully");

        adminAuth = getAuth();
    } catch (err) {
        console.error("❌ Failed to initialize Firebase Admin:", err.message);
        throw err;
    }
} else {
    adminAuth = getAuth();
}

export { adminAuth };
