// lib/auth/secure-session.js - deprecated placeholder
// This file previously contained an API-like handler. It has been removed to avoid confusion
// with the real API route at pages/api/auth/secure-session.js.
// If imported accidentally, throw to surface the mistake early.

export function deprecatedSecureSessionModule() {
  throw new Error('lib/auth/secure-session.js is deprecated. Use pages/api/auth/secure-session.js for the API route or SecureSessionManager in lib/auth/nextauth-adapter.js.');
}
