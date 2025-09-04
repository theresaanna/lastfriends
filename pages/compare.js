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
    if (pct >= 20) return '#10b981'; // emerald-500
    if (pct >= 15) return '#f59e0b'; // amber-500
    if (pct >= 10) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const getGradient = (pct) => {
    if (pct >= 20) return 'from-emerald-400 to-green-500';
    if (pct >= 15) return 'from-yellow-400 to-orange-500';
    if (pct >= 10) return 'from-orange-400 to-red-500';
    return 'from-red-400 to-pink-500';
  };

  return (
    <div className="flex flex-col items-center fade-in-up">
      <div className="relative w-40 h-40">
        <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#e5e7eb"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={getColor(percentage)}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ filter: 'drop-shadow(0 0 8px rgba(217, 35, 35, 0.3))' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-4xl font-bold bg-gradient-to-r ${getGradient(percentage)} bg-clip-text text-transparent`}>
              {percentage}%
            </div>
            <div className="text-sm text-gray-600 font-medium">{level}</div>
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
    <div className={`${isShared ? 'music-card-shared' : 'music-card-unique'} transition-all duration-200 hover:scale-105`}>
      <h4 className="font-semibold text-gray-800 mb-1 text-sm">
        {item.name}
      </h4>
      {type === 'track' && (
        <p className="text-xs text-gray-600 mb-2">by {item.artist}</p>
      )}

      {showPlaycounts && (
        <div className="space-y-1">
          {isShared ? (
            <>
              <div className="flex justify-between text-xs text-gray-600">
                <span className="font-medium">{users.user1.name}:</span>
                <span className="font-medium text-emerald-600">{item.user1Playcount} plays</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span className="font-medium">{users.user2.name}:</span>
                <span className="font-medium text-emerald-600">{item.user2Playcount} plays</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Plays:</span>
              <span className="font-medium text-blue-600">{item.playcount}</span>
            </div>
          )}
        </div>
      )}

      {isShared && (
        <div className="mt-2 flex justify-between text-xs text-gray-500">
          <span>#{item.user1Rank}</span>
          <span>#{item.user2Rank}</span>
        </div>
      )}
    </div>
  );
}

// User profile card
function UserProfile({ user, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="card-elevated p-6 animate-pulse">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
          <div className="space-y-2 text-center w-full">
            <div className="h-6 bg-gray-200 rounded-xl w-32 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-24 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-36 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-6 fade-in-up hover:shadow-lg transition-all duration-300">
      <div className="flex flex-col items-center space-y-4">
        {user.image ? (
          <img
            src={user.image}
            alt={user.name}
            className="w-24 h-24 rounded-full object-cover shadow-soft ring-4 ring-white"
          />
        ) : (
          <div className="w-24 h-24 bg-gradient-lastfm rounded-full flex items-center justify-center shadow-soft ring-4 ring-white">
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
            <p><span className="font-bold gradient-text text-lg">{user.playcount.toLocaleString()}</span> total scrobbles</p>
            <p className="text-xs">{user.artistCount.toLocaleString()} artists • {user.trackCount.toLocaleString()} tracks</p>
          </div>

          <a
            href={user.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-lastfm-red hover:text-lastfm-red-dark text-sm font-semibold transition-colors duration-200"
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
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      icon: '🎵'
    },
    {
      label: 'Shared Tracks',
      value: trackOverlap.stats.sharedCount,
      total: trackOverlap.stats.totalUnique,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: '🎶'
    },
    {
      label: 'Artist Match',
      value: Math.round(compatibility.artistScore * 100) + '%',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      icon: '👥'
    },
    {
      label: 'Track Match',
      value: Math.round(compatibility.trackScore * 100) + '%',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      icon: '🎤'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <div key={index} className={`card p-4 text-center fade-in-up ${stat.bgColor} hover:scale-105 transition-all duration-200`} style={{ animationDelay: `${index * 100}ms` }}>
          <div className="text-2xl mb-2">{stat.icon}</div>
          <div className={`text-2xl font-bold ${stat.color} mb-1`}>
            {stat.value}
          </div>
          <div className="text-sm text-gray-600 font-medium">
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

    if (!router.isReady) {
      return;
    }

    if (!user1 || !user2) {
      const timer = setTimeout(() => {
        router.replace('/');
      }, 1000);
      return () => clearTimeout(timer);
    }

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
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 fade-in-up">
            <h1 className="text-4xl font-bold gradient-text mb-4">Analyzing Music Compatibility</h1>
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 border-4 border-lastfm-red border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600 text-lg">Fetching data from Last.fm and calculating overlaps...</p>
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
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.push('/')}
            className="btn-secondary mb-6"
          >
            ← Back to Search
          </button>

          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center fade-in-up">
            <div className="text-4xl mb-4">😓</div>
            <h3 className="text-xl font-bold text-red-800 mb-2">Oops! Something went wrong</h3>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-lastfm"
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
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'artists', label: 'Artists', icon: '🎵' },
    { id: 'tracks', label: 'Tracks', icon: '🎶' },
    { id: 'recommendations', label: 'Discover', icon: '✨' }
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8 fade-in-up">
          <button
            onClick={() => router.push('/')}
            className="btn-secondary"
          >
            ← New Comparison
          </button>

          <h1 className="text-3xl font-bold gradient-text">Music Compatibility</h1>
          <div></div>
        </div>

        {/* User Profiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <UserProfile user={users.user1} />
          <UserProfile user={users.user2} />
        </div>

        {/* Compatibility Score */}
        <div className="card-elevated p-8 mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 fade-in-up">Overall Compatibility</h2>
          <CompatibilityGauge percentage={compatibility.percentage} level={compatibility.level} />
          <p className="text-gray-600 mt-6 fade-in-up">
            Based on shared artists and tracks from their {analysis.period === 'overall' ? 'all-time' : analysis.period} favorites
          </p>
        </div>

        {/* Stats Overview */}
        <StatsOverview analysis={analysis} />

        {/* Tabs */}
        <div className="card-elevated overflow-hidden fade-in-up">
          <div className="border-b border-gray-100">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-gradient-lastfm text-white border-b-2 border-lastfm-red shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    🤝 Top Shared Artists
                  </h3>
                  {artistOverlap.shared.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🎭</div>
                      <p className="text-gray-600">No shared artists found in top lists</p>
                      <p className="text-sm text-gray-500 mt-2">Very different music tastes!</p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    🎵 Top Shared Tracks
                  </h3>
                  {trackOverlap.shared.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🎪</div>
                      <p className="text-gray-600">No shared tracks found in top lists</p>
                      <p className="text-sm text-gray-500 mt-2">Explore each other's music!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'artists' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    🤝 Shared Artists ({artistOverlap.stats.sharedCount})
                  </h3>
                  {artistOverlap.shared.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {artistOverlap.shared.map((artist, index) => (
                        <MusicCard key={index} item={artist} type="artist" users={users} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🎭</div>
                      <p className="text-gray-600">No shared artists found</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-bold mb-4 text-blue-600">
                      🎨 Unique to {users.user1.name}
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {artistOverlap.uniqueToUser1.slice(0, 15).map((artist, index) => (
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
                    <h3 className="text-lg font-bold mb-4 text-purple-600">
                      🎪 Unique to {users.user2.name}
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {artistOverlap.uniqueToUser2.slice(0, 15).map((artist, index) => (
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
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    🤝 Shared Tracks ({trackOverlap.stats.sharedCount})
                  </h3>
                  {trackOverlap.shared.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {trackOverlap.shared.map((track, index) => (
                        <MusicCard key={index} item={track} type="track" users={users} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🎪</div>
                      <p className="text-gray-600">No shared tracks found</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-bold mb-4 text-blue-600">
                      🎵 Unique to {users.user1.name}
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {trackOverlap.uniqueToUser1.slice(0, 15).map((track, index) => (
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
                    <h3 className="text-lg font-bold mb-4 text-purple-600">
                      🎶 Unique to {users.user2.name}
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {trackOverlap.uniqueToUser2.slice(0, 15).map((track, index) => (
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    ✨ For {users.user1.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Discover music from {users.user2.name}'s favorites
                  </p>
                  <div className="space-y-4">
                    {recommendations.forUser1.map((rec, index) => (
                      <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-400 rounded-xl hover:scale-105 transition-all duration-200">
                        <h4 className="font-semibold text-gray-800 mb-1">{rec.name}</h4>
                        <p className="text-xs text-gray-600 mb-2">{rec.reason}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                            {rec.playcount} plays
                          </span>
                          <span className="text-gray-500">by {users.user2.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    ✨ For {users.user2.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Discover music from {users.user1.name}'s favorites
                  </p>
                  <div className="space-y-4">
                    {recommendations.forUser2.map((rec, index) => (
                      <div key={index} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-400 rounded-xl hover:scale-105 transition-all duration-200">
                        <h4 className="font-semibold text-gray-800 mb-1">{rec.name}</h4>
                        <p className="text-xs text-gray-600 mb-2">{rec.reason}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                            {rec.playcount} plays
                          </span>
                          <span className="text-gray-500">by {users.user1.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with sharing options */}
        <div className="mt-12 text-center fade-in-up">
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">Share Your Results</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Show your friends this music compatibility analysis
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
              }}
              className="btn-lastfm"
            >
              📋 Copy Link to Share
            </button>
          </div>
            <footer className="mt-6">
                <p className="text-sm text-red-800">
                Made by <a href="https://last.fm/user/superexciting">Theresa</a>.
            </p>
            <p className="text-sm text-gray-500">
                Open Source on <a href="https://github.com/theresaanna/lastfriends">Github: theresaanna/lastfriends</a>
            </p>
            </footer>
        </div>
      </div>
    </div>
  );
}