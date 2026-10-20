import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser,
  Auth
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
let auth: Auth | any = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let isFirebaseConfigured = false;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Refresh ചെയ്യുമ്പോൾ ലോഗിൻ സെഷൻ ലോക്കൽ സ്റ്റോറേജിൽ തന്നെ നിലനിർത്തുന്നു
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn("Auth persistence error:", err);
  });

  db = getFirestore(app);
  storage = getStorage(app);
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
  storage, 
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
