// pages/debug-auth.js - Debug page for testing authentication
import { useState, useEffect } from 'react';
import { useSession, signIn, signOut, getCsrfToken, getProviders } from 'next-auth/react';

export default function DebugAuth() {
  const { data: session, status } = useSession();
  const [providers, setProviders] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load providers and CSRF token
    async function loadAuthInfo() {
      try {
        const p = await getProviders();
        setProviders(p);
        
        const token = await getCsrfToken();
        setCsrfToken(token);
        
        // Get debug info from our endpoint
        const res = await fetch('/api/debug/nextauth-info');
        const data = await res.json();
        setDebugInfo(data);
      } catch (err) {
        console.error('Error loading auth info:', err);
        setError(err.message);
      }
    }
    
    loadAuthInfo();
  }, []);

  const handleSpotifyLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Starting Spotify login...');
      const result = await signIn('spotify', {
        redirect: false,
        callbackUrl: '/'
      });
      console.log('Login result:', result);
      
      if (result?.error) {
        setError(`Login failed: ${result.error}`);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectLogin = () => {
    // Try direct navigation to the OAuth endpoint
    window.location.href = '/api/auth/signin?provider=spotify';
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Debug Page</h1>
        
        {/* Session Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Status</h2>
          <div className="space-y-2">
            <p><strong>Status:</strong> {status}</p>
            <p><strong>Logged in:</strong> {session ? 'Yes' : 'No'}</p>
            {session && (
              <>
                <p><strong>User:</strong> {session.user?.email}</p>
                <p><strong>Name:</strong> {session.user?.name}</p>
              </>
            )}
          </div>
        </div>

        {/* Auth Configuration */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Auth Configuration</h2>
          <div className="space-y-2">
            <p><strong>CSRF Token:</strong> {csrfToken ? `${csrfToken.substring(0, 20)}...` : 'Not loaded'}</p>
            <p><strong>Providers:</strong> {providers ? Object.keys(providers).join(', ') : 'Not loaded'}</p>
            <p><strong>NextAuth URL:</strong> {debugInfo.nextAuthUrl || 'Loading...'}</p>
            <p><strong>Expected Redirect URI:</strong> {debugInfo.expectedRedirectURI || 'Loading...'}</p>
            <p><strong>Current Origin:</strong> {window.location.origin}</p>
          </div>
        </div>

        {/* Login Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Login Actions</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            {!session ? (
              <>
                <button
                  onClick={handleSpotifyLogin}
                  disabled={loading}
                  className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Login with Spotify (via signIn)'}
                </button>
                
                <button
                  onClick={handleDirectLogin}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg ml-4"
                >
                  Login with Spotify (direct navigation)
                </button>
              </>
            ) : (
              <button
                onClick={() => signOut()}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>

        {/* API Endpoints Test */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API Endpoints</h2>
          <div className="space-y-2">
            <a href="/api/auth/csrf" target="_blank" className="text-blue-600 hover:underline block">
              /api/auth/csrf
            </a>
            <a href="/api/auth/providers" target="_blank" className="text-blue-600 hover:underline block">
              /api/auth/providers
            </a>
            <a href="/api/auth/session" target="_blank" className="text-blue-600 hover:underline block">
              /api/auth/session
            </a>
            <a href="/api/debug/auth-diagnostic" target="_blank" className="text-blue-600 hover:underline block">
              /api/debug/auth-diagnostic
            </a>
            <a href="/api/debug/test-nextauth-init" target="_blank" className="text-blue-600 hover:underline block">
              /api/debug/test-nextauth-init
            </a>
          </div>
        </div>

        {/* Raw Debug Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Raw Debug Info</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs">
            {JSON.stringify({ session, providers, csrfToken, debugInfo }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
