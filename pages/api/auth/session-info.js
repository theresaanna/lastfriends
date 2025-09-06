// pages/api/auth/session-info.js
import { parse } from 'cookie';
import { getSession } from '../../../lib/auth/session.js';

export default async function handler(req, res) {
  console.log('🍪 All cookies received:', req.headers.cookie);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cookies = parse(req.headers.cookie || '');
    console.log('🔍 Parsed cookies:', cookies);

    // Priority order: debug token first, then production token
    let sessionToken = cookies.session_token_debug;
    let tokenSource = 'debug';

    if (!sessionToken) {
      // If no debug token, try production token
      sessionToken = cookies.session_token;
      tokenSource = 'production';
    }

    console.log('🔍 Using token source:', tokenSource);
    console.log('🔍 Session token found:', sessionToken ? sessionToken.substring(0, 16) + '...' : 'NONE');

    if (!sessionToken) {
      return res.status(401).json({
        error: 'No session token found',
        authenticated: false,
        availableCookies: Object.keys(cookies)
      });
    }

    console.log('📦 Looking up session for token:', sessionToken.substring(0, 16) + '...');
    const session = await getSession(sessionToken);
    console.log('📦 Session data found:', session ? 'YES' : 'NO');

    if (!session) {
      return res.status(401).json({
        error: 'No valid session found',
        authenticated: false,
        tokenUsed: sessionToken.substring(0, 16) + '...',
        tokenSource
      });
    }

    const user = {
      id: session.userId,
      email: session.userEmail,
      name: session.userName,
      image: session.userImage,
      tokenExpiry: session.tokenExpiry,
      lastAccessed: session.lastAccessed,
      provider: session.provider
    };

    res.json({
      user,
      authenticated: true,
      tokenExpiry: session.tokenExpiry,
      sessionType: tokenSource,
      tokenUsed: sessionToken.substring(0, 16) + '...'
    });
  } catch (error) {
    console.error('❌ Session info error:', error);
    res.status(500).json({
      error: 'Failed to get session info',
      authenticated: false,
      details: error.message
    });
  }
}