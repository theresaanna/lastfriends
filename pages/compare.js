// pages/compare.js - Main comparison page component
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { compareUsers, ApiError } from '../utils/clientApi.js';
import Layout from '../components/Layout';

// Import all component modules
import { CompatibilityGauge } from '../components/CompatibilityGauge.js';
import { UserProfile } from '../components/MusicCards.js';
import { StatsOverview } from '../components/StatsOverview.js';
import { ProgressTracker } from '../components/ProgressTracker.js';
import {
  OverviewTab,
  ArtistsTab,
  TracksTab,
  GenreTab,
  RecommendationsTab
} from '../components/TabContent.js';

export default function ComparePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [backgroundJobs, setBackgroundJobs] = useState([]);
  const router = useRouter();

  // Effect to handle route changes and fetch data
  useEffect(() => {
    const {
      user1,
      user2,
      period,
      limit,
      user1Service,
      user2Service,
      mixedComparison
    } = router.query;

    if (!router.isReady) {
      return;
    }

    if (!user1 || !user2) {
      const timer = setTimeout(() => {
        router.replace('/');
      }, 1000);
      return () => clearTimeout(timer);
    }

    fetchComparisonData({
      user1,
      user2,
      period: period || 'overall',
      limit,
      user1Service: user1Service || 'lastfm',
      user2Service: user2Service || 'lastfm',
      mixedComparison: mixedComparison === 'true'
    });
  }, [router.isReady, router.query]);

  // Fetch comparison data from API
  const fetchComparisonData = async (params) => {
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
          user1: params.user1,
          user2: params.user2,
          user1Service: params.user1Service,
          user2Service: params.user2Service,
          period: params.period,
          dataSource: 'mixed'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code || 'HTTP_ERROR',
          response.status
        );
      }

      const comparisonData = await response.json();
      setData(comparisonData);

      // Check if background jobs were queued
      if (comparisonData.metadata?.backgroundJobsQueued) {
        console.log('Background jobs were queued for enhanced data collection');
      }
    } catch (err) {
      console.error('Comparison error:', err);

      if (err instanceof ApiError) {
        if (err.code === 'USER_NOT_FOUND') {
          setError(`One or both users not found. Please check the usernames.`);
        } else if (err.code === 'SPOTIFY_AUTH_REQUIRED') {
          setError('Spotify authentication is required for this comparison. Please connect your Spotify account.');
        } else if (err.code === 'TOKEN_REFRESH_FAILED') {
          setError('Your Spotify session has expired. Please reconnect your account.');
        } else if (err.status === 502) {
          setError('Music service API is currently unavailable. Please try again later.');
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

  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="py-8">
          <div className="text-center mb-8 fade-in-up">
            <h1 className="text-4xl font-bold gradient-text mb-4">Analyzing Music Compatibility</h1>
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 border-4 border-lastfm-red border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600 text-lg">Fetching data and calculating overlaps...</p>
            <p className="text-gray-600 text-md">(This might take a minute or two.)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <UserProfile user={{}} isLoading={true} />
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
            ← Back to Search
          </button>

          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center fade-in-up">
            <div className="text-4xl mb-4">😔</div>
            <h3 className="text-xl font-bold text-red-800 mb-2">Oops! Something went wrong</h3>
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
                Start New Comparison
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) return null;

  // Extract data for components
  const { users, analysis, metadata } = data;
  const { compatibility, artistOverlap, trackOverlap, recommendations, genreOverlap } = analysis;

  // Determine if this is a mixed comparison
  const isMixedComparison = metadata?.mixedSources || false;
  const user1Service = metadata?.user1Service || 'lastfm';
  const user2Service = metadata?.user2Service || 'lastfm';

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'artists', label: 'Artists', icon: '🎵' },
    { id: 'tracks', label: 'Tracks', icon: '🎶' },
    { id: 'genres', label: 'Genres', icon: '🎨' },
    { id: 'recommendations', label: 'Discover', icon: '✨' }
  ];

  // Create overlapping genres set for highlighting
  const overlappingGenres = new Set(
    genreOverlap?.shared?.map(genre => genre.name.toLowerCase()) || []
  );

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab artistOverlap={artistOverlap} trackOverlap={trackOverlap} users={users} />;
      case 'artists':
        return <ArtistsTab artistOverlap={artistOverlap} users={users} />;
      case 'tracks':
        return <TracksTab trackOverlap={trackOverlap} users={users} />;
      case 'genres':
        return <GenreTab users={users} overlappingGenres={overlappingGenres} />;
      case 'recommendations':
        return <RecommendationsTab recommendations={recommendations} users={users} />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 fade-in-up">
          <button
            onClick={() => router.push('/')}
            className="btn-secondary"
          >
            ← New Comparison
          </button>

          <div className="text-center">
            <h1 className="text-3xl font-bold gradient-text">Music Compatibility</h1>
            {isMixedComparison && (
              <p className="text-sm text-gray-600 mt-1">
                Cross-platform comparison: {user1Service} vs {user2Service}
              </p>
            )}
          </div>
          <div></div>
        </div>

        {/* User Profiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="relative">
            <UserProfile user={users.user1} />
            <div className={`absolute top-2 right-2 text-white text-xs px-2 py-1 rounded-full ${
              user1Service === 'spotify' ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {user1Service === 'spotify' ? 'Spotify' : 'Last.fm'}
            </div>
          </div>
          <div className="relative">
            <UserProfile user={users.user2} />
            <div className={`absolute top-2 right-2 text-white text-xs px-2 py-1 rounded-full ${
              user2Service === 'spotify' ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {user2Service === 'spotify' ? 'Spotify' : 'Last.fm'}
            </div>
          </div>
        </div>

        {/* Background Job Progress */}
        {data.metadata?.backgroundJobsQueued && (
          <div className="mb-8">
            <ProgressTracker
              jobId={null}
              onComplete={() => {
                console.log('Background job completed');
              }}
              onError={(error) => {
                console.error('Background job error:', error);
              }}
            />
          </div>
        )}

        {/* Compatibility Score */}
        <div className="card-elevated p-8 mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 fade-in-up">
            {isMixedComparison ? 'Cross-Platform Compatibility' : 'Overall Compatibility'}
          </h2>
          <CompatibilityGauge
            percentage={compatibility.percentage}
            level={compatibility.level}
            isEnhanced={metadata?.dataSource === 'enhanced'}
          />
          <p className="text-gray-600 mt-6 fade-in-up">
            Based on shared artists and tracks from their {analysis.period === 'overall' ? 'all-time' : analysis.period} favorites
            {isMixedComparison && (
              <span className="block text-sm mt-2 text-blue-600">
                Comparing {user1Service} data with {user2Service} data
              </span>
            )}
          </p>
        </div>

        {/* Stats Overview */}
        <StatsOverview analysis={analysis} metadata={metadata} />

        {/* Cross-platform Notice */}
        {isMixedComparison && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 fade-in-up">
            <div className="flex items-center space-x-2">
              <span className="text-blue-600 text-lg">🔄</span>
              <div>
                <h4 className="font-semibold text-blue-800">Cross-Platform Comparison</h4>
                <p className="text-sm text-blue-600">
                  This comparison bridges {user1Service === 'lastfm' ? 'Last.fm' : 'Spotify'} and {user2Service === 'lastfm' ? 'Last.fm' : 'Spotify'} data.
                  Some differences may exist due to platform-specific data collection methods.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs Container */}
        <div className="card-elevated overflow-hidden fade-in-up">
          {/* Tab Navigation */}
          <div className="border-b border-gray-100">
            <nav className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap relative ${
                    activeTab === tab.id
                      ? 'bg-gradient-lastfm text-white border-b-2 border-lastfm-red shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                  {tab.enhanced && (
                    <div className="w-2 h-2 bg-green-400 rounded-full ml-1" title="Enhanced data available"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>

        {/* Footer with sharing options */}
        <div className="mt-12 text-center fade-in-up">
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">Share Your Results</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Show your friends this {isMixedComparison ? 'cross-platform ' : ''}music compatibility analysis
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
    </Layout>
  );
}