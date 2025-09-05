// pages/api/auth/me.js - Get current user session with proper date handling
import { getSessionFromRequest } from '../../../utils/session.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return res.status(401).json({
        authenticated: false,
        message: 'No active session found'
      });
    }

    // Helper function to safely convert timestamps to ISO strings
    const toISOString = (timestamp) => {
      if (!timestamp) return null;
      try {
        return new Date(timestamp).toISOString();
      } catch (error) {
        console.error('Date conversion error for timestamp:', timestamp, error);
        return null;
      }
    };

    // Return user info (without sensitive tokens)
    return res.status(200).json({
      authenticated: true,
      dataSource: session.dataSource,
      username: session.username,
      displayName: session.displayName,
      email: session.email,
      spotifyId: session.spotifyId,
      country: session.country,
      followers: session.followers,
      product: session.product,
      images: session.images,
      tokenExpires: toISOString(session.tokens?.expiresAt),
      sessionCreated: toISOString(session.createdAt),
      lastAccessed: toISOString(session.lastAccessed),
      // Debug info
      rawTimestamps: {
        createdAt: session.createdAt,
        lastAccessed: session.lastAccessed,
        tokenExpires: session.tokens?.expiresAt
      }
    });

  } catch (error) {
    console.error('Session check error:', error);
    return res.status(500).json({
      error: 'Failed to check session',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}