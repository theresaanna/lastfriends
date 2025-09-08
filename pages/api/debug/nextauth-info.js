// pages/api/debug/nextauth-info.js
// Shows what NEXTAUTH_URL the server sees and the exact redirect_uri NextAuth/Spotify expect.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const envUrl = process.env.NEXTAUTH_URL || '';

    const forwardedProto = req.headers['x-forwarded-proto'] || (req.connection && req.connection.encrypted ? 'https' : 'http');
    const forwardedHost = req.headers['x-forwarded-host'] || req.headers['host'] || '';
    const currentOrigin = `${forwardedProto}://${forwardedHost}`;

    let canonical = { origin: envUrl, host: null, protocol: null };
    try {
      const u = new URL(envUrl);
      canonical = { origin: u.origin, host: u.host, protocol: u.protocol.replace(':', '') };
    } catch (_) {}

    // The redirect_uri NextAuth will generate for Spotify
    const expectedRedirectURI = canonical.origin ? `${canonical.origin}/api/auth/callback/spotify` : null;

    const mismatch = canonical.origin && canonical.origin.toLowerCase() !== currentOrigin.toLowerCase();

    res.status(200).json({
      nextAuthUrl: canonical.origin || null,
      expectedRedirectURI,
      request: {
        origin: currentOrigin,
        host: forwardedHost,
        proto: forwardedProto,
        path: req.url
      },
      mismatch,
    });
  } catch (error) {
    console.error('[NextAuthInfo] error', error);
    res.status(500).json({ error: 'Failed to read NextAuth info' });
  }
}
