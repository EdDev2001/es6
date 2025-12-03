// src/lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import {
  getDatabase,
  ref as dbRef,
  push as dbPush,
  set as dbSet,
  get as dbGet,
  query as dbQuery,
  orderByChild as dbOrderByChild,
  equalTo as dbEqualTo,
  update as dbUpdate,
  limitToLast as dbLimitToLast
} from 'firebase/database';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.PUBLIC_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase only once
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Realtime Database
export const db = getDatabase(app);

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Login / Logout helpers
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Auth state listener
export const subscribeToAuth = (callback) => onAuthStateChanged(auth, callback);

// Database helpers
export {
  dbRef as ref,
  dbPush as push,
  dbSet as set,
  dbGet as get,
  dbQuery as query,
  dbOrderByChild as orderByChild,
  dbEqualTo as equalTo,
  dbUpdate as update,
  dbLimitToLast as limitToLast
};

// User profile path
export const USER_PROFILE_PATH = 'users';

/**
 * Get a user's profile
 * @param {string} uid - Firebase User ID
 */
export async function getUserProfile(uid) {
  const profileRef = dbRef(db, `${USER_PROFILE_PATH}/${uid}`);
  const snapshot = await dbGet(profileRef);
  return snapshot.exists() ? snapshot.val() : null;
}

/**
 * Save or update a user's profile
 * @param {string} uid - Firebase User ID
 * @param {object} profileData - Data to save
 */
export async function saveUserProfile(uid, profileData) {
  const profileRef = dbRef(db, `${USER_PROFILE_PATH}/${uid}`);
  await dbSet(profileRef, {
    ...profileData,
    updatedAt: new Date().toISOString()
  });
  return true;
}
