// pages/api/auth/spotify/login.js - More robust redirect URI handling
import { SpotifyAuth } from '../../../../utils/spotifyAuth.js';
import { SignJWT } from 'jose';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // More robust redirect URI generation
    let redirectUri;

    if (process.env.NODE_ENV === 'production') {
      // Use explicit production URI
      redirectUri = 'https://lastfriends.site/api/auth/spotify/callback';
    } else {
      // Dynamic for development
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      redirectUri = `${protocol}://${host}/api/auth/spotify/callback`;
    }

    console.log('Using redirect URI:', redirectUri);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Headers:', { host: req.headers.host, proto: req.headers['x-forwarded-proto'] });

    // Generate OAuth URL with PKCE
    const { authUrl, codeVerifier, state } = SpotifyAuth.generateAuthUrl(null, redirectUri);

    // Rest of the function stays the same...
    const oauthData = {
      codeVerifier,
      state,
      redirectUri,
      createdAt: Date.now()
    };

    const oauthToken = await new SignJWT(oauthData)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret-key'));

    res.setHeader('Set-Cookie', [
      `spotify_oauth_temp=${oauthToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
    ]);

    return res.status(200).json({
      authUrl,
      redirectUri,
      state,
      environment: process.env.NODE_ENV,
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