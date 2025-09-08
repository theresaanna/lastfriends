import NextAuth from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'

async function refreshAccessToken(token) {
  try {
    if (!token.refreshToken) {
      return { ...token, error: 'NoRefreshToken' }
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
    })

    const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basic}`,
      },
      body: params,
    })

    const refreshed = await response.json()

    if (!response.ok) {
      throw refreshed
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    }
  } catch (error) {
    console.error('Error refreshing Spotify access token:', error)
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

// Debug log NEXTAUTH_URL used at runtime
console.log('[NextAuth] Initializing with:', {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NODE_ENV: process.env.NODE_ENV,
  hasSecret: !!process.env.NEXTAUTH_SECRET,
  hasSpotifyId: !!process.env.SPOTIFY_CLIENT_ID,
  hasSpotifySecret: !!process.env.SPOTIFY_CLIENT_SECRET,
});

// Resolve cookie domain dynamically; do not force a production domain in development
// Only set domain if it's a valid domain string (not empty, not just a dot)
let COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN?.trim();

// If AUTH_COOKIE_DOMAIN is a URL, extract just the domain
if (COOKIE_DOMAIN) {
  // Check if it starts with http:// or https://
  if (COOKIE_DOMAIN.startsWith('http://') || COOKIE_DOMAIN.startsWith('https://')) {
    try {
      const url = new URL(COOKIE_DOMAIN);
      COOKIE_DOMAIN = url.hostname;
      console.log('[NextAuth] Extracted domain from URL:', url.hostname);
    } catch (e) {
      console.error('[NextAuth] Invalid URL in AUTH_COOKIE_DOMAIN:', COOKIE_DOMAIN);
      COOKIE_DOMAIN = undefined;
    }
  }
  
  // Clear invalid values
  if (COOKIE_DOMAIN === '' || COOKIE_DOMAIN === '.' || COOKIE_DOMAIN === 'undefined') {
    COOKIE_DOMAIN = undefined;
  }
}

console.log('[NextAuth] Cookie domain config:', {
  raw: process.env.AUTH_COOKIE_DOMAIN,
  processed: COOKIE_DOMAIN,
  willSetDomain: !!COOKIE_DOMAIN
});

// Wrap NextAuth in error handling
const authHandler = NextAuth({
  debug: process.env.NODE_ENV === 'development',
  // Remove trustHost as it can cause issues with URL validation
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  // Ensure cookies are set consistently. Only set a domain if explicitly provided and valid.
  cookies: COOKIE_DOMAIN ? {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        domain: COOKIE_DOMAIN,
      },
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        domain: COOKIE_DOMAIN,
      },
    },
    callbackUrl: {
      name: 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        domain: COOKIE_DOMAIN,
      },
    },
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        domain: COOKIE_DOMAIN,
        maxAge: 60 * 15 // 15 minutes
      },
    },
  } : undefined, // Let NextAuth use defaults if no domain is specified
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'user-read-private user-read-email user-top-read user-library-read playlist-read-private',
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in
      if (account) {
        const expiresAt = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + (account.expires_in ?? 3600) * 1000

        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: expiresAt,
          error: undefined,
        }
      }

      // Return previous token if still valid (with 60s buffer)
      if (token.accessToken && token.accessTokenExpires && Date.now() < token.accessTokenExpires - 60 * 1000) {
        return token
      }

      // Access token expired, try to refresh
      return await refreshAccessToken(token)
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.error = token.error
      return session
    },
  },
  events: {
    async signIn(message) {
      console.log('[NextAuth] signIn event', { user: message.user?.email, account: message.account?.provider })
    },
    async error(message) {
      console.log('[NextAuth] error event', message)
    },
  },
  logger: {
    debug(code, metadata) {
      if (typeof code === 'string') {
        console.log('[NextAuth][debug]', code, metadata || '')
      } else {
        console.log('[NextAuth][debug]', code)
      }
    },
    error(code, metadata) {
      if (typeof code === 'string') {
        console.error('[NextAuth][error]', code, metadata || '')
      } else {
        console.error('[NextAuth][error]', code)
      }
    },
    warn(code) {
      console.warn('[NextAuth][warn]', code)
    },
  },
})

// Export with error handling
export default async function handler(req, res) {
  try {
    return await authHandler(req, res);
  } catch (error) {
    console.error('[NextAuth] Handler error:', error);
    console.error('[NextAuth] Error stack:', error.stack);
    
    // Return a more informative error response
    if (req.query.nextauth?.includes('csrf')) {
      return res.status(500).json({ 
        error: 'NextAuth initialization failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    // For other endpoints, return appropriate error
    return res.status(500).json({ 
      error: 'Authentication service error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
