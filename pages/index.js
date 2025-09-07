// pages/index.js - Updated with mixed comparison support
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import EnhancedInputForm from '../components/EnhancedInputForm';

export default function HomePage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  // Handle URL parameters for login feedback
  useEffect(() => {
    const { login, source, user, error: urlError, message } = router.query;

    if (login === 'success' && source === 'spotify') {
      // Fetch display name from session for a personalized greeting
      (async () => {
        try {
          const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
          const me = await res.json().catch(() => ({}));
          const display = me.displayName || me.username || user || 'User';
          setSuccess(`Successfully connected to Spotify! Welcome, ${display}.`);
          // Notify children to re-check auth (race-safe)
          window.dispatchEvent(new Event('spotify-auth-ready'));
        } catch (e) {
          setSuccess(`Successfully connected to Spotify! Welcome, ${user || 'User'}.`);
        } finally {
          router.replace('/', undefined, { shallow: true });
        }
      })();
    }

    if (urlError) {
      const errorMessages = {
        oauth_error: 'Spotify authentication failed. Please try again.',
        missing_code: 'Authentication code missing. Please try again.',
        session_expired: 'Authentication session expired. Please try again.',
        invalid_session: 'Invalid authentication session. Please try again.',
        state_mismatch: 'Security validation failed. Please try again.',
        auth_failed: message ? decodeURIComponent(message) : 'Authentication failed. Please try again.'
      };

      setError(errorMessages[urlError] || 'An error occurred during authentication.');
      router.replace('/', undefined, { shallow: true });
    }
  }, [router.query]);

  const handleFormSubmit = async (formData) => {
    try {
      setError('');
      setSuccess('');

      console.log('Form submission data:', formData);

      // Handle mixed comparison submission
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user1: formData.user1,
          user2: formData.user2,
          user1Service: formData.user1Service,
          user2Service: formData.user2Service,
          period: formData.period || 'overall',
          dataSource: 'mixed'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData.code === 'SPOTIFY_AUTH_REQUIRED') {
          setError('Please connect your Spotify account first.');
          return;
        }

        if (errorData.code === 'TOKEN_REFRESH_FAILED') {
          setError('Your Spotify session has expired. Please reconnect your account.');
          return;
        }

        if (errorData.code === 'SAME_SPOTIFY_USER') {
          setError('Cannot compare the same Spotify user with themselves. Please use Last.fm for one of the users.');
          return;
        }

        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // Navigate to results page with comparison data
      // Use original form values to avoid display name issues
      const params = new URLSearchParams({
        user1: formData.user1,
        user2: formData.user2,
        user1Service: formData.user1Service,
        user2Service: formData.user2Service,
        period: formData.period || 'overall',
        mixedComparison: (data.metadata?.mixedSources || false).toString()
      });

      router.push(`/compare?${params.toString()}`);

    } catch (error) {
      console.error('Form submission error:', error);
      setError(error.message || 'An error occurred. Please try again.');
    }
  };

  return (
    <Layout>
      <div className="py-8">
        {/* Header */}
        <div className="text-center mb-12 fade-in-up">
          <h1 className="text-5xl font-bold gradient-text mb-4">
            LastFriends<span className="text-green-500">.</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Compare music compatibility between Last.fm and Spotify users and discover musical connections
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 fade-in-up">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">⚠</span>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 fade-in-up">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <p className="text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Input Form */}
        <div className="fade-in-up" style={{ animationDelay: '200ms' }}>
          <EnhancedInputForm
            onSubmit={handleFormSubmit}
            onPreviewUser={(userData) => {
              console.log('User preview:', userData);
            }}
          />
        </div>

        {/* Features Section */}
        <div className="mt-16 fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
              Cross-Platform Music Compatibility
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Last.fm vs Last.fm */}
              <div className="card p-6 text-center hover:shadow-lg transition-all duration-300">
                <div className="text-3xl mb-4">🎵</div>
                <h3 className="text-xl font-semibold mb-2">Last.fm vs Last.fm</h3>
                <p className="text-gray-600">
                  Compare listening histories between two Last.fm users to find shared musical interests
                </p>
              </div>

              {/* Mixed Comparisons */}
              <div className="card p-6 text-center hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-red-50 to-green-50">
                <div className="text-3xl mb-4">🎵🎧</div>
                <h3 className="text-xl font-semibold mb-2">Cross-Platform</h3>
                <p className="text-gray-600">
                  Mix and match! Compare a Last.fm user with a Spotify user for cross-platform compatibility
                </p>
              </div>

              {/* Compatibility */}
              <div className="card p-6 text-center hover:shadow-lg transition-all duration-300">
                <div className="text-3xl mb-4">💫</div>
                <h3 className="text-xl font-semibold mb-2">Smart Analysis</h3>
                <p className="text-gray-600">
                  Get detailed compatibility scores and discover new music based on shared tastes
                </p>
              </div>

              {/* Genre Analysis */}
              <div className="card p-6 text-center hover:shadow-lg transition-all duration-300">
                <div className="text-3xl mb-4">🎨</div>
                <h3 className="text-xl font-semibold mb-2">Genre Breakdown</h3>
                <p className="text-gray-600">
                  Explore genre preferences across different platforms and see how they align
                </p>
              </div>

              {/* Recommendations */}
              <div className="card p-6 text-center hover:shadow-lg transition-all duration-300">
                <div className="text-3xl mb-4">✨</div>
                <h3 className="text-xl font-semibold mb-2">Smart Recommendations</h3>
                <p className="text-gray-600">
                  Get personalized music recommendations based on cross-platform compatibility analysis
                </p>
              </div>

              {/* Data Privacy */}
              <div className="card p-6 text-center hover:shadow-lg transition-all duration-300">
                <div className="text-3xl mb-4">🔒</div>
                <h3 className="text-xl font-semibold mb-2">Privacy First</h3>
                <p className="text-gray-600">
                  Your data is processed securely and never stored permanently or shared with third parties
                </p>
              </div>
          </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-16 fade-in-up" style={{ animationDelay: '600ms' }}>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">How It Works</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-gradient-lastfm rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <h3 className="text-lg font-semibold">Choose Your Users</h3>
                <p className="text-gray-600">
                  Select any combination: Last.fm + Last.fm, or Last.fm + Spotify for cross-platform analysis
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 bg-gradient-lastfm rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <h3 className="text-lg font-semibold">Analyze & Compare</h3>
                <p className="text-gray-600">
                  We analyze listening data, top artists, tracks, and genres across different platforms
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 bg-gradient-lastfm rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <h3 className="text-lg font-semibold">Discover Compatibility</h3>
                <p className="text-gray-600">
                  Get compatibility scores, shared interests, and recommendations regardless of platform
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </Layout>
  );
}
