import { getToken } from "next-auth/jwt";

export default async function handler(req, res) {
  try {
    console.log('=== SIMPLE COOKIE DEBUG START ===');
    
    // 1. Raw headers
    const rawCookieHeader = req.headers.cookie || 'No cookies';
    console.log('Raw Cookie Header:', rawCookieHeader);
    
    // 2. Parse cookies manually
    const cookies = {};
    if (req.headers.cookie) {
      req.headers.cookie.split(';').forEach(c => {
        const parts = c.trim().split('=');
        if (parts.length === 2) {
          cookies[parts[0]] = decodeURIComponent(parts[1]);
        }
      });
    }
    const cookieNames = Object.keys(cookies);
    console.log('Cookie names:', cookieNames);
    
    // 3. Look for NextAuth cookies specifically
    const nextAuthCookies = cookieNames.filter(key => 
      key.includes('next-auth') || key.includes('__Secure') || key.includes('__Host')
    );
    console.log('NextAuth Related Cookies:', nextAuthCookies);
    
    // 4. Try to get JWT token
    let jwtToken = null;
    let tokenError = null;
    try {
      jwtToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      console.log('JWT Token retrieved:', !!jwtToken);
    } catch (error) {
      tokenError = error.message;
      console.error('Error getting JWT token:', error);
    }
    
    console.log('=== SIMPLE COOKIE DEBUG END ===');
    
    // Return debug info
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN,
      },
      cookies: {
        raw: rawCookieHeader.substring(0, 200) + (rawCookieHeader.length > 200 ? '...' : ''),
        count: cookieNames.length,
        names: cookieNames,
        nextAuthCookies: nextAuthCookies,
      },
      session: {
        hasJwtToken: !!jwtToken,
        tokenError: tokenError,
        tokenData: jwtToken ? {
          email: jwtToken.email,
          name: jwtToken.name,
          hasAccessToken: !!jwtToken.accessToken,
          hasRefreshToken: !!jwtToken.refreshToken,
        } : null,
      },
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(200).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
}
