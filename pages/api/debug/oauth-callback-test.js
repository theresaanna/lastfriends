// pages/api/debug/oauth-callback-test.js
// Debug endpoint to see what's happening during OAuth callback

export default async function handler(req, res) {
  const { code, state, error, error_description } = req.query;
  
  // Get all headers
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!key.toLowerCase().includes('cookie') && !key.toLowerCase().includes('auth')) {
      headers[key] = value;
    }
  }
  
  // Check cookies
  const cookies = req.cookies || {};
  const cookieInfo = {
    hasSessionToken: !!cookies['next-auth.session-token'],
    hasCsrfToken: !!cookies['next-auth.csrf-token'],
    hasCallbackUrl: !!cookies['next-auth.callback-url'],
    hasPkceVerifier: !!cookies['next-auth.pkce.code_verifier'],
    cookieNames: Object.keys(cookies)
  };
  
  // Get the actual redirect URI that would be sent
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const actualRedirectUri = `${protocol}://${host}/api/auth/callback/spotify`;
  
  // Check NEXTAUTH_URL
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const expectedRedirectUri = nextAuthUrl ? `${nextAuthUrl}/api/auth/callback/spotify` : null;
  
  const response = {
    timestamp: new Date().toISOString(),
    oauth_params: {
      hasCode: !!code,
      hasState: !!state,
      error: error || null,
      error_description: error_description || null
    },
    urls: {
      nextAuthUrl,
      expectedRedirectUri,
      actualRedirectUri,
      mismatch: expectedRedirectUri && expectedRedirectUri !== actualRedirectUri
    },
    request: {
      method: req.method,
      url: req.url,
      protocol,
      host,
      originalHost: req.headers.host,
      forwardedHost: req.headers['x-forwarded-host'],
      forwardedProto: req.headers['x-forwarded-proto'],
      userAgent: req.headers['user-agent']
    },
    cookies: cookieInfo,
    spotify_config: {
      hasClientId: !!process.env.SPOTIFY_CLIENT_ID,
      hasClientSecret: !!process.env.SPOTIFY_CLIENT_SECRET,
      clientIdLength: process.env.SPOTIFY_CLIENT_ID?.length || 0
    }
  };
  
  res.status(200).json(response);
}
