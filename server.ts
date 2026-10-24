import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { 
  startChatRoomCleanupJob, 
  purgeAllExistingChatRooms, 
  deleteChatRoomCascading, 
  cleanupExpiredChatRooms, 
  getLastCleanupStats,
  CHATROOM_CONFIG 
} from './src/server/chatroomCleanupService.ts';
import {
  startStoryCleanupJob,
  cleanupExpiredStories,
  getStoryCleanupStats,
  STORY_CONFIG
} from './src/server/storyCleanupService.ts';

const app = express();
const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

// Increase payload limit to 100MB for video/media uploads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Ensure public/uploads directory exists and serve static uploads
const uploadsDir = path.resolve(import.meta.dirname || '.', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API: Upload Media (Video / Photo) for Stories and Posts
app.post('/api/upload', async (req: Request, res: Response) => {
  try {
    const { fileData, fileName, fileType } = req.body;
    if (!fileData) {
      return res.status(400).json({ success: false, error: 'No file data provided' });
    }

    let mimeType = fileType || '';
    let base64Content = fileData;

    // Extract mime type from data URI if present (e.g., data:video/mp4;base64,AAAA...)
    const dataUriMatch = fileData.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUriMatch) {
      mimeType = mimeType || dataUriMatch[1];
      base64Content = dataUriMatch[2];
    }

    const isVideo = mimeType.startsWith('video/') || 
      (fileName && /\.(mp4|webm|mov|ogg|m4v)$/i.test(fileName));

    // Determine extension
    let extension = 'bin';
    if (mimeType.includes('mp4')) extension = 'mp4';
    else if (mimeType.includes('webm')) extension = 'webm';
    else if (mimeType.includes('quicktime') || (fileName && fileName.endsWith('.mov'))) extension = 'mov';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
    else if (mimeType.includes('png')) extension = 'png';
    else if (mimeType.includes('webp')) extension = 'webp';
    else if (mimeType.includes('gif')) extension = 'gif';
    else if (fileName && fileName.includes('.')) {
      extension = fileName.split('.').pop() || 'bin';
    } else {
      extension = isVideo ? 'mp4' : 'jpg';
    }

    const buffer = Buffer.from(base64Content, 'base64');
    const safeName = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;
    const targetPath = path.join(uploadsDir, safeName);

    await fs.promises.writeFile(targetPath, buffer);
    const mediaUrl = `/uploads/${safeName}`;

    console.log(`[Upload API] Successfully saved ${isVideo ? 'video' : 'image'} (${buffer.length} bytes) to ${mediaUrl}`);

    res.json({
      success: true,
      url: mediaUrl,
      mediaType: isVideo ? 'video' : 'image',
      fileName: safeName,
      size: buffer.length,
      mimeType,
    });
  } catch (error: any) {
    console.error('[Upload API] Error saving file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get Chat Room Expiration and Cleanup Rules Configuration
app.get('/api/chatrooms/config', (_req: Request, res: Response) => {
  res.json({
    ttlMinutes: CHATROOM_CONFIG.TTL_MS / 60000,
    cleanupIntervalSeconds: CHATROOM_CONFIG.CLEANUP_INTERVAL_MS / 1000,
    enforcement: 'backend-scheduled-trigger',
    rules: {
      autoDeleteOnExpiry: true,
      cascadeDeleteMessages: true,
      cascadeDeleteIDs: true,
    }
  });
});

// API: Get Cleanup Job Health and Active Room Stats
app.get('/api/chatrooms/status', async (_req: Request, res: Response) => {
  try {
    const stats = getLastCleanupStats();
    res.json({
      success: true,
      stats,
      serverTime: Date.now(),
      status: 'active',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Trigger Immediate Full Purge of Existing Chat Rooms, IDs, and Messages
app.post('/api/chatrooms/cleanup-all', async (_req: Request, res: Response) => {
  try {
    console.log('[API] Received request to purge all existing chat rooms and IDs from database...');
    const result = await purgeAllExistingChatRooms();
    res.json({
      success: true,
      message: 'All existing chat rooms and temporary IDs have been permanently removed from the database.',
      ...result,
    });
  } catch (error: any) {
    console.error('[API] Purge failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Trigger Immediate Expiration Check and Cleanup for Chat Rooms
app.post('/api/chatrooms/cleanup-expired', async (_req: Request, res: Response) => {
  try {
    const result = await cleanupExpiredChatRooms();
    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Permanently Delete a Specific Chat Room with Cascading Cleanup
app.delete('/api/chatrooms/:roomId', async (req: Request, res: Response) => {
  const { roomId } = req.params;
  try {
    const result = await deleteChatRoomCascading(roomId);
    res.json({
      message: `Chat room ${roomId} and associated messages/IDs permanently deleted.`,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Trigger Immediate Story Expiration Check and Cleanup (24 hours TTL)
app.post('/api/stories/cleanup-expired', async (_req: Request, res: Response) => {
  try {
    const result = await cleanupExpiredStories();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get Story Expiration Stats
app.get('/api/stories/status', (_req: Request, res: Response) => {
  try {
    const stats = getStoryCleanupStats();
    res.json({
      success: true,
      stats,
      serverTime: Date.now(),
      ttlHours: STORY_CONFIG.LIFETIME_MS / (60 * 60 * 1000),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function startServer() {
  // 1. Start automated background cleanup jobs for chatrooms and stories (24h expiration)
  startChatRoomCleanupJob();
  startStoryCleanupJob();

  // 2. Mount Frontend: Vite middleware in development or static dist in production
  if (isProd) {
    const distPath = path.resolve(import.meta.dirname || '.', 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Noise server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
});
