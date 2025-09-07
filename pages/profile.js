// pages/profile.js - User profile page powered by /api/auth/me
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

export default function ProfilePage() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (mounted) setMe(data);
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <Layout>
      <div className="py-8">
        <div className="grid grid-cols-3 items-center mb-8 fade-in-up">
          <div className="justify-self-start">
            <button onClick={() => history.back()} className="btn-secondary">← Back</button>
          </div>
          <h1 className="text-3xl font-bold gradient-text text-center">Your Profile</h1>
          <div className="justify-self-end" />
        </div>

        {loading && (
          <div className="max-w-md mx-auto card-elevated p-6 animate-pulse text-center">
            <div className="w-24 h-24 mx-auto bg-gray-200 rounded-full mb-4" />
            <div className="h-6 bg-gray-200 rounded-xl w-40 mx-auto mb-2" />
            <div className="h-4 bg-gray-200 rounded-lg w-56 mx-auto" />
          </div>
        )}

        {!loading && error && (
          <div className="max-w-xl mx-auto bg-red-50 border border-red-200 rounded-2xl p-6 text-center fade-in-up">
            <div className="text-4xl mb-4">😔</div>
            <h3 className="text-xl font-bold text-red-800 mb-2">Unable to load profile</h3>
            <p className="text-red-600 mb-6">{error}</p>
            <button onClick={() => (window.location.href = '/')} className="btn-secondary">Go Home</button>
          </div>
        )}

        {!loading && !error && me && (
          <div className="max-w-2xl mx-auto card-elevated p-6 fade-in-up">
            <div className="flex items-center gap-4">
              {Array.isArray(me.images) && me.images[0] ? (
                <img src={me.images[0]} alt={me.displayName || me.username || 'User'} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl font-bold">
                  {(me.displayName || me.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{me.displayName || me.username || 'User'}</h2>
                {me.email && <p className="text-gray-600 text-sm">{me.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-xs text-gray-500">Data Source</div>
                <div className="font-semibold">{me.dataSource || 'Unknown'}</div>
              </div>
              {me.country && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500">Country</div>
                  <div className="font-semibold">{me.country}</div>
                </div>
              )}
              {typeof me.followers === 'number' && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500">Followers</div>
                  <div className="font-semibold">{me.followers.toLocaleString()}</div>
                </div>
              )}
              {me.product && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500">Spotify Plan</div>
                  <div className="font-semibold capitalize">{me.product}</div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {me.spotifyId && (
                <a
                  href={`https://open.spotify.com/user/${me.spotifyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Open Spotify Profile →
                </a>
              )}
              <button onClick={() => (window.location.href = '/')} className="btn-secondary">Home</button>
            </div>

            <div className="mt-8 text-xs text-gray-500">
              <div>Session created: {me.sessionCreated || 'N/A'}</div>
              <div>Last accessed: {me.lastAccessed || 'N/A'}</div>
              {me.tokenExpires && <div>Token expires: {me.tokenExpires}</div>}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

