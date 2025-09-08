// pages/api/debug/auth-diagnostic.js
// Diagnostic endpoint to check NextAuth configuration
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  
  // Only return non-sensitive diagnostic info
  const diagnostics = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    nodeEnv: process.env.NODE_ENV,
    
    // Check if required env vars are present (not their values)
    envVarsPresent: {
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      SPOTIFY_CLIENT_ID: !!process.env.SPOTIFY_CLIENT_ID,
      SPOTIFY_CLIENT_SECRET: !!process.env.SPOTIFY_CLIENT_SECRET,
      AUTH_ENCRYPTION_KEY: !!process.env.AUTH_ENCRYPTION_KEY,
    },
    
    // Check NEXTAUTH_URL format (not the actual value for security)
    nextAuthUrlInfo: {
      isSet: !!process.env.NEXTAUTH_URL,
      startsWithHttps: process.env.NEXTAUTH_URL?.startsWith('https://'),
      endsWithSlash: process.env.NEXTAUTH_URL?.endsWith('/'),
      length: process.env.NEXTAUTH_URL?.length || 0,
      // Show just the domain, not full URL
      domain: process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : null,
    },
    
    // Check if AUTH_ENCRYPTION_KEY has correct format
    authEncryptionKeyInfo: {
      isSet: !!process.env.AUTH_ENCRYPTION_KEY,
      length: process.env.AUTH_ENCRYPTION_KEY?.length || 0,
      isHex: process.env.AUTH_ENCRYPTION_KEY ? /^[0-9a-fA-F]+$/.test(process.env.AUTH_ENCRYPTION_KEY) : false,
    },
    
    // Request info
    request: {
      host: req.headers.host,
      xForwardedHost: req.headers['x-forwarded-host'],
      xForwardedProto: req.headers['x-forwarded-proto'],
      origin: req.headers.origin,
      referer: req.headers.referer,
    },
    
    // Try to import NextAuth to see if there are any module errors
    nextAuthModule: await checkNextAuthModule(),
  };
  
  res.status(200).json(diagnostics);
}

async function checkNextAuthModule() {
  try {
    // Try to import the NextAuth config
    const nextAuthModule = await import('../auth/[...nextauth].js');
    return {
      loaded: true,
      hasDefault: !!nextAuthModule.default,
      exportKeys: Object.keys(nextAuthModule),
    };
  } catch (error) {
    return {
      loaded: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }
}
