// lib/auth/middleware.js - Authentication middleware for API routes
import { parse } from 'cookie';
import { getSession, updateSession } from './session.js';
import { decryptToken, encryptToken } from './encryption.js';

/**
 * Higher-order function that wraps API route handlers with authentication
 * @param {Function} handler - The API route handler to protect
 * @returns {Function} Protected API route handler
 */
export function withAuth(handler) {
  return async (req, res) => {
    try {
      // Parse cookies from request
      const cookies = parse(req.headers.cookie || '');

      // Priority: debug token first, then production token
      const sessionToken = cookies.session_token_debug || cookies.session_token;

      if (!sessionToken) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NO_SESSION_TOKEN'
        });
      }

      // Get session from store
      const session = await getSession(sessionToken);
      if (!session) {
        return res.status(401).json({
          error: 'Invalid session',
          code: 'INVALID_SESSION'
        });
      }

      // Check if token has expired
      const now = Date.now();
      const timeUntilExpiry = session.tokenExpiry - now;

      if (timeUntilExpiry <= 0) {
        return res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      // Auto-refresh if token expires in less than 5 minutes
      if (timeUntilExpiry < 5 * 60 * 1000) {
        console.log('🔄 Auto-refreshing token for user:', session.userId);

        try {
          // Check if we have encrypted tokens to refresh
          if (session.refreshToken && session.refreshToken !== 'no-refresh-token') {
            const refreshToken = await decryptToken(session.refreshToken);
            const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
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

            if (tokenResponse.ok) {
              const tokens = await tokenResponse.json();
              const updatedSession = {
                ...session,
                accessToken: await encryptToken(tokens.access_token),
                refreshToken: await encryptToken(tokens.refresh_token || refreshToken),
                tokenExpiry: Date.now() + (tokens.expires_in * 1000),
                lastAccessed: Date.now()
              };

              await updateSession(sessionToken, updatedSession);
              req.session = updatedSession;
              console.log('✅ Token refreshed successfully for user:', session.userId);
            } else {
              // Refresh failed, but token might still be valid for a few more minutes
              console.warn('⚠️ Token refresh failed, using existing token');
              req.session = {
                ...session,
                lastAccessed: Date.now()
              };
              await updateSession(sessionToken, req.session);
            }
          } else {
            // No refresh token available, just update last accessed
            req.session = {
              ...session,
              lastAccessed: Date.now()
            };
            await updateSession(sessionToken, req.session);
          }
        } catch (error) {
          console.error('❌ Auto-refresh failed:', error);
          // Continue with existing session
          req.session = {
            ...session,
            lastAccessed: Date.now()
          };
          await updateSession(sessionToken, req.session);
        }
      } else {
        // Token is still valid, just update last accessed time
        const updatedSession = {
          ...session,
          lastAccessed: Date.now()
        };
        await updateSession(sessionToken, updatedSession);
        req.session = updatedSession;
      }

      // Decrypt access token and add to request
      try {
        if (session.accessToken) {
          req.accessToken = await decryptToken(req.session.accessToken);
        }
      } catch (error) {
        console.error('❌ Token decryption failed:', error);
        // For debug sessions without encryption, use the token directly
        req.accessToken = req.session.accessToken;
      }

      // Add user info to request
      req.user = {
        id: req.session.userId,
        email: req.session.userEmail,
        name: req.session.userName,
        image: req.session.userImage
      };

      // Add session token to request for potential cleanup
      req.sessionToken = sessionToken;

      // Call the original handler
      return handler(req, res);
    } catch (error) {
      console.error('❌ Auth middleware error:', error);
      return res.status(500).json({
        error: 'Authentication error',
        code: 'MIDDLEWARE_ERROR'
      });
    }
  };
}

/**
 * Optional middleware for routes that can work with or without auth
 * Sets req.user and req.accessToken if authenticated, but doesn't block unauthenticated requests
 * @param {Function} handler - The API route handler
 * @returns {Function} Optionally protected API route handler
 */
export function withOptionalAuth(handler) {
  return async (req, res) => {
    try {
      const cookies = parse(req.headers.cookie || '');
      const sessionToken = cookies.session_token_debug || cookies.session_token;

      if (sessionToken) {
        const session = await getSession(sessionToken);

        if (session && session.tokenExpiry > Date.now()) {
          try {
            req.accessToken = await decryptToken(session.accessToken);
            req.user = {
              id: session.userId,
              email: session.userEmail,
              name: session.userName,
              image: session.userImage
            };
            req.sessionToken = sessionToken;
            req.session = session;
          } catch (error) {
            console.warn('⚠️ Optional auth failed:', error);
            // Continue without auth
          }
        }
      }

      return handler(req, res);
    } catch (error) {
      console.error('❌ Optional auth middleware error:', error);
      // Continue without auth on error
      return handler(req, res);
    }
  };
}