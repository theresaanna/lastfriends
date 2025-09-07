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
console.log('[NextAuth] NEXTAUTH_URL =', process.env.NEXTAUTH_URL)

export default NextAuth({
  debug: true,
  trustHost: true,
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
