// src/lib/server/firebase-admin.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from '$env/dynamic/private';

const FIREBASE_SERVICE_ACCOUNT = env.FIREBASE_SERVICE_ACCOUNT;

let adminAuth;

if (!getApps().length) {
    if (!FIREBASE_SERVICE_ACCOUNT) {
        console.error("❌ FIREBASE_SERVICE_ACCOUNT is undefined.");
        throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set");
    }

    try {
        // Remove outer quotes if they exist
        let jsonString = FIREBASE_SERVICE_ACCOUNT.trim();
        if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
            jsonString = jsonString.slice(1, -1);
        }
        
        // Parse the JSON (with \\n still escaped)
        const serviceAccount = JSON.parse(jsonString);
        
        // NOW convert the \\n in the private_key to actual newlines
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        initializeApp({
            credential: cert(serviceAccount)
        });

        console.log("🔥 Firebase Admin initialized successfully");
        adminAuth = getAuth();
    } catch (e) {
        console.error("❌ Failed to initialize Firebase Admin:");
        console.error("Error message:", e.message);
        throw e;
    }
} else {
    adminAuth = getAuth();
}

export { adminAuth };