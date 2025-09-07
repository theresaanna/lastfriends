// utils/session.js - Unified session access (NextAuth secure-session or legacy JWT)
import { SignJWT, jwtVerify } from 'jose';
import { SecureSessionManager } from '../lib/auth/nextauth-adapter.js';
import { decryptToken } from '../lib/auth/encryption.js';

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret-key');

export class SessionManager {
  // Create a new session token with embedded user data (legacy JWT flow)
  static async createSession(userData) {
    const sessionId = crypto.randomUUID();
    const sessionData = {
      id: sessionId,
      ...userData,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };

    console.log('Creating session with embedded data for user:', userData.username);

    // Create JWT token with all session data embedded
    const token = await new SignJWT(sessionData)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    return { sessionId, token };
  }

  // Get session data directly from JWT token (legacy JWT flow)
  static async getSession(token) {
    try {
      console.log('Verifying session token...');
      const { payload } = await jwtVerify(token, secret);

      // The payload IS the session data
      const session = {
        ...payload,
        lastAccessed: Date.now() // Update last accessed time
      };

      console.log('Session verified for user:', session.username, 'source:', session.dataSource);
      return session;
    } catch (error) {
      console.error('Session verification failed:', error.message);
      return null;
    }
  }

  // Update session - would need to generate new token
  static async updateSession(currentToken, updates) {
    try {
      const currentSession = await this.getSession(currentToken);
      if (!currentSession) return null;

      const updatedSessionData = {
        ...currentSession,
        ...updates,
        lastAccessed: Date.now()
      };

      const newToken = await new SignJWT(updatedSessionData)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

      return { sessionId: updatedSessionData.id, token: newToken };
    } catch (error) {
      console.error('Session update failed:', error);
      return null;
    }
  }

  // Delete session (just invalidate the token - we can't actually delete JWT)
  static deleteSession(sessionId) {
    console.log('Session delete requested for:', sessionId);
    // With JWT-only approach, we can't actually "delete" the token
    // The client needs to remove the cookie
    return true;
  }

  // Get session stats (for debugging)
  static getStats() {
    return {
      totalSessions: 'N/A (JWT-based)',
      sessions: [],
      note: 'Sessions are now stored in JWT tokens, not in memory'
    };
  }
}

// Utility function to get session from request (supports both flows)
export async function getSessionFromRequest(req) {
  // 1) Legacy JWT cookie named "session" or Bearer token
  const jwtToken = req.cookies?.session || req.headers.authorization?.replace('Bearer ', '');
  if (jwtToken) {
    const legacy = await SessionManager.getSession(jwtToken);
    if (legacy) return legacy;
  }

  // 2) Secure session cookie from NextAuth bridge (preferred)
  const cookies = req.cookies || {};
  const secureToken = cookies.session_token_debug || cookies.session_token;

  if (!secureToken) {
    console.log('No session token found in request');
    return null;
  }

  // Load session from secure store via manager (handles auto-refresh when near expiry)
  const secureSession = await SecureSessionManager.getSecureSession(secureToken);
  if (!secureSession) return null;

  // Decrypt tokens if possible; fall back to raw
  let accessToken = secureSession.accessToken;
  let refreshToken = secureSession.refreshToken;
  try {
    accessToken = await decryptToken(secureSession.accessToken);
  } catch (e) {
    console.warn('Access token decrypt failed, using raw token');
  }
  try {
    refreshToken = await decryptToken(secureSession.refreshToken);
  } catch (e) {
    console.warn('Refresh token decrypt failed, using raw token');
  }

  // Return a compatibility shape expected by existing APIs
  return {
    dataSource: 'spotify',
    username: secureSession.userEmail || secureSession.userId,
    displayName: secureSession.userName || secureSession.userEmail || 'User',
    email: secureSession.userEmail,
    spotifyId: null,
    country: null,
    followers: null,
    product: null,
    images: [],
    tokens: {
      accessToken,
      refreshToken,
      expiresAt: secureSession.tokenExpiry,
      scope: undefined,
    },
    createdAt: secureSession.createdAt,
    lastAccessed: secureSession.lastAccessed,
  };
}
