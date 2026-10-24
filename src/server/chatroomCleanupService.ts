import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  Firestore 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyAnGiJd-r37GEaWXY4LN3VDzOQuqamAedY",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "noise-new-style.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "noise-new-style",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "noise-new-style.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "923676895487",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:923676895487:web:8eeedeb4d4bdab6bf844ca",
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || "G-445G2XCXCX"
};

let serverApp: any = null;
let serverDb: Firestore | null = null;

export function getServerDb(): Firestore {
  if (!serverDb) {
    serverApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig, 'noise-backend-app');
    serverDb = getFirestore(serverApp);
  }
  return serverDb;
}

export const CHATROOM_CONFIG = {
  // Lifetime of chat rooms before automatic expiration: 24 hours
  TTL_MS: 24 * 60 * 60 * 1000,
  // Frequency of backend scheduled cleanup check: every 60 seconds
  CLEANUP_INTERVAL_MS: 60 * 1000,
};

let lastCleanupStats = {
  lastRun: Date.now(),
  deletedCount: 0,
  activeRoomsCount: 0,
};

/**
 * Permanently deletes a single chat room and all associated subcollection
 * messages, participants, temporary signaling IDs, and metadata from Firestore.
 */
export async function deleteChatRoomCascading(roomId: string): Promise<{ roomId: string; messagesDeleted: number; success: boolean }> {
  const db = getServerDb();
  let messagesDeleted = 0;
  try {
    // 1. Delete all subcollection messages under /voice_rooms/{roomId}/messages
    const messagesRef = collection(db, 'voice_rooms', roomId, 'messages');
    const msgSnapshot = await getDocs(messagesRef);
    for (const msgDoc of msgSnapshot.docs) {
      await deleteDoc(doc(db, 'voice_rooms', roomId, 'messages', msgDoc.id));
      messagesDeleted++;
    }

    // 2. Delete any temporary WebRTC signaling calls associated with this room
    try {
      const callsCol = collection(db, 'calls');
      const callSnapshot = await getDocs(callsCol);
      for (const callDoc of callSnapshot.docs) {
        if (callDoc.id.includes(roomId) || callDoc.data().roomId === roomId) {
          await deleteDoc(doc(db, 'calls', callDoc.id));
        }
      }
    } catch (e) {
      console.debug('[Chatroom Cleanup] Signaling cleanup notice:', e);
    }

    // 3. Delete the parent room document from /voice_rooms/{roomId}
    await deleteDoc(doc(db, 'voice_rooms', roomId));

    console.log(`[Chatroom Cleanup] Permanently deleted room ${roomId} and ${messagesDeleted} messages from database.`);
    return { roomId, messagesDeleted, success: true };
  } catch (error) {
    console.error(`[Chatroom Cleanup] Error deleting room ${roomId}:`, error);
    return { roomId, messagesDeleted, success: false };
  }
}

/**
 * Permanently deletes ALL existing chat rooms and their IDs and messages from the database.
 */
export async function purgeAllExistingChatRooms(): Promise<{ roomsDeleted: number; totalMessagesDeleted: number; roomIds: string[] }> {
  const db = getServerDb();
  console.log('[Chatroom Cleanup] Initiating permanent purge of all existing chat rooms and IDs from database...');
  const roomsRef = collection(db, 'voice_rooms');
  const snapshot = await getDocs(roomsRef);
  let roomsDeleted = 0;
  let totalMessagesDeleted = 0;
  const roomIds: string[] = [];

  for (const roomDoc of snapshot.docs) {
    const result = await deleteChatRoomCascading(roomDoc.id);
    if (result.success) {
      roomsDeleted++;
      totalMessagesDeleted += result.messagesDeleted;
      roomIds.push(roomDoc.id);
    }
  }

  // Also clean up any lingering WebRTC call IDs that refer to voice rooms
  try {
    const callsCol = collection(db, 'calls');
    const callSnap = await getDocs(callsCol);
    for (const c of callSnap.docs) {
      if (c.id.startsWith('room-') || c.id.startsWith('voice_')) {
        await deleteDoc(doc(db, 'calls', c.id));
      }
    }
  } catch (e) {}

  lastCleanupStats = {
    lastRun: Date.now(),
    deletedCount: roomsDeleted,
    activeRoomsCount: 0,
  };

  console.log(`[Chatroom Cleanup] Purge complete: ${roomsDeleted} chat rooms deleted, ${totalMessagesDeleted} messages purged.`);
  return { roomsDeleted, totalMessagesDeleted, roomIds };
}

/**
 * Scans all chat rooms in the database and automatically deletes those that have
 * reached their expiration time or have ended.
 */
export async function cleanupExpiredChatRooms(): Promise<{ expiredCount: number; deletedRoomIds: string[]; activeRooms: number }> {
  const db = getServerDb();
  const now = Date.now();
  const roomsRef = collection(db, 'voice_rooms');
  const snapshot = await getDocs(roomsRef);

  const deletedRoomIds: string[] = [];
  let remainingActiveCount = 0;

  for (const roomDoc of snapshot.docs) {
    const data = roomDoc.data();
    const createdAt = typeof data.createdAt === 'number' 
      ? data.createdAt 
      : (data.createdAt?.toMillis ? data.createdAt.toMillis() : 0);
    const expiresAt = typeof data.expiresAt === 'number' 
      ? data.expiresAt 
      : (createdAt ? createdAt + CHATROOM_CONFIG.TTL_MS : 0);
    const isLive = data.isLive !== false;

    const isExpired = expiresAt > 0 && now >= expiresAt;
    const isEnded = !isLive;

    if (isExpired || isEnded) {
      console.log(`[Scheduled Cleanup] Room ${roomDoc.id} expired (created: ${createdAt}, expires: ${expiresAt}, now: ${now}). Deleting...`);
      const result = await deleteChatRoomCascading(roomDoc.id);
      if (result.success) {
        deletedRoomIds.push(roomDoc.id);
      }
    } else {
      remainingActiveCount++;
    }
  }

  lastCleanupStats = {
    lastRun: now,
    deletedCount: deletedRoomIds.length,
    activeRoomsCount: remainingActiveCount,
  };

  return { expiredCount: deletedRoomIds.length, deletedRoomIds, activeRooms: remainingActiveCount };
}

let cleanupTimer: any = null;

/**
 * Starts the backend scheduled cleanup job that executes every 60 seconds
 * to automatically delete expired chat rooms and their IDs.
 */
export function startChatRoomCleanupJob() {
  if (cleanupTimer) clearInterval(cleanupTimer);

  console.log(`[Chatroom Cleanup Job] Started background job (interval: ${CHATROOM_CONFIG.CLEANUP_INTERVAL_MS / 1000}s, TTL: ${CHATROOM_CONFIG.TTL_MS / 60000}m)`);

  // Run initial cleanup immediately
  cleanupExpiredChatRooms().catch((err) => console.error('[Chatroom Cleanup Job] Initial run error:', err));

  // Run recurring job every 60s
  cleanupTimer = setInterval(() => {
    cleanupExpiredChatRooms().catch((err) => console.error('[Chatroom Cleanup Job] Scheduled run error:', err));
  }, CHATROOM_CONFIG.CLEANUP_INTERVAL_MS);

  return cleanupTimer;
}

export function getLastCleanupStats() {
  return lastCleanupStats;
}
