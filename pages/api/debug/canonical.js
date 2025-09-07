// pages/api/debug/canonical.js - Report current host vs NEXTAUTH_URL and log mismatches
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const nextAuthUrl = process.env.NEXTAUTH_URL || '';

    const forwardedProto = req.headers['x-forwarded-proto'] || (req.connection && req.connection.encrypted ? 'https' : 'http');
    const forwardedHost = req.headers['x-forwarded-host'] || req.headers['host'] || '';
    const currentOrigin = `${forwardedProto}://${forwardedHost}`;

    let canonical = { origin: nextAuthUrl, host: null, protocol: null };
    try {
      const u = new URL(nextAuthUrl);
      canonical = { origin: u.origin, host: u.host, protocol: u.protocol.replace(':', '') };
    } catch (_) {}

    const mismatch = Boolean(
      canonical.origin && (
        canonical.origin.toLowerCase() !== currentOrigin.toLowerCase()
      )
    );

    if (mismatch) {
      console.warn('[HostCheck] Host/protocol mismatch detected', {
        nextAuthUrl: canonical.origin,
        currentOrigin,
        details: {
          current: { host: forwardedHost, proto: forwardedProto },
          expected: { host: canonical.host, proto: canonical.protocol }
        }
      });
    } else {
      console.log('[HostCheck] Host matches NEXTAUTH_URL', { origin: currentOrigin });
    }

    return res.status(200).json({
      nextAuthUrl: canonical.origin || null,
      currentOrigin,
      mismatch,
      details: {
        current: { host: forwardedHost, proto: forwardedProto },
        expected: { host: canonical.host, proto: canonical.protocol }
      }
    });
  } catch (error) {
    console.error('[HostCheck] Error', { message: error?.message });
    return res.status(500).json({ error: 'Host check failed' });
  }
}
