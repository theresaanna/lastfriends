// pages/api/auth/logout.js - Enhanced logout that cleans up both NextAuth and secure sessions
import { parse, serialize } from 'cookie';
import { SecureSessionManager } from '../../../lib/auth/nextauth-adapter.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cookies = parse(req.headers.cookie || '');
    const sessionToken = cookies.session_token;

    // Clean up our secure session
    if (sessionToken) {
      await SecureSessionManager.deleteSecureSession(sessionToken);
      console.log('🧹 Secure session cleaned up');
    }

    // Clear secure session cookie
    const clearSecureSession = serialize('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    // Clear NextAuth cookies (these are the standard NextAuth cookie names)
    const clearNextAuthSession = serialize('next-auth.session-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    const clearNextAuthCSRF = serialize('next-auth.csrf-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    // For production (secure cookies)
    const clearSecureNextAuthSession = serialize('__Secure-next-auth.session-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    const clearSecureNextAuthCSRF = serialize('__Secure-next-auth.csrf-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    // Set all the clear cookies
    const cookiesToClear = [
      clearSecureSession,
      clearNextAuthSession,
      clearNextAuthCSRF
    ];

    // Add secure cookies for production
    if (process.env.NODE_ENV === 'production') {
      cookiesToClear.push(clearSecureNextAuthSession, clearSecureNextAuthCSRF);
    }

    res.setHeader('Set-Cookie', cookiesToClear);

    res.json({
      success: true,
      message: 'Logged out successfully',
      clearedSessions: {
        secureSession: !!sessionToken,
        nextAuthSession: true
      }
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}