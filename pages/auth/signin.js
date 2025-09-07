import { useEffect } from 'react';
import { useRouter } from 'next/router';

// pages/auth/signin.js
// Custom NextAuth sign-in/error page: translate NextAuth error codes into
// friendly query params our home page already handles, then redirect home.
export default function AuthSignInPage() {
  const router = useRouter();
  const { error } = router.query;

  useEffect(() => {
    // Translate NextAuth error codes into detailed messages
    const map = (code) => {
      switch (code) {
        case 'OAuthSignin':
          return {
            urlError: 'auth_failed',
            message: 'Could not start Spotify sign-in. Please try again.'
          };
        case 'OAuthCallback':
          return {
            urlError: 'auth_failed',
            message: 'Spotify sign-in failed during callback. This is commonly caused by a redirect URI or domain mismatch.'
          };
        case 'OAuthCreateAccount':
          return {
            urlError: 'auth_failed',
            message: 'We could not create your account from Spotify. Please try again.'
          };
        case 'OAuthAccountNotLinked':
        case 'AccountNotLinked':
          return {
            urlError: 'auth_failed',
            message: 'Your email is already used with a different login method. Please sign in with that method or use a different Spotify account.'
          };
        case 'AccessDenied':
          return {
            urlError: 'auth_failed',
            message: 'Access was denied. Please grant the requested permissions on Spotify.'
          };
        case 'Configuration':
          return {
            urlError: 'auth_failed',
            message: 'Server configuration error. Please try again later.'
          };
        case 'Adapter':
          return {
            urlError: 'auth_failed',
            message: 'A server adapter error occurred. Please try again.'
          };
        case 'Callback':
          return {
            urlError: 'auth_failed',
            message: 'Authentication callback failed. Please try again.'
          };
        case 'CredentialsSignin':
          return {
            urlError: 'auth_failed',
            message: 'Invalid credentials.'
          };
        case 'EmailSignin':
          return {
            urlError: 'auth_failed',
            message: 'Email sign-in failed.'
          };
        case 'Verification':
          return {
            urlError: 'auth_failed',
            message: 'Email verification failed.'
          };
        case 'SessionRequired':
          return {
            urlError: 'auth_failed',
            message: 'Please sign in to continue.'
          };
        default:
          return {
            urlError: 'auth_failed',
            message: 'Authentication failed. Please try again.'
          };
      }
    };

    const mapped = map(typeof error === 'string' ? error : 'Default');

    // Build redirect to home with error params understood by pages/index.js
    const params = new URLSearchParams();
    params.set('error', mapped.urlError);
    if (mapped.message) params.set('message', encodeURIComponent(mapped.message));

    // Use shallow replace to avoid an extra history entry
    router.replace(`/?${params.toString()}`);
  }, [error, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-700">Redirecting…</p>
        <p className="text-sm text-gray-500 mt-2">
          If you are not redirected, <a href="/" className="text-green-600 underline">click here</a>.
        </p>
      </div>
    </div>
  );
}
