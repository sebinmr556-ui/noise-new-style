import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  setDoc,
  arrayUnion,
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAnGiJd-r37GEaWXY4LN3VDzOQuqamAedY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "noise-new-style.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "noise-new-style",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "noise-new-style.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "923676895487",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:923676895487:web:8eeedeb4d4bdab6bf844ca",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-445G2XCXCX"
};

let app: any = null;
let auth: any = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let isFirebaseConfigured = false;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app); // സ്റ്റോറേജ് ഇവിടെ ഇനിഷ്യലൈസ് ചെയ്തിരിക്കുന്നു
  isFirebaseConfigured = true;
} catch (error) {
  console.warn("Firebase initialization warning:", error);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export { 
  app, 
  auth, 
  db, 
  storage, // സ്റ്റോറേജ് ഇവിടെ എക്സ്പോർട്ട് ചെയ്തിരിക്കുന്നു
  isFirebaseConfigured,
  GoogleAuthProvider, 
  signInWithPopup, 
  fbSignOut, 
  onAuthStateChanged,
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  setDoc,
  arrayUnion,
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot
};
export type { FirebaseUser };
