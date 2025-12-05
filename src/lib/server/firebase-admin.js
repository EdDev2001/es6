// src/lib/server/firebase-admin.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

// Use dynamic import to avoid build errors when env vars are missing
let FIREBASE_SERVICE_ACCOUNT = '';
let PUBLIC_FIREBASE_DATABASE_URL = '';

try {
    const privateEnv = await import('$env/static/private');
    FIREBASE_SERVICE_ACCOUNT = privateEnv.FIREBASE_SERVICE_ACCOUNT || '';
} catch (e) {
    console.warn('FIREBASE_SERVICE_ACCOUNT not available');
}

try {
    const publicEnv = await import('$env/static/public');
    PUBLIC_FIREBASE_DATABASE_URL = publicEnv.PUBLIC_FIREBASE_DATABASE_URL || '';
} catch (e) {
    console.warn('PUBLIC_FIREBASE_DATABASE_URL not available');
}

let adminAuth = null;
let adminDb = null;

if (!getApps().length && FIREBASE_SERVICE_ACCOUNT) {
    try {
        let jsonString = FIREBASE_SERVICE_ACCOUNT.trim();
        if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
            jsonString = jsonString.slice(1, -1);
        }

        const serviceAccount = JSON.parse(jsonString);

        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        initializeApp({ 
            credential: cert(serviceAccount),
            databaseURL: PUBLIC_FIREBASE_DATABASE_URL
        });
        console.log("Firebase Admin initialized successfully");

        adminAuth = getAuth();
        adminDb = getDatabase();
    } catch (err) {
        console.error("Failed to initialize Firebase Admin:", err.message);
    }
} else if (getApps().length) {
    adminAuth = getAuth();
    adminDb = getDatabase();
} else {
    console.warn("⚠️ Running without Firebase Admin - FIREBASE_SERVICE_ACCOUNT not set");
    console.warn("⚠️ Server-side authentication will be disabled");
}


export { adminAuth, adminDb };

/**
 * @param {string} uid 
 */
export async function getAdminUserProfile(uid) {
    try {
        const snapshot = await adminDb.ref(`users/${uid}`).once('value');
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
}

/**
 * @param {string} uid 
 * @param {object} profileData
 */
export async function saveAdminUserProfile(uid, profileData) {
    try {
        await adminDb.ref(`users/${uid}`).set({
            ...profileData,
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Error saving user profile:', error);
        throw error;
    }
}

/**
 * @param {string} uid 
 * @param {object} updates 
 */
export async function updateAdminUserProfile(uid, updates) {
    try {
        await adminDb.ref(`users/${uid}`).update({
            ...updates,
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
}

/**
 * @param {string} uid
 */
export async function deleteAdminUserProfile(uid) {
    try {
        await adminDb.ref(`users/${uid}`).remove();
        return true;
    } catch (error) {
        console.error('Error deleting user profile:', error);
        throw error;
    }
}

/**
 * @param {string} path
 */
export async function getAdminData(path) {
    try {
        const snapshot = await adminDb.ref(path).once('value');
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error(`Error fetching data from ${path}:`, error);
        throw error;
    }
}

/**
 * @param {string} path 
 * @param {any} data 
 */
export async function setAdminData(path, data) {
    try {
        await adminDb.ref(path).set(data);
        return true;
    } catch (error) {
        console.error(`Error setting data at ${path}:`, error);
        throw error;
    }
}

/**
 * @param {string} path 
 * @param {object} updates 
 */
export async function updateAdminData(path, updates) {
    try {
        await adminDb.ref(path).update(updates);
        return true;
    } catch (error) {
        console.error(`Error updating data at ${path}:`, error);
        throw error;
    }
}

/**
 * 
 * @param {string} path 
 */
export async function deleteAdminData(path) {
    try {
        await adminDb.ref(path).remove();
        return true;
    } catch (error) {
        console.error(`Error deleting data at ${path}:`, error);
        throw error;
    }
}

/**
 * @param {string} path 
 * @param {object} options 
 */
export async function queryAdminData(path, options = {}) {
    try {
        let query = adminDb.ref(path);

        if (options.orderByChild) {
            query = query.orderByChild(options.orderByChild);
        } else if (options.orderByKey) {
            query = query.orderByKey();
        } else if (options.orderByValue) {
            query = query.orderByValue();
        }

        if (options.equalTo !== undefined) {
            query = query.equalTo(options.equalTo);
        }

        if (options.startAt !== undefined) {
            query = query.startAt(options.startAt);
        }

        if (options.endAt !== undefined) {
            query = query.endAt(options.endAt);
        }

        if (options.limitToFirst) {
            query = query.limitToFirst(options.limitToFirst);
        }

        if (options.limitToLast) {
            query = query.limitToLast(options.limitToLast);
        }

        const snapshot = await query.once('value');
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error(`Error querying data at ${path}:`, error);
        throw error;
    }
}