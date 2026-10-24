import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { 
  startChatRoomCleanupJob, 
  purgeAllExistingChatRooms, 
  deleteChatRoomCascading, 
  cleanupExpiredChatRooms, 
  getLastCleanupStats,
  CHATROOM_CONFIG 
} from './src/server/chatroomCleanupService.ts';

const app = express();
const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

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

// API: Trigger Immediate Expiration Check and Cleanup
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

async function startServer() {
  // 1. Permanently remove all existing chat rooms, IDs, and records from the database on launch
  try {
    console.log('[Server Startup] Running initial purge of all existing chat rooms and IDs...');
    await purgeAllExistingChatRooms();
  } catch (err) {
    console.warn('[Server Startup] Initial purge notice:', err);
  }

  // 2. Start the automated background cleanup job for newly created chat rooms
  startChatRoomCleanupJob();

  // 3. Mount Frontend: Vite middleware in development or static dist in production
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
