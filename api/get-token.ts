import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. POST റിക്വസ്റ്റ് ആണോ എന്ന് പരിശോധിക്കുന്നു
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // 2. ആവശ്യമായ ഡാറ്റ (roomName, username) റിക്വസ്റ്റ് ബോഡിയിൽ ഉണ്ടോ എന്ന് പരിശോധിക്കുന്നു
  const { roomName, username } = req.body;

  if (!roomName || !username) {
    return res.status(400).json({ success: false, error: 'Missing roomName or username' });
  }

  // 3. Vercel Environment Variables-ൽ നിന്ന് LiveKit API Keys എടുക്കുന്നു
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ success: false, error: 'Server misconfigured: missing LiveKit credentials' });
  }

  try {
    // 4. AccessToken നിർമ്മിക്കുന്നു (ttl: '2h' നൽകിയതിനാൽ ടോക്കൺ പെട്ടെന്ന് എക്സ്പയർ ആകില്ല)
    const at = new AccessToken(apiKey, apiSecret, { 
      identity: username,
      ttl: '2h' // ആവശ്യാനുസരണം സമയം മാറ്റാം (ഉദാഹരണത്തിന് '4h' അല്ലെങ്കിൽ '24h')
    });

    // 5. റൂമിൽ ജോയിൻ ചെയ്യാനും സംസാരിക്കാനും കേൾക്കാനുമുള്ള പെർമിഷനുകൾ നൽകുന്നു
    at.addGrant({ 
      roomJoin: true, 
      room: roomName, 
      canPublish: true, 
      canSubscribe: true 
    });

    // 6. JWT ടോക്കൺ ജനറേറ്റ് ചെയ്യുന്നു
    const token = await at.toJwt();

    // 7. ആപ്പിലേക്ക് സക്സസ് റെസ്പോൺസ് അയക്കുന്നു
    return res.status(200).json({ success: true, token });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
