// pages/spotify-analysis.js - Complete Spotify analysis page
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { UserProfile } from '../components/MusicCards.js';

export default function SpotifyAnalysisPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  useEffect(() => {
    const { period } = router.query;

    if (!router.isReady) {
      return;
    }

    fetchSpotifyAnalysis(period || 'overall');
  }, [router.isReady, router.query]);

  const fetchSpotifyAnalysis = async (period) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user1: 'me',
          user2: 'me',
          period,
          dataSource: 'spotify'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData.code === 'SPOTIFY_AUTH_REQUIRED') {
          setError('Please connect your Spotify account first.');
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        if (errorData.code === 'TOKEN_REFRESH_FAILED') {
          setError('Your Spotify session has expired. Please reconnect your account.');
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const analysisData = await response.json();
      setData(analysisData);
    } catch (err) {
      console.error('Spotify analysis error:', err);
      setError(err.message || 'Failed to fetch Spotify analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="py-8">
          <div className="text-center mb-8 fade-in-up">
            <h1 className="text-4xl font-bold gradient-text mb-4">Analyzing Your Spotify Data</h1>
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600 text-lg">Fetching your top artists, tracks, and analyzing your music taste...</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8 max-w-md mx-auto">
            <UserProfile user={{}} isLoading={true} />
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className="py-8">
          <button
            onClick={() => router.push('/')}
            className="btn-secondary mb-6"
          >
            ← Back to Home
          </button>

          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center fade-in-up">
            <div className="text-4xl mb-4">😔</div>
            <h3 className="text-xl font-bold text-red-800 mb-2">Analysis Failed</h3>
            <p className="text-red-600 mb-6">{error}</p>
            <div className="space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="btn-lastfm"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/')}
                className="btn-secondary"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) return null;

  // Extract data for display
  const { users, analysis } = data;
  const user = users.user1; // For Spotify, user1 and user2 are the same

  // Tab configuration for Spotify analysis
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'artists', label: 'Top Artists', icon: '🎵' },
    { id: 'tracks', label: 'Top Tracks', icon: '🎶' },
    { id: 'genres', label: 'Genres', icon: '🎨' },
    { id: 'insights', label: 'Insights', icon: '💡' }
  ];

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <SpotifyOverviewTab user={user} analysis={analysis} />;
      case 'artists':
        return <SpotifyArtistsTab artists={user.topArtists} />;
      case 'tracks':
        return <SpotifyTracksTab tracks={user.topTracks} />;
      case 'genres':
        return <SpotifyGenresTab genres={user.genres} />;
      case 'insights':
        return <SpotifyInsightsTab user={user} analysis={analysis} />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="py-8">
        {/* Header */}
        <div className="grid grid-cols-3 items-center mb-8 fade-in-up">
          <div className="justify-self-start">
            <button
              onClick={() => router.push('/')}
              className="btn-secondary"
            >
              ← New Analysis
            </button>
          </div>

          <h1 className="text-3xl font-bold gradient-text text-center">Your Spotify Music Analysis</h1>
          <div className="justify-self-end"></div>
        </div>

        {/* User Profile */}
        <div className="max-w-md mx-auto mb-8">
          <UserProfile user={user} />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4 text-center bg-green-50">
            <div className="text-2xl font-bold text-green-600">{user.topArtists.length}</div>
            <div className="text-sm text-gray-600">Top Artists</div>
          </div>
          <div className="card p-4 text-center bg-blue-50">
            <div className="text-2xl font-bold text-blue-600">{user.topTracks.length}</div>
            <div className="text-sm text-gray-600">Top Tracks</div>
          </div>
          <div className="card p-4 text-center bg-purple-50">
            <div className="text-2xl font-bold text-purple-600">{user.genres.length}</div>
            <div className="text-sm text-gray-600">Genres</div>
          </div>
          <div className="card p-4 text-center bg-orange-50">
            <div className="text-2xl font-bold text-orange-600">{user.followers}</div>
            <div className="text-sm text-gray-600">Followers</div>
          </div>
        </div>

        {/* Tabs Container */}
        <div className="card-elevated overflow-hidden fade-in-up">
          {/* Tab Navigation */}
          <div className="border-b border-gray-100">
            <nav className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-green-500 text-white border-b-2 border-green-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center fade-in-up">
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">Share Your Analysis</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Show your friends your Spotify music analysis
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
              }}
              className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              📋 Copy Link to Share
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Spotify Overview Tab
const SpotifyOverviewTab = ({ user, analysis }) => {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold mb-4">🎵 Your Top Artists</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {user.topArtists.slice(0, 6).map((artist, index) => (
            <div key={index} className="card p-4 hover:shadow-lg transition-all">
              <div className="flex items-center space-x-3">
                {artist.image && (
                  <img src={artist.image} alt={artist.name} className="w-12 h-12 rounded-full object-cover" />
                )}
                <div>
                  <h4 className="font-semibold text-gray-800">{artist.name}</h4>
                  <p className="text-sm text-gray-600">#{artist.rank} • {artist.popularity}% popularity</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4">🎶 Your Top Tracks</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {user.topTracks.slice(0, 6).map((track, index) => (
            <div key={index} className="card p-4 hover:shadow-lg transition-all">
              <div className="flex items-center space-x-3">
                {track.album?.image && (
                  <img src={track.album.image} alt={track.name} className="w-12 h-12 rounded object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-gray-800 truncate">{track.name}</h4>
                  <p className="text-sm text-gray-600 truncate">by {track.artist.name}</p>
                  <p className="text-xs text-gray-500">#{track.rank}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Spotify Artists Tab
const SpotifyArtistsTab = ({ artists }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">🎵 All Your Top Artists</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {artists.map((artist, index) => (
          <div key={index} className="card p-4 hover:shadow-lg transition-all">
            <div className="flex items-center space-x-4">
              {artist.image && (
                <img src={artist.image} alt={artist.name} className="w-16 h-16 rounded-full object-cover" />
              )}
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800">{artist.name}</h4>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                  <span>#{artist.rank}</span>
                  <span>{artist.popularity}% popularity</span>
                  <span>{artist.followers?.toLocaleString()} followers</span>
                </div>
                {artist.genres && artist.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {artist.genres.slice(0, 3).map((genre, i) => (
                      <span key={i} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Spotify Tracks Tab
const SpotifyTracksTab = ({ tracks }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">🎶 All Your Top Tracks</h3>
      <div className="space-y-3">
        {tracks.map((track, index) => (
          <div key={index} className="card p-4 hover:shadow-lg transition-all">
            <div className="flex items-center space-x-4">
              {track.album?.image && (
                <img src={track.album.image} alt={track.name} className="w-16 h-16 rounded object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-800 truncate">{track.name}</h4>
                <p className="text-gray-600 truncate">by {track.artist.name}</p>
                <p className="text-sm text-gray-500">
                  from {track.album?.name || 'Unknown Album'}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                  <span>#{track.rank}</span>
                  <span>{track.popularity}% popularity</span>
                  <span>{Math.floor(track.duration / 60000)}:{String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0')}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Spotify Genres Tab
const SpotifyGenresTab = ({ genres }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">🎨 Your Music Genres</h3>
        <p className="text-gray-600">
          Based on your top artists' genre classifications
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {genres.map((genre, index) => (
          <div key={index} className="card p-4 text-center hover:shadow-lg transition-all">
            <h4 className="font-semibold text-gray-800 mb-2">{genre.name}</h4>
            <div className="text-2xl font-bold text-green-600">{genre.count}</div>
            <div className="text-sm text-gray-500">popularity score</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Spotify Insights Tab
const SpotifyInsightsTab = ({ user, analysis }) => {
  const topGenres = user.genres.slice(0, 3);
  const totalPopularity = user.topArtists.reduce((sum, artist) => sum + artist.popularity, 0);
  const avgPopularity = Math.round(totalPopularity / user.topArtists.length);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">💡 Your Music Insights</h3>
        <p className="text-gray-600">
          Discover patterns in your listening habits
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-6">
          <h4 className="text-lg font-semibold mb-4">🎯 Music Profile</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Average Artist Popularity:</span>
              <span className="font-semibold">{avgPopularity}%</span>
            </div>
            <div className="flex justify-between">
              <span>Music Discovery:</span>
              <span className="font-semibold">
                {avgPopularity > 70 ? 'Mainstream' : avgPopularity > 40 ? 'Balanced' : 'Underground'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Genre Diversity:</span>
              <span className="font-semibold">{user.genres.length} genres</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h4 className="text-lg font-semibold mb-4">🏆 Top Genres</h4>
          <div className="space-y-3">
            {topGenres.map((genre, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="font-medium">{genre.name}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(genre.count / topGenres[0].count) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">{genre.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h4 className="text-lg font-semibold mb-4">📊 Analysis Summary</h4>
        <div className="prose max-w-none text-gray-600">
          <p className="mb-4">
            Based on your Spotify listening data from the selected time period, here's what we discovered about your music taste:
          </p>
          <ul className="space-y-2">
            <li>
              <strong>Music Style:</strong> Your taste leans toward {avgPopularity > 70 ? 'popular mainstream artists' : avgPopularity > 40 ? 'a mix of popular and emerging artists' : 'underground and emerging artists'}.
            </li>
            <li>
              <strong>Genre Preferences:</strong> You enjoy {user.genres.length > 10 ? 'a very diverse range' : user.genres.length > 5 ? 'a good variety' : 'a focused selection'} of genres, with {topGenres[0]?.name || 'unknown'} being your most prominent.
            </li>
            <li>
              <strong>Artist Following:</strong> You follow {user.topArtists.length} top artists, showing {user.topArtists.length > 40 ? 'broad' : user.topArtists.length > 20 ? 'moderate' : 'focused'} musical interests.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};