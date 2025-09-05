// pages/api/auth/spotify/callback.js - Handle Spotify OAuth callback with cookie-based temp storage
import { SpotifyAuth } from '../../../../utils/spotifyAuth.js';
import { SessionManager } from '../../../../utils/session.js';
import { jwtVerify } from 'jose';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error } = req.query;

  console.log('Callback received:', { code: !!code, state, error });

  // Handle OAuth errors
  if (error) {
    console.error('Spotify OAuth error:', error);
    return res.redirect(`/?error=oauth_error&message=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    console.error('Missing code or state:', { code: !!code, state: !!state });
    return res.redirect('/?error=missing_code&message=Authorization code or state missing');
  }

  try {
    // Get and verify temporary OAuth cookie
    const tempSessionToken = req.cookies.spotify_oauth_temp;
    console.log('Temp session token exists:', !!tempSessionToken);

    if (!tempSessionToken) {
      console.error('No temp session token found');
      return res.redirect('/?error=session_expired&message=OAuth session expired');
    }

    // Verify and extract OAuth data from cookie
    let oauthData;
    try {
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret-key');
      const { payload } = await jwtVerify(tempSessionToken, secret);
      oauthData = payload;
      console.log('OAuth data extracted from cookie:', !!oauthData.codeVerifier);
    } catch (error) {
      console.error('Failed to verify OAuth cookie:', error.message);
      return res.redirect('/?error=invalid_session&message=Invalid OAuth session');
    }

    // Verify state parameter
    console.log('State verification:', { received: state, expected: oauthData.state });
    if (oauthData.state !== state) {
      console.error('State mismatch');
      return res.redirect('/?error=state_mismatch&message=Invalid state parameter');
    }

    console.log('Exchanging code for tokens...');
    // Exchange authorization code for tokens
    const tokens = await SpotifyAuth.exchangeCodeForTokens(
      code,
      oauthData.codeVerifier,
      oauthData.redirectUri
    );
    console.log('Tokens received:', !!tokens.accessToken);

    // Get user information from Spotify
    console.log('Getting user info...');
    const userInfo = await SpotifyAuth.getUserInfo(tokens.accessToken);
    console.log('User info received:', userInfo.id);

    // Create permanent user session
    const userSession = await SessionManager.createSession({
      dataSource: 'spotify',
      username: userInfo.id,
      displayName: userInfo.display_name,
      email: userInfo.email,
      spotifyId: userInfo.id,
      country: userInfo.country,
      followers: userInfo.followers?.total || 0,
      images: userInfo.images || [],
      product: userInfo.product,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope
      }
    });
    console.log('User session created:', userSession.sessionId);

    // Clear temporary OAuth cookie
    res.setHeader('Set-Cookie', [
      `session=${userSession.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`, // 24 hours
      `spotify_oauth_temp=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` // Clear temp cookie
    ]);

    // Redirect to success page or dashboard
    return res.redirect(`/?login=success&source=spotify&user=${encodeURIComponent(userInfo.display_name || userInfo.id)}`);

  } catch (error) {
    console.error('Spotify OAuth callback error:', error);

    // Clear temporary OAuth cookie on error
    res.setHeader('Set-Cookie', [
      `spotify_oauth_temp=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
    ]);

    return res.redirect(`/?error=auth_failed&message=${encodeURIComponent(error.message)}`);
  }
}