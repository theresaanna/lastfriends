// pages/api/debug/token-check.js - Check Spotify token and verify account
import { getSessionFromRequest } from '../../../utils/session.js';
import { SpotifyDataAPI } from '../../../utils/spotify.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return res.status(401).json({
        error: 'No session found'
      });
    }

    const response = {
      sessionInfo: {
        username: session.username,
        spotifyId: session.spotifyId,
        displayName: session.displayName,
        email: session.email
      },
      tokenInfo: {
        hasAccessToken: !!session.tokens?.accessToken,
        hasRefreshToken: !!session.tokens?.refreshToken,
        tokenPreview: session.tokens?.accessToken?.substring(0, 30) + '...',
        expiresAt: session.tokens?.expiresAt,
        isExpired: session.tokens?.expiresAt ? Date.now() > session.tokens.expiresAt : 'unknown'
      }
    };

    // If we have an access token, verify whose account it belongs to
    if (session.tokens?.accessToken) {
      try {
        const userProfile = await SpotifyDataAPI.getUserInfo(session.tokens.accessToken);
        response.spotifyProfile = {
          id: userProfile.id,
          name: userProfile.name,
          realname: userProfile.realname,
          country: userProfile.country,
          followers: userProfile.followers,
          product: userProfile.product
        };
        response.tokenBelongsToCorrectUser = userProfile.id === session.spotifyId;
      } catch (error) {
        response.spotifyProfileError = error.message;
        response.tokenValid = false;
      }
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Token check error:', error);
    return res.status(500).json({
      error: 'Failed to check token',
      details: error.message
    });
  }
}