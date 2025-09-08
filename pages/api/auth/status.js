// pages/api/auth/status.js - Safe status of NextAuth-related server config
export default function handler(req, res) {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    const hasNextAuthSecret = Boolean(process.env.NEXTAUTH_SECRET);
    const nextAuthUrl = process.env.NEXTAUTH_URL || null;
    const hasSpotifyId = Boolean(process.env.SPOTIFY_CLIENT_ID);
    const hasSpotifySecret = Boolean(process.env.SPOTIFY_CLIENT_SECRET);
    const cookieDomain = process.env.AUTH_COOKIE_DOMAIN || null;

    // Report current request origin (no secrets)
    const proto = req.headers['x-forwarded-proto'] || (req.connection && req.connection.encrypted ? 'https' : 'http');
    const host = req.headers['x-forwarded-host'] || req.headers.host || null;
    const origin = host ? `${proto}://${host}` : null;

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      env: {
        nodeEnv: process.env.NODE_ENV || 'development',
        hasNextAuthSecret,
        hasSpotifyId,
        hasSpotifySecret,
        nextAuthUrl,
        cookieDomain,
      },
      request: { origin, host, proto },
    });
  } catch (_err) {
    return res.status(200).json({ ok: false });
  }
}

