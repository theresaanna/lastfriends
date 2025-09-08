// pages/api/debug/spotify-auth-url.js
// Shows the exact Spotify authorization URL that would be generated

import crypto from 'crypto';

export default async function handler(req, res) {
  // Get the redirect URI that NextAuth would use
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const redirectUri = nextAuthUrl ? `${nextAuthUrl}/api/auth/callback/spotify` : null;
  
  // Generate PKCE challenge (similar to what NextAuth does)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  // Build the Spotify authorization URL
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID || 'NOT_SET',
    response_type: 'code',
    redirect_uri: redirectUri || 'NOT_SET',
    scope: 'user-read-private user-read-email user-top-read user-library-read playlist-read-private',
    state: crypto.randomBytes(16).toString('hex'),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge
  });
  
  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  
  // Also check what redirect URI is registered in cookies/session
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const requestRedirectUri = `${protocol}://${host}/api/auth/callback/spotify`;
  
  res.status(200).json({
    debug: {
      nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT_SET',
      configuredRedirectUri: redirectUri,
      requestBasedRedirectUri: requestRedirectUri,
      match: redirectUri === requestRedirectUri,
      clientIdSet: !!process.env.SPOTIFY_CLIENT_ID,
      clientSecretSet: !!process.env.SPOTIFY_CLIENT_SECRET
    },
    spotify_auth: {
      authorizationUrl: authUrl,
      redirect_uri_in_url: redirectUri,
      client_id: process.env.SPOTIFY_CLIENT_ID ? `${process.env.SPOTIFY_CLIENT_ID.substring(0, 8)}...` : 'NOT_SET'
    },
    instructions: {
      step1: "Compare the redirect_uri above with what's in your Spotify app settings",
      step2: "They must match EXACTLY including https:// and no trailing slash",
      step3: "The redirect URI in Spotify should be: " + redirectUri
    }
  });
}
