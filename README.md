# lastfriends

This repo powers lastfriends.site and the local dev app.

Development
- Install dependencies: npm install
- Start local HTTPS server: npm run dev (serves https://localhost:3001)

Cloudflare Tunnel (recommended for OAuth dev)
- Quick tunnel (ephemeral):
  - npm run tunnel
  - Set NEXTAUTH_URL in .env.local to the printed https://<random>.trycloudflare.com
  - Add https://<random>.trycloudflare.com/api/auth/callback/spotify to the Spotify app Redirect URIs
  - Restart dev server; use the tunnel URL in your browser for the whole login flow

- Named tunnel (stable subdomain; requires a Cloudflare account and a domain in Cloudflare DNS)
  1) cloudflared tunnel login
     - Authorize and select your zone (domain)
  2) cloudflared tunnel create lastfriends-dev
     - Note the tunnel UUID printed; credentials are saved at ~/.cloudflared/<UUID>.json
  3) cloudflared tunnel route dns lastfriends-dev dev-auth.<your-domain>
     - Example: dev-auth.lastfriends.site
  4) Create ~/.cloudflared/config.yml with:

     tunnel: <UUID>
     credentials-file: /Users/<you>/.cloudflared/<UUID>.json
     ingress:
       - hostname: dev-auth.<your-domain>
         service: https://localhost:3001
         originRequest:
           noTLSVerify: true
       - service: http_status:404

  5) Run in foreground:
     - cloudflared tunnel run lastfriends-dev
     Or install as a service:
     - cloudflared service install
     - brew services start cloudflared

  6) In .env.local set:
     - NEXTAUTH_URL=https://dev-auth.<your-domain>
  7) In the Spotify app (for your Client ID) add the redirect URI:
     - https://dev-auth.<your-domain>/api/auth/callback/spotify

Environment
- .env.local is already gitignored. Do not commit secrets.
- Required variables:
  - NEXTAUTH_URL
  - NEXTAUTH_SECRET
  - SPOTIFY_CLIENT_ID
  - SPOTIFY_CLIENT_SECRET
  - AUTH_ENCRYPTION_KEY (64 hex chars)

Notes
- NextAuth builds redirect_uri from NEXTAUTH_URL automatically.
- Custom Spotify OAuth endpoints were deprecated; use signIn('spotify').
