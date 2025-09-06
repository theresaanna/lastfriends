// lib/auth/nextauth-adapter.js - Bridge between NextAuth and our secure session management
import crypto from 'crypto';
import { encryptToken, decryptToken } from './encryption.js';
import { createSession, getSession, updateSession, deleteSession } from './session.js';

/**
 * Enhanced session management that works with NextAuth
 */
export class SecureSessionManager {

  /**
   * Create a secure session from NextAuth session data
   * @param {Object} session - NextAuth session object
   * @param {Object} token - NextAuth token object with access/refresh tokens
   * @returns {Promise<string>} Session token for cookies
   */
  static async createSecureSession(session, token) {
    // Fix: Use crypto.randomBytes properly
    const sessionToken = crypto.randomBytes(32).toString('hex');

    const sessionData = {
      userId: session.user.email || session.user.id, // Use email as fallback ID
      userEmail: session.user.email,
      userName: session.user.name,
      userImage: session.user.image,
      accessToken: await encryptToken(token.accessToken),
      refreshToken: await encryptToken(token.refreshToken || 'no-refresh-token'),
      tokenExpiry: token.accessTokenExpires || (Date.now() + 3600000), // 1 hour default
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      provider: 'spotify'
    };

    await createSession(sessionToken, sessionData);
    return sessionToken;
  }

  /**
   * Get and validate a secure session
   * @param {string} sessionToken - Session token from cookie
   * @returns {Promise<Object|null>} Session data or null
   */
  static async getSecureSession(sessionToken) {
    if (!sessionToken) return null;

    const session = await getSession(sessionToken);
    if (!session) return null;

    // Check if token needs refresh
    const now = Date.now();
    const timeUntilExpiry = session.tokenExpiry - now;

    if (timeUntilExpiry <= 0) {
      return null; // Token expired
    }

    // Auto-refresh if expiring soon
    if (timeUntilExpiry < 5 * 60 * 1000) { // 5 minutes
      const refreshed = await this.refreshSessionToken(sessionToken, session);
      return refreshed || session;
    }

    return session;
  }

  /**
   * Refresh Spotify access token
   * @param {string} sessionToken - Session token
   * @param {Object} session - Current session data
   * @returns {Promise<Object|null>} Updated session or null
   */
  static async refreshSessionToken(sessionToken, session) {
    try {
      const refreshToken = await decryptToken(session.refreshToken);

      // Skip refresh if no valid refresh token
      if (refreshToken === 'no-refresh-token') {
        console.log('No refresh token available, skipping refresh');
        return session;
      }

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.SPOTIFY_CLIENT_ID,
        }),
      });

      if (!response.ok) {
        console.error('Token refresh failed:', response.status);
        return null;
      }

      const tokens = await response.json();

      const updatedSession = {
        ...session,
        accessToken: await encryptToken(tokens.access_token),
        refreshToken: await encryptToken(tokens.refresh_token || refreshToken),
        tokenExpiry: Date.now() + (tokens.expires_in * 1000),
        lastAccessed: Date.now()
      };

      await updateSession(sessionToken, updatedSession);
      return updatedSession;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Delete a secure session
   * @param {string} sessionToken - Session token to delete
   */
  static async deleteSecureSession(sessionToken) {
    if (sessionToken) {
      await deleteSession(sessionToken);
    }
  }
}