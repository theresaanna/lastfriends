// pages/api/auth/secure-session.js - Create secure session cookie from NextAuth token
import { getToken } from 'next-auth/jwt';
import { SecureSessionManager } from '../../../lib/auth/nextauth-adapter.js';
import { serialize, parse } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get NextAuth JWT token from request (supports both dev and prod cookies)
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      // Provide minimal debug context in development without leaking secrets
      const devDebug = process.env.NODE_ENV !== 'production' ? {
        cookiesPresent: Object.keys(parse(req.headers.cookie || '')),
        hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
        nextAuthUrl: process.env.NEXTAUTH_URL || null,
      } : undefined;
      return res.status(401).json({ error: 'Not authenticated with NextAuth', ...(devDebug ? { debug: devDebug } : {}) });
    }

    // Build session data from NextAuth token
    const session = {
      user: {
        id: token.sub || token.email,
        email: token.email,
        name: token.name,
        image: token.picture,
      },
    };

    const tokenData = {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken || 'no-refresh-token',
      accessTokenExpires: token.accessTokenExpires || (Date.now() + 3600000),
    };

    // Create secure session and set cookie
    const sessionToken = await SecureSessionManager.createSecureSession(session, tokenData);

    const sessionCookie = serialize('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    res.setHeader('Set-Cookie', sessionCookie);
    res.json({
      success: true,
      message: 'Secure session created',
      sessionToken: sessionToken.substring(0, 8) + '...',
    });
  } catch (error) {
    console.error('Secure session creation failed:', error);
    res.status(500).json({
      error: 'Failed to create secure session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
