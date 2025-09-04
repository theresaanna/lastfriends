import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getUserData, LastFMError } from '../utils/clientLastfm';
import {
  calculateArtistOverlap,
  calculateTrackOverlap,
  generateRecommendations,
  calculateOverallCompatibility
} from '../utils/overlap';

// Compatibility gauge component
function CompatibilityGauge({ percentage, level }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (pct) => {
    if (pct >= 20) return '#22c55e'; // green
    if (pct >= 15) return '#eab308'; // yellow
    if (pct >= 10) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={getColor(percentage)}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{percentage}%</div>
            <div className="text-xs text-gray-600">{level}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Artist/Track card component
function MusicCard({ item, type, users, showPlaycounts = true }) {
  const isShared = item.user1Playcount !== undefined;

  return (
    <div className={`p-4 rounded-lg border-l-4 ${
      isShared ? 'border-l-green-500 bg-green-50' : 'border-l-blue-500 bg-blue-50'
    }`}>
      <h4 className="font-semibold text-gray-800 mb-1">
        {item.name}
      </h4>
      {type === 'track' && (
        <p className="text-sm text-gray-600 mb-2">by {item.artist}</p>
      )}

      {showPlaycounts && (
        <div className="space-y-1">
          {isShared ? (
            <>
              <div className="flex justify-between text-xs text-gray-600">
                <span>{users.user1.name}:</span>
                <span className="font-medium">{item.user1Playcount} plays</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>{users.user2.name}:</span>
                <span className="font-medium">{item.user2Playcount} plays</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Plays:</span>
              <span className="font-medium">{item.playcount}</span>
            </div>
          )}
        </div>
      )}

      {isShared && (
        <div className="mt-2 flex justify-between text-xs text-gray-500">
          <span>Rank: #{item.user1Rank}</span>
          <span>Rank: #{item.user2Rank}</span>
        </div>
      )}
    </div>
  );
}

// User profile card
function UserProfile({ user, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 border animate-pulse">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 bg-gray-300 rounded-full"></div>
          <div className="space-y-2 text-center">
            <div className="h-6 bg-gray-300 rounded w-32"></div>
            <div className="h-4 bg-gray-300 rounded w-24"></div>
            <div className="h-4 bg-gray-300 rounded w-36"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 border shadow-sm">
      <div className="flex flex-col items-center space-y-4">
        {user.image ? (
          <img
            src={user.image}
            alt={user.name}
            className="w-20 h-20 rounded-full object-cover"
          />
        ) : (
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-800">{user.name}</h3>
          {user.realname && (
            <p className="text-gray-600 text-sm">{user.realname}</p>
          )}

          <div className="mt-3 space-y-1 text-sm text-gray-600">
            <p><span className="font-semibold text-red-600">{user.playcount.toLocaleString()}</span> total scrobbles</p>
            <p>{user.artistCount.toLocaleString()} artists • {user.trackCount.toLocaleString()} tracks</p>
          </div>

          <a
            href={user.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-red-600 hover:text-red-700 text-sm font-medium"
          >
            View on Last.fm →
          </a>
        </div>
      </div>
    </div>
  );
}

// Stats overview component
function StatsOverview({ analysis }) {
  const { artistOverlap, trackOverlap, compatibility } = analysis;

  const stats = [
    {
      label: 'Shared Artists',
      value: artistOverlap.stats.sharedCount,
      total: artistOverlap.stats.totalUnique,
      color: 'text-green-600'
    },
    {
      label: 'Shared Tracks',
      value: trackOverlap.stats.sharedCount,
      total: trackOverlap.stats.totalUnique,
      color: 'text-blue-600'
    },
    {
      label: 'Artist Compatibility',
      value: Math.round(compatibility.artistScore * 100) + '%',
      color: 'text-purple-600'
    },
    {
      label: 'Track Compatibility',
      value: Math.round(compatibility.trackScore * 100) + '%',
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-lg p-4 border shadow-sm text-center">
          <div className={`text-2xl font-bold ${stat.color}`}>
            {stat.value}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {stat.label}
          </div>
          {stat.total && (
            <div className="text-xs text-gray-500 mt-1">
              of {stat.total} total
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ComparePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  useEffect(() => {
    const { user1, user2, period } = router.query;

    // Don't do anything if router isn't ready
    if (!router.isReady) {
      return;
    }

    // If we're missing users, wait a bit before redirecting to avoid loops
    if (!user1 || !user2) {
      console.log('Missing URL parameters - user1:', user1, 'user2:', user2);
      const timer = setTimeout(() => {
        router.replace('/');
      }, 1000);
      return () => clearTimeout(timer);
    }

    console.log('Starting comparison for:', user1, 'vs', user2);
    fetchComparisonData(user1, user2, period || 'overall');
  }, [router.isReady, router.query]);

  const fetchComparisonData = async (user1, user2, period) => {
    try {
      setLoading(true);
      setError('');

      const [user1Data, user2Data] = await Promise.all([
        getUserData(user1, period),
        getUserData(user2, period)
      ]);

      const artistOverlap = calculateArtistOverlap(
        user1Data.topArtists,
        user2Data.topArtists
      );

      const trackOverlap = calculateTrackOverlap(
        user1Data.topTracks,
        user2Data.topTracks
      );

      const recommendations = generateRecommendations(user1Data, user2Data, 10);
      const compatibility = calculateOverallCompatibility(artistOverlap, trackOverlap);

      const comparisonData = {
        users: {
          user1: {
            name: user1Data.userInfo.name,
            realname: user1Data.userInfo.realname || '',
            playcount: parseInt(user1Data.userInfo.playcount) || 0,
            artistCount: parseInt(user1Data.userInfo.artist_count) || 0,
            trackCount: parseInt(user1Data.userInfo.track_count) || 0,
            url: user1Data.userInfo.url,
            image: user1Data.userInfo.image?.[2]?.['#text'] || '',
            topArtists: user1Data.topArtists.slice(0, 20),
            topTracks: user1Data.topTracks.slice(0, 20)
          },
          user2: {
            name: user2Data.userInfo.name,
            realname: user2Data.userInfo.realname || '',
            playcount: parseInt(user2Data.userInfo.playcount) || 0,
            artistCount: parseInt(user2Data.userInfo.artist_count) || 0,
            trackCount: parseInt(user2Data.userInfo.track_count) || 0,
            url: user2Data.userInfo.url,
            image: user2Data.userInfo.image?.[2]?.['#text'] || '',
            topArtists: user2Data.topArtists.slice(0, 20),
            topTracks: user2Data.topTracks.slice(0, 20)
          }
        },
        analysis: {
          period,
          compatibility,
          artistOverlap: {
            ...artistOverlap,
            shared: artistOverlap.shared.slice(0, 20)
          },
          trackOverlap: {
            ...trackOverlap,
            shared: trackOverlap.shared.slice(0, 20)
          },
          recommendations
        }
      };

      setData(comparisonData);
    } catch (err) {
      console.error('Comparison error:', err);

      if (err instanceof LastFMError) {
        if (err.code === 'USER_NOT_FOUND') {
          setError(`One or both users not found. Please check the usernames.`);
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to fetch user data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Analyzing Music Compatibility</h1>
            <div className="flex justify-center mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
            <p className="text-gray-600">Fetching data from Last.fm and calculating overlaps...</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <UserProfile user={{}} isLoading={true} />
            <UserProfile user={{}} isLoading={true} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.push('/')}
            className="mb-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            ← Back to Search
          </button>

          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { users, analysis } = data;
  const { compatibility, artistOverlap, trackOverlap, recommendations } = analysis;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'artists', label: 'Artists' },
    { id: 'tracks', label: 'Tracks' },
    { id: 'recommendations', label: 'Recommendations' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            ← New Comparison
          </button>

          <h1 className="text-3xl font-bold text-gray-900">Music Compatibility</h1>
          <div></div>
        </div>

        {/* User Profiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <UserProfile user={users.user1} />
          <UserProfile user={users.user2} />
        </div>

        {/* Compatibility Score */}
        <div className="bg-white rounded-lg p-8 mb-8 border shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Overall Compatibility</h2>
            <CompatibilityGauge percentage={compatibility.percentage} level={compatibility.level} />
            <p className="text-gray-600 mt-4">
              Based on shared artists and tracks from their {analysis.period === 'overall' ? 'all-time' : analysis.period} favorites
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="mb-8">
          <StatsOverview analysis={analysis} />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-red-50 text-red-700 border-b-2 border-red-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Top Shared Artists</h3>
                  {artistOverlap.shared.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {artistOverlap.shared.slice(0, 6).map((artist, index) => (
                        <MusicCard
                          key={index}
                          item={artist}
                          type="artist"
                          users={users}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-center py-8">No shared artists found in top lists.</p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Top Shared Tracks</h3>
                  {trackOverlap.shared.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {trackOverlap.shared.slice(0, 6).map((track, index) => (
                        <MusicCard
                          key={index}
                          item={track}
                          type="track"
                          users={users}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-center py-8">No shared tracks found in top lists.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'artists' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Shared Artists ({artistOverlap.stats.sharedCount})
                  </h3>
                  {artistOverlap.shared.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {artistOverlap.shared.map((artist, index) => (
                        <MusicCard key={index} item={artist} type="artist" users={users} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-center py-8">No shared artists found.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Unique to {users.user1.name}
                    </h3>
                    <div className="space-y-3">
                      {artistOverlap.uniqueToUser1.slice(0, 10).map((artist, index) => (
                        <MusicCard
                          key={index}
                          item={artist}
                          type="artist"
                          users={users}
                          showPlaycounts={true}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Unique to {users.user2.name}
                    </h3>
                    <div className="space-y-3">
                      {artistOverlap.uniqueToUser2.slice(0, 10).map((artist, index) => (
                        <MusicCard
                          key={index}
                          item={artist}
                          type="artist"
                          users={users}
                          showPlaycounts={true}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tracks' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Shared Tracks ({trackOverlap.stats.sharedCount})
                  </h3>
                  {trackOverlap.shared.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {trackOverlap.shared.map((track, index) => (
                        <MusicCard key={index} item={track} type="track" users={users} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-center py-8">No shared tracks found.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Unique to {users.user1.name}
                    </h3>
                    <div className="space-y-3">
                      {trackOverlap.uniqueToUser1.slice(0, 10).map((track, index) => (
                        <MusicCard
                          key={index}
                          item={track}
                          type="track"
                          users={users}
                          showPlaycounts={true}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Unique to {users.user2.name}
                    </h3>
                    <div className="space-y-3">
                      {trackOverlap.uniqueToUser2.slice(0, 10).map((track, index) => (
                        <MusicCard
                          key={index}
                          item={track}
                          type="track"
                          users={users}
                          showPlaycounts={true}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'recommendations' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Recommendations for {users.user1.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Based on {users.user2.name}'s top artists
                  </p>
                  <div className="space-y-3">
                    {recommendations.forUser1.map((rec, index) => (
                      <div key={index} className="p-3 bg-blue-50 border-l-4 border-l-blue-500 rounded">
                        <h4 className="font-medium text-gray-800">{rec.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{rec.reason}</p>
                        <p className="text-xs text-blue-600 mt-1">{rec.playcount} plays by {users.user2.name}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Recommendations for {users.user2.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Based on {users.user1.name}'s top artists
                  </p>
                  <div className="space-y-3">
                    {recommendations.forUser2.map((rec, index) => (
                      <div key={index} className="p-3 bg-green-50 border-l-4 border-l-green-500 rounded">
                        <h4 className="font-medium text-gray-800">{rec.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{rec.reason}</p>
                        <p className="text-xs text-green-600 mt-1">{rec.playcount} plays by {users.user1.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with sharing options */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <p className="text-sm text-gray-600 mb-3">
              Share this comparison with others
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Copy Link to Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}