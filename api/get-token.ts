import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { roomName, username } = req.body;

  if (!roomName || !username) {
    return res.status(400).json({ success: false, error: 'Missing roomName or username' });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ success: false, error: 'Server misconfigured: missing LiveKit credentials' });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, { identity: username });
    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
    const token = await at.toJwt();

    return res.status(200).json({ success: true, token });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
