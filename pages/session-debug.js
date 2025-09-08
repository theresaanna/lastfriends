// pages/session-debug.js - Debug page to check session status
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function SessionDebug() {
  const { data: session, status } = useSession();
  const [secureSession, setSecureSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSecureSession() {
      try {
        const res = await fetch('/api/auth/me', { 
          credentials: 'include',
          cache: 'no-store' 
        });
        const data = await res.json();
        setSecureSession(data);
      } catch (err) {
        setSecureSession({ error: err.message });
      } finally {
        setLoading(false);
      }
    }
    checkSecureSession();
  }, [session]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Session Debug</h1>
        
        {/* NextAuth Session */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">NextAuth Session</h2>
          <div className="space-y-2">
            <p><strong>Status:</strong> <span className={`px-2 py-1 rounded text-sm ${
              status === 'authenticated' ? 'bg-green-100 text-green-800' :
              status === 'loading' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>{status}</span></p>
            
            {session && (
              <>
                <p><strong>User Name:</strong> {session.user?.name || 'N/A'}</p>
                <p><strong>User Email:</strong> {session.user?.email || 'N/A'}</p>
                <p><strong>User Image:</strong> {session.user?.image ? '✅ Present' : '❌ Missing'}</p>
                <p><strong>Access Token:</strong> {session.accessToken ? '✅ Present' : '❌ Missing'}</p>
                <p><strong>Session Error:</strong> {session.error || 'None'}</p>
              </>
            )}
          </div>
          
          <details className="mt-4">
            <summary className="cursor-pointer text-blue-600 hover:underline">View Raw Session</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </details>
        </div>

        {/* Secure Session */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Secure Session (/api/auth/me)</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-2">
              <p><strong>Authenticated:</strong> <span className={`px-2 py-1 rounded text-sm ${
                secureSession?.authenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>{secureSession?.authenticated ? 'Yes' : 'No'}</span></p>
              
              {secureSession?.authenticated && (
                <>
                  <p><strong>Data Source:</strong> {secureSession.dataSource}</p>
                  <p><strong>Display Name:</strong> {secureSession.displayName || 'N/A'}</p>
                  <p><strong>Username:</strong> {secureSession.username || 'N/A'}</p>
                  <p><strong>Email:</strong> {secureSession.email || 'N/A'}</p>
                </>
              )}
              
              {secureSession?.error && (
                <p className="text-red-600"><strong>Error:</strong> {secureSession.error}</p>
              )}
            </div>
          )}
          
          <details className="mt-4">
            <summary className="cursor-pointer text-blue-600 hover:underline">View Raw Response</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
              {JSON.stringify(secureSession, null, 2)}
            </pre>
          </details>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-x-4">
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Go to Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
