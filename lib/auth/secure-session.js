// pages/api/auth/secure-session.js - API to create secure session cookie
import { getToken } from 'next-auth/jwt';
import { SecureSessionManager } from '../../../lib/auth/nextauth-adapter.js';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get NextAuth JWT token from request
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated with NextAuth' });
    }

    console.log('✅ Found NextAuth token for user:', token.email);

    // Create session object in the format our adapter expects
    const session = {
      user: {
        id: token.sub || token.email,
        email: token.email,
        name: token.name,
        image: token.picture
      }
    };

    // Token object with access token
    const tokenData = {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken || 'no-refresh-token',
      accessTokenExpires: token.accessTokenExpires || (Date.now() + 3600000)
    };

    // Create secure session
    const sessionToken = await SecureSessionManager.createSecureSession(session, tokenData);

    // Set secure session cookie
    const sessionCookie = serialize('session_token', sessionToken, {
      httpOnly: true,
      secure: false, // Set to false for local development
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
      domain: 'lastfriends.local' // Explicitly set domain
    });

    res.setHeader('Set-Cookie', sessionCookie);
    res.json({
      success: true,
      message: 'Secure session created with real Spotify data',
      user: {
        email: token.email,
        name: token.name
      },
      sessionToken: sessionToken.substring(0, 8) + '...'
    });
  } catch (error) {
    console.error('❌ Secure session creation failed:', error);
    res.status(500).json({
      error: 'Failed to create secure session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}