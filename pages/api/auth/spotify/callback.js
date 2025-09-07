// pages/api/auth/spotify/callback.js - Deprecated in favor of NextAuth
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({
    error: 'DEPRECATED_ENDPOINT',
    message: 'This endpoint has been deprecated. Use NextAuth callback at /api/auth/callback/spotify.',
    nextAuthCallback: '/api/auth/callback/spotify',
  });
}
