// pages/compare.js - Main scaffolding component
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { compareUsers, ApiError } from '../utils/clientApi.js';

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

  // Fetch comparison data from API
  const fetchComparisonData = async (user1, user2, period) => {
    try {
      setLoading(true);
      setError('');

      const comparisonData = await compareUsers(user1, user2, period);
      setData(comparisonData);

      // Check if background jobs were queued
      if (comparisonData.metadata?.backgroundJobsQueued) {
        console.log('Background jobs were queued for enhanced data collection');
        // Note: In a real implementation, you'd get job IDs from the response
        // For now, we'll just show that jobs are running
      }
    } catch (err) {
      console.error('Comparison error:', err);

      if (err instanceof ApiError) {
        if (err.code === 'USER_NOT_FOUND') {
          setError(`One or both users not found. Please check the usernames.`);
        } else if (err.status === 502) {
          setError('Last.fm API is currently unavailable. Please try again later.');
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

  // Error state
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
            <div className="text-4xl mb-4">😔</div>
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

  // Extract data for components
  const { users, analysis } = data;
  const { compatibility, artistOverlap, trackOverlap, recommendations, genreOverlap } = analysis;

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
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
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

        {/* Background Job Progress */}
        {data.metadata?.backgroundJobsQueued && (
          <div className="mb-8">
            <ProgressTracker
              jobId={null} // In a real implementation, you'd pass actual job IDs
              onComplete={() => {
                console.log('Background job completed');
                // Optionally refresh the comparison data
              }}
              onError={(error) => {
                console.error('Background job error:', error);
              }}
            />
          </div>
        )}

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