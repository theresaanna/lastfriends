// utils/spotifyAuth.js - Spotify OAuth utilities
import crypto from 'crypto';

export class SpotifyAuth {
  static clientId = process.env.SPOTIFY_CLIENT_ID;
  static clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  static redirectUri = process.env.SPOTIFY_REDIRECT_URI ||
    (process.env.NODE_ENV === 'production'
      ? 'https://lastfriends.site/api/auth/spotify/callback'
      : 'http://localhost:3000/api/auth/spotify/callback');
  static scopes = [
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'user-library-read',
    'playlist-read-private'
  ];

  // Generate authorization URL with PKCE
  static generateAuthUrl(state = null, customRedirectUri = null) {
    const redirectUri = customRedirectUri || this.redirectUri;

    if (!this.clientId || !redirectUri) {
      throw new Error('Missing Spotify OAuth configuration');
    }

    // Generate PKCE code verifier and challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    const generatedState = state || crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: this.scopes.join(' '),
      state: generatedState,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      show_dialog: 'false'
    });

    return {
      authUrl: `https://accounts.spotify.com/authorize?${params.toString()}`,
      codeVerifier,
      state: generatedState
    };
  }

  // Exchange authorization code for access token
  static async exchangeCodeForTokens(code, codeVerifier, customRedirectUri = null) {
    const redirectUri = customRedirectUri || this.redirectUri;
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${error}`);
      }

      const tokens = await response.json();
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        scope: tokens.scope,
        tokenType: tokens.token_type,
        expiresAt: Date.now() + (tokens.expires_in * 1000)
      };
    } catch (error) {
      console.error('Spotify token exchange error:', error);
      throw error;
    }
  }

  // Refresh access token
  static async refreshAccessToken(refreshToken) {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${error}`);
      }

      const tokens = await response.json();
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || refreshToken, // Spotify may not always return new refresh token
        expiresIn: tokens.expires_in,
        scope: tokens.scope,
        tokenType: tokens.token_type,
        expiresAt: Date.now() + (tokens.expires_in * 1000)
      };
    } catch (error) {
      console.error('Spotify token refresh error:', error);
      throw error;
    }
  }

  // Generate PKCE code verifier
  static generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  // Generate PKCE code challenge
  static generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  // Validate token and check if it needs refresh
  static isTokenExpired(token) {
    if (!token || !token.expiresAt) return true;
    // Add 5 minute buffer
    return Date.now() > (token.expiresAt - 5 * 60 * 1000);
  }

  // Get user info from Spotify API
  static async getUserInfo(accessToken) {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get Spotify user info:', error);
      throw error;
    }
  }
}