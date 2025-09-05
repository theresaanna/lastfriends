// pages/api/auth/spotify/login.js - Initiate Spotify OAuth flow
import { SpotifyAuth } from '../../../../utils/spotifyAuth.js';
import { SignJWT } from 'jose';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the current host for dynamic redirect URI
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/auth/spotify/callback`;

    console.log('Generated redirect URI:', redirectUri);

    // Generate OAuth URL with PKCE
    const { authUrl, codeVerifier, state } = SpotifyAuth.generateAuthUrl(null, redirectUri);

    // Store OAuth data directly in encrypted cookies (more reliable than in-memory for dev)
    const oauthData = {
      codeVerifier,
      state,
      redirectUri,
      createdAt: Date.now()
    };

    // Create a simple encrypted token for OAuth data
    const oauthToken = await new SignJWT(oauthData)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m') // 10 minutes
      .sign(new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret-key'));

    // Set temporary session cookie with OAuth data
    res.setHeader('Set-Cookie', [
      `spotify_oauth_temp=${oauthToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600` // 10 minutes
    ]);

    // Return auth URL for redirect
    return res.status(200).json({
      authUrl,
      redirectUri, // Include this for debugging
      state,
      message: 'Redirect user to authUrl to begin OAuth flow'
    });

  } catch (error) {
    console.error('Spotify OAuth initiation error:', error);
    return res.status(500).json({
      error: 'Failed to initiate Spotify authentication',
      details: error.message
    });
  }
}