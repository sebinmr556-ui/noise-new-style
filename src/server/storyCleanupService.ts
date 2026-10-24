import fs from 'fs';
import path from 'path';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { getServerDb } from './chatroomCleanupService.js';

export const STORY_CONFIG = {
  // 24 hours in milliseconds
  LIFETIME_MS: 24 * 60 * 60 * 1000,
  // Frequency of background expiration checks: every 60 seconds
  CLEANUP_INTERVAL_MS: 60 * 1000,
};

let lastStoryCleanupStats = {
  lastRun: Date.now(),
  deletedCount: 0,
  activeCount: 0,
};

/**
 * Permanently deletes expired stories and their uploaded media files from disk and Firestore.
 */
export async function cleanupExpiredStories(): Promise<{
  success: boolean;
  expiredCount: number;
  deletedStoryIds: string[];
  activeCount: number;
}> {
  const db = getServerDb();
  const now = Date.now();
  const deletedStoryIds: string[] = [];
  let activeCount = 0;

  try {
    const storiesRef = collection(db, 'stories');
    const snapshot = await getDocs(storiesRef);

    for (const storyDoc of snapshot.docs) {
      const data = storyDoc.data();
      const createdAt = typeof data.createdAt === 'number'
        ? data.createdAt
        : (data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.timestamp && !isNaN(Number(data.timestamp)) ? Number(data.timestamp) : 0));

      const expiresAt = typeof data.expiresAt === 'number'
        ? data.expiresAt
        : (createdAt ? createdAt + STORY_CONFIG.LIFETIME_MS : 0);

      const isExpired = expiresAt > 0 && now >= expiresAt;

      if (isExpired) {
        console.log(`[Story Expiration] Deleting expired story ${storyDoc.id} (created: ${createdAt}, expires: ${expiresAt}, now: ${now})`);
        
        // Remove uploaded media file from disk if stored locally
        if (typeof data.mediaUrl === 'string' && data.mediaUrl.startsWith('/uploads/')) {
          try {
            const fileName = path.basename(data.mediaUrl);
            const filePath = path.resolve(process.cwd(), 'public', 'uploads', fileName);
            if (fs.existsSync(filePath)) {
              await fs.promises.unlink(filePath);
              console.log(`[Story Expiration] Cleaned up media file: ${filePath}`);
            }
          } catch (fileErr) {
            console.warn(`[Story Expiration] Failed to delete media file for story ${storyDoc.id}:`, fileErr);
          }
        }

        // Delete Firestore document
        await deleteDoc(doc(db, 'stories', storyDoc.id));
        deletedStoryIds.push(storyDoc.id);
      } else {
        activeCount++;
      }
    }

    lastStoryCleanupStats = {
      lastRun: now,
      deletedCount: deletedStoryIds.length,
      activeCount,
    };

    return {
      success: true,
      expiredCount: deletedStoryIds.length,
      deletedStoryIds,
      activeCount,
    };
  } catch (error: any) {
    console.error('[Story Expiration] Error cleaning up expired stories:', error);
    return {
      success: false,
      expiredCount: deletedStoryIds.length,
      deletedStoryIds,
      activeCount,
    };
  }
}

let storyCleanupTimer: any = null;

/**
 * Starts scheduled background job for story 24h expiration
 */
export function startStoryCleanupJob() {
  if (storyCleanupTimer) clearInterval(storyCleanupTimer);

  console.log(`[Story Cleanup Job] Scheduled background job initialized (24h TTL, check every ${STORY_CONFIG.CLEANUP_INTERVAL_MS / 1000}s)`);

  // Run initial check
  cleanupExpiredStories().catch((err) => console.error('[Story Cleanup Job] Initial run error:', err));

  // Run recurring interval
  storyCleanupTimer = setInterval(() => {
    cleanupExpiredStories().catch((err) => console.error('[Story Cleanup Job] Interval error:', err));
  }, STORY_CONFIG.CLEANUP_INTERVAL_MS);

  return storyCleanupTimer;
}

export function getStoryCleanupStats() {
  return lastStoryCleanupStats;
}
