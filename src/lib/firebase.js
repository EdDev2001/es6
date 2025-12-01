// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set , get, query, orderByChild, equalTo, update, limitToLast} from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Your Firebase configuration
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

// Realtime Database
export const db = getDatabase(app);

// Firebase Auth
export const auth = getAuth(app);

// Export database helpers
export { ref, push, set, get,query, orderByChild, equalTo, update, limitToLast};
