// pages/api/debug/session-trace.js - Enhanced session debugging with source tracking
import { getSessionFromRequest } from '../../../utils/session.js';
import { SpotifyDataAPI } from '../../../utils/spotify.js';
import { jwtVerify } from 'jose';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract raw token data
    const sessionToken = req.cookies?.session || req.headers.authorization?.replace('Bearer ', '');
    const tempOAuthToken = req.cookies?.spotify_oauth_temp;
    
    const response = {
      debugging: true,
      cookies: {
        hasSessionCookie: !!sessionToken,
        hasTempOAuthCookie: !!tempOAuthToken,
        sessionTokenPreview: sessionToken?.substring(0, 50) + '...',
        allCookies: Object.keys(req.cookies || {})
      },
      headers: {
        authorization: req.headers.authorization ? 'Bearer ***' : null,
        userAgent: req.headers['user-agent'],
        host: req.headers.host
      }
    };

    // Decode session token if present
    if (sessionToken) {
      try {
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret-key');
        const { payload } = await jwtVerify(sessionToken, secret);
        
        response.jwtPayload = {
          username: payload.username,
          spotifyId: payload.spotifyId,
          displayName: payload.displayName,
          email: payload.email,
          dataSource: payload.dataSource,
          createdAt: new Date(payload.createdAt).toISOString(),
          lastAccessed: new Date(payload.lastAccessed).toISOString(),
          iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
          exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : null
        };

        // Check if this token matches the expected user
        response.tokenAnalysis = {
          isUnknownUser: payload.spotifyId === '31e2bfr7kfr6jwdmqtlyqtlgcxs4',
          tokenAge: Date.now() - (payload.iat * 1000),
          timeUntilExpiry: (payload.exp * 1000) - Date.now()
        };

        // Try to fetch current Spotify user info
        if (payload.tokens?.accessToken) {
          try {
            const currentSpotifyUser = await SpotifyDataAPI.getUserInfo(payload.tokens.accessToken);
            response.currentSpotifyUser = {
              id: currentSpotifyUser.id,
              name: currentSpotifyUser.name,
              matchesToken: currentSpotifyUser.id === payload.spotifyId
            };
          } catch (error) {
            response.currentSpotifyUser = { error: error.message };
          }
        }

      } catch (error) {
        response.jwtError = error.message;
      }
    }

    // Also get session via normal flow
    const session = await getSessionFromRequest(req);
    response.sessionFromRequest = session ? {
      username: session.username,
      spotifyId: session.spotifyId,
      dataSource: session.dataSource
    } : null;

    return res.status(200).json(response);

  } catch (error) {
    console.error('Session trace error:', error);
    return res.status(500).json({
      error: 'Failed to trace session',
      details: error.message
    });
  }
}
