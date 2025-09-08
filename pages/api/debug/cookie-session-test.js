import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { getToken } from "next-auth/jwt";
import cookie from 'cookie';

export default async function handler(req, res) {
  console.log('=== COOKIE SESSION DEBUG START ===');
  
  // 1. Raw headers
  console.log('Raw Cookie Header:', req.headers.cookie);
  console.log('All Headers:', JSON.stringify(req.headers, null, 2));
  
  // 2. Parse cookies manually
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  console.log('Parsed Cookies:', JSON.stringify(cookies, null, 2));
  
  // 3. Look for NextAuth cookies specifically
  const nextAuthCookies = Object.keys(cookies).filter(key => 
    key.includes('next-auth') || key.includes('__Secure') || key.includes('__Host')
  );
  console.log('NextAuth Related Cookies:', nextAuthCookies);
  
  // 4. Get JWT token
  let jwtToken = null;
  try {
    jwtToken = await getToken({ req });
    console.log('JWT Token from getToken:', JSON.stringify(jwtToken, null, 2));
  } catch (error) {
    console.error('Error getting JWT token:', error);
  }
  
  // 5. Get server session
  let serverSession = null;
  try {
    serverSession = await getServerSession(req, res, authOptions);
    console.log('Server Session:', JSON.stringify(serverSession, null, 2));
  } catch (error) {
    console.error('Error getting server session:', error);
  }
  
  // 6. Check req.cookies (if Next.js middleware processed it)
  console.log('req.cookies:', req.cookies);
  
  // 7. Check for secure session cookie
  const secureSessionCookie = cookies['secure-session'];
  console.log('Secure Session Cookie:', secureSessionCookie);
  
  console.log('=== COOKIE SESSION DEBUG END ===');
  
  // Return comprehensive debug info
  res.status(200).json({
    timestamp: new Date().toISOString(),
    headers: {
      cookie: req.headers.cookie,
      authorization: req.headers.authorization,
      origin: req.headers.origin,
      referer: req.headers.referer,
    },
    parsedCookies: cookies,
    nextAuthCookies: nextAuthCookies.reduce((acc, key) => {
      acc[key] = cookies[key]?.substring(0, 50) + '...' // Truncate for security
      return acc;
    }, {}),
    jwtToken: jwtToken ? {
      sub: jwtToken.sub,
      email: jwtToken.email,
      hasAccessToken: !!jwtToken.accessToken,
      hasRefreshToken: !!jwtToken.refreshToken,
      accessTokenExpiry: jwtToken.accessTokenExpires,
    } : null,
    serverSession: serverSession ? {
      user: serverSession.user,
      hasAccessToken: !!serverSession.accessToken,
      expires: serverSession.expires,
    } : null,
    secureSession: !!secureSessionCookie,
    reqCookies: req.cookies,
  });
}
