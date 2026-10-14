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
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot,
  Firestore
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyAs-zxNx2VUS_GFWkv_-GHCEDEVRy9d1x8",
  authDomain: "noise-new-62dd3.firebaseapp.com",
  projectId: "noise-new-62dd3",
  storageBucket: "noise-new-62dd3.firebasestorage.app",
  messagingSenderId: "715181211247",
  appId: "1:715181211247:android:ec5c72f9cbacf9998d579a"
};

let app: any = null;
let auth: any = null;
let db: Firestore | null = null;
let isFirebaseConfigured = false;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
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
  isFirebaseConfigured,
  GoogleAuthProvider, 
  signInWithPopup, 
  fbSignOut, 
  onAuthStateChanged,
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot
};
export type { FirebaseUser };
