// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, ref, push, set, get, query, orderByChild, equalTo, update, limitToLast 
} from 'firebase/database';
import { 
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDv2QU8otJoD5Y34CacDX5YjMuge_lbcts",
  authDomain: "ednelback.firebaseapp.com",
  databaseURL: "https://ednelback-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ednelback",
  storageBucket: "ednelback.firebasestorage.app",
  messagingSenderId: "382560726698",
  appId: "1:382560726698:web:86de9c648f53f87c9eead3",
  measurementId: "G-117848WD92"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Define the path for user profiles
export const USER_PROFILE_PATH = 'users';

// Realtime Database
export const db = getDatabase(app);

// Auth
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Login / Logout helpers
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Auth state listener
export const subscribeToAuth = (callback) => onAuthStateChanged(auth, callback);

// Export DB helpers
export { ref, push, set, get, query, orderByChild, equalTo, update, limitToLast };

/**
 * Checks if a user's profile exists in the database.
 * @param {string} uid - The Firebase User ID.
 * @returns {Promise<object | null>} The user profile data or null if not found.
 */
export async function getUserProfile(uid) {
    const profileRef = ref(db, `${USER_PROFILE_PATH}/${uid}`);
    const snapshot = await get(profileRef);
    if (snapshot.exists()) {
        return snapshot.val();
    }
    return null;
}

/**
 * Creates or updates a user's profile in the Realtime Database.
 * @param {string} uid - The Firebase User ID.
 * @param {object} profileData - The profile data to save.
 * @returns {Promise<boolean>} True if successful.
 */
export async function saveUserProfile(uid, profileData) {
    try {
        const profileRef = ref(db, `${USER_PROFILE_PATH}/${uid}`);
        await set(profileRef, {
            ...profileData,
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error("Error saving user profile:", error);
        throw error;
    }
}