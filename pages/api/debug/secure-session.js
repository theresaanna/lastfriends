// pages/api/debug/secure-session.js - Inspect secure-session timing without exposing tokens
import { parse } from 'cookie';
import { getSession as getRawSecureStoreSession } from '../../../lib/auth/session.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  try {
    const cookies = parse(req.headers.cookie || '');
    const sessionToken = cookies.session_token_debug || cookies.session_token;

    if (!sessionToken) {
      return res.status(401).json({
        authenticated: false,
        error: 'No secure-session token found. Log in with Spotify first.'
      });
    }

    // Read raw session data directly (no auto-refresh in this path)
    const session = await getRawSecureStoreSession(sessionToken);
    if (!session) {
      return res.status(401).json({
        authenticated: false,
        error: 'No secure-session found for token (may be expired or cleared).'
      });
    }

    const now = Date.now();
    const expiry = session.tokenExpiry || 0;
    const remainingMs = expiry - now;
    const remainingSeconds = Math.floor(remainingMs / 1000);
    const thresholdSeconds = 5 * 60; // 5 minutes
    const wouldRefresh = remainingMs > 0 && remainingSeconds < thresholdSeconds;

    return res.status(200).json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.userEmail,
        name: session.userName,
        provider: session.provider
      },
      times: {
        now: new Date(now).toISOString(),
        createdAt: session.createdAt ? new Date(session.createdAt).toISOString() : null,
        lastAccessed: session.lastAccessed ? new Date(session.lastAccessed).toISOString() : null,
        tokenExpiry: expiry ? new Date(expiry).toISOString() : null,
        remainingSeconds
      },
      autoRefreshPolicy: {
        thresholdSeconds,
        wouldRefresh
      },
      storage: {
        type: process.env.NODE_ENV === 'production' && process.env.REDIS_URL ? 'redis' : 'memory'
      },
      note: 'This endpoint does not expose tokens and does not trigger refresh; it reports whether the auto-refresh policy would apply if accessed via normal session flow.'
    });
  } catch (error) {
    console.error('[SecureSession][Debug] Error', error);
    return res.status(500).json({
      error: 'Failed to inspect secure session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
