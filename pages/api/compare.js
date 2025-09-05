// pages/api/compare.js
import { getUserData, getArtistInfo, LastFMError } from '../../utils/lastfm.js';
import {
  calculateArtistOverlap,
  calculateTrackOverlap,
  generateRecommendations,
  calculateOverallCompatibility,
  extractGenresFromTags,
  calculateGenreOverlap
} from '../../utils/overlap.js';
import { withCache } from '../../utils/cache.js';

// Conditional imports for Redis/workers with fallback
let getCachedData, isRedisAvailable, queueTrackCollection;

try {
  const redisModule = await import('../../utils/redis.js');
  getCachedData = redisModule.getCachedData;
  isRedisAvailable = redisModule.isRedisAvailable;
  console.log('Redis utilities loaded successfully');
} catch (error) {
  console.warn('Redis utilities not available:', error.message);
  getCachedData = async () => null;
  isRedisAvailable = async () => false;
}

try {
  const queueModule = await import('../../utils/jobQueue.js');
  queueTrackCollection = queueModule.queueTrackCollection;
  console.log('Job queue utilities loaded successfully');
} catch (error) {
  console.warn('Job queue utilities not available:', error.message);
  queueTrackCollection = async () => null;
}

// Cache the entire comparison result for faster subsequent requests
const getCachedComparison = withCache(async (user1, user2, period) => {
  // Fetch data for both users
  const [user1Data, user2Data] = await Promise.all([
    getUserData(user1, period),
    getUserData(user2, period)
  ]);

  // Enrich artists with tags for genre extraction
  const [user1ArtistsWithTags, user2ArtistsWithTags] = await Promise.all([
    enrichArtistsWithTags(user1Data.topArtists),
    enrichArtistsWithTags(user2Data.topArtists)
  ]);

  // Calculate overlaps
  const artistOverlap = calculateArtistOverlap(
    user1Data.topArtists,
    user2Data.topArtists
  );

  const trackOverlap = calculateTrackOverlap(
    user1Data.topTracks,
    user2Data.topTracks
  );

  // Extract genres from enriched artist data
  const user1Genres = extractGenresFromTags(user1ArtistsWithTags);
  const user2Genres = extractGenresFromTags(user2ArtistsWithTags);
  const genreOverlap = calculateGenreOverlap(user1Genres, user2Genres);

  // Generate recommendations
  const recommendations = generateRecommendations(user1Data, user2Data, 10);

  // Calculate overall compatibility
  const compatibility = calculateOverallCompatibility(artistOverlap, trackOverlap);

  return {
    user1Data,
    user2Data,
    user1Genres,
    user2Genres,
    artistOverlap,
    trackOverlap,
    genreOverlap,
    recommendations,
    compatibility
  };
}, 'fullComparison', 600); // 10 minutes cache for full comparisons

// Helper function to enrich artists with tags
async function enrichArtistsWithTags(artists, maxArtists = 30) {
  const artistsToEnrich = artists.slice(0, Math.min(maxArtists, artists.length));
  const enrichedArtists = [];

  for (let i = 0; i < artistsToEnrich.length; i++) {
    const artist = artistsToEnrich[i];
    try {
      // Rate limiting: wait 100ms between requests
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const artistInfo = await getArtistInfo(artist.name, artist.mbid);
      enrichedArtists.push({
        ...artist,
        tags: artistInfo?.tags || null,
        bio: artistInfo?.bio?.summary || null
      });
    } catch (error) {
      console.warn(`Failed to enrich artist ${artist.name}:`, error.message);
      enrichedArtists.push(artist);
    }
  }

  // Add remaining artists without tags
  enrichedArtists.push(...artists.slice(artistsToEnrich.length));

  return enrichedArtists;
}

export default async function handler(req, res) {
  // Add cache headers
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user1, user2, period = 'overall' } = req.body;

  if (!user1 || !user2) {
    return res.status(400).json({
      error: 'Both user1 and user2 usernames are required'
    });
  }

  if (user1.toLowerCase() === user2.toLowerCase()) {
    return res.status(400).json({
      error: 'Please provide two different usernames'
    });
  }

  try {
    console.log(`COMPARE API: Starting comparison for ${user1} vs ${user2} (${period})`);
    const startTime = Date.now();

    // Check if workers are available
    let workersAvailable = false;
    let backgroundJobsQueued = false;

    try {
      workersAvailable = await isRedisAvailable();
      console.log('COMPARE API: Workers available:', workersAvailable);
    } catch (error) {
      console.warn('COMPARE API: Error checking Redis availability:', error.message);
      workersAvailable = false;
    }

    if (workersAvailable) {
      // Try to get enhanced data from cache first
      const user1CacheKey = `user_full_data:${user1}:${period}`;
      const user2CacheKey = `user_full_data:${user2}:${period}`;

      console.log('COMPARE API: Looking for cached data with keys:', user1CacheKey, user2CacheKey);

      const [user1CachedData, user2CachedData] = await Promise.all([
        getCachedData(user1CacheKey),
        getCachedData(user2CacheKey)
      ]);

      console.log('COMPARE API: Cache results:', {
        user1: user1CachedData ? `Found (${user1CachedData.tracks?.length || 0} tracks)` : 'Not found',
        user2: user2CachedData ? `Found (${user2CachedData.tracks?.length || 0} tracks)` : 'Not found'
      });

      // Only use cached data if it actually has meaningful track data
      const user1HasValidCache = user1CachedData && user1CachedData.tracks && user1CachedData.tracks.length > 100;
      const user2HasValidCache = user2CachedData && user2CachedData.tracks && user2CachedData.tracks.length > 100;

      console.log('COMPARE API: Valid cache check:', {
        user1: user1HasValidCache ? 'Valid' : 'Invalid/Empty',
        user2: user2HasValidCache ? 'Valid' : 'Invalid/Empty'
      });

      // Queue background jobs for users without cached data
      if (!user1HasValidCache) {
        try {
          await queueTrackCollection(user1, period, 'high');
          backgroundJobsQueued = true;
          console.log(`COMPARE API: Queued background collection for ${user1}`);
        } catch (error) {
          console.warn(`COMPARE API: Failed to queue job for ${user1}:`, error.message);
        }
      }

      if (!user2HasValidCache) {
        try {
          await queueTrackCollection(user2, period, 'high');
          backgroundJobsQueued = true;
          console.log(`COMPARE API: Queued background collection for ${user2}`);
        } catch (error) {
          console.warn(`COMPARE API: Failed to queue job for ${user2}:`, error.message);
        }
      }

      // If we have cached data for both users, use it
      if (user1HasValidCache && user2HasValidCache) {
        console.log('COMPARE API: Using cached enhanced data for both users');
        return await processComparisonWithCachedData(res, user1CachedData, user2CachedData, period, startTime);
      } else if (user1HasValidCache || user2HasValidCache) {
        console.log('COMPARE API: Partial enhanced data available - mixing cached and fresh data');
        // Use enhanced data for the user that has it, fresh data for the other
        const freshUser1Data = user1HasValidCache ? null : await getUserData(user1, period);
        const freshUser2Data = user2HasValidCache ? null : await getUserData(user2, period);

        return await processComparisonWithCachedData(
          res,
          user1HasValidCache ? user1CachedData : freshUser1Data,
          user2HasValidCache ? user2CachedData : freshUser2Data,
          period,
          startTime
        );
      }
    }

    // Fallback to original processing
    console.log('COMPARE API: Using fallback processing (original method)');

    // Use cached comparison function
    const comparisonResults = await getCachedComparison(user1, user2, period);

    const {
      user1Data,
      user2Data,
      user1Genres,
      user2Genres,
      artistOverlap,
      trackOverlap,
      genreOverlap,
      recommendations,
      compatibility
    } = comparisonResults;

    // Prepare response
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
          topTracks: user1Data.topTracks.slice(0, 20),
          genres: user1Genres
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
          topTracks: user2Data.topTracks.slice(0, 20),
          genres: user2Genres
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
        genreOverlap,
        recommendations
      },
      metadata: {
        comparedAt: new Date().toISOString(),
        apiVersion: '1.3',
        processingTime: Date.now() - startTime,
        cached: true,
        backgroundJobsQueued,
        dataSource: 'fallback',
        workersAvailable
      }
    };

    console.log(`COMPARE API: Comparison completed in ${Date.now() - startTime}ms`);
    res.status(200).json(comparisonData);

  } catch (error) {
    console.error('COMPARE API: Comparison error:', error);
    console.error('COMPARE API: Error stack:', error.stack);

    if (error instanceof LastFMError) {
      if (error.code === 'NO_API_KEY') {
        return res.status(500).json({
          error: 'Last.fm API key not configured. Please check server configuration.',
          code: error.code
        });
      }
      if (error.code === 'HTTP_ERROR' || error.code === 'INVALID_RESPONSE') {
        return res.status(502).json({
          error: 'Last.fm API is currently unavailable. Please try again later.',
          code: error.code
        });
      }
      if (error.code === 'USER_NOT_FOUND') {
        return res.status(404).json({
          error: 'One or both users not found. Please check the usernames.',
          code: error.code
        });
      }
      return res.status(400).json({
        error: error.message,
        code: error.code
      });
    }

    res.status(500).json({
      error: 'Failed to fetch user data. Please try again.',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Process comparison using cached enhanced data
async function processComparisonWithCachedData(res, user1Data, user2Data, period, startTime) {
  console.log('COMPARE API: Processing enhanced comparison data');
  console.log('COMPARE API: User1 tracks available:', (user1Data.tracks || user1Data.topTracks || []).length);
  console.log('COMPARE API: User2 tracks available:', (user2Data.tracks || user2Data.topTracks || []).length);

  // Extract genres from enriched artist data
  const user1Genres = extractGenresFromTags(user1Data.topArtists || []);
  const user2Genres = extractGenresFromTags(user2Data.topArtists || []);

  // Calculate overlaps using enhanced data
  const artistOverlap = calculateArtistOverlap(
    user1Data.topArtists || [],
    user2Data.topArtists || []
  );

  console.log('COMPARE API: Artist overlap calculated:', artistOverlap.stats);

  const trackOverlap = calculateTrackOverlap(
    user1Data.tracks || user1Data.topTracks || [],
    user2Data.tracks || user2Data.topTracks || []
  );

  console.log('COMPARE API: Track overlap calculated:', trackOverlap.stats);

  const genreOverlap = calculateGenreOverlap(user1Genres, user2Genres);
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
        topArtists: (user1Data.topArtists || []).slice(0, 20),
        topTracks: (user1Data.tracks || user1Data.topTracks || []).slice(0, 20),
        genres: user1Genres
      },
      user2: {
        name: user2Data.userInfo.name,
        realname: user2Data.userInfo.realname || '',
        playcount: parseInt(user2Data.userInfo.playcount) || 0,
        artistCount: parseInt(user2Data.userInfo.artist_count) || 0,
        trackCount: parseInt(user2Data.userInfo.track_count) || 0,
        url: user2Data.userInfo.url,
        image: user2Data.userInfo.image?.[2]?.['#text'] || '',
        topArtists: (user2Data.topArtists || []).slice(0, 20),
        topTracks: (user2Data.tracks || user2Data.topTracks || []).slice(0, 20),
        genres: user2Genres
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
      genreOverlap,
      recommendations
    },
    metadata: {
      comparedAt: new Date().toISOString(),
      apiVersion: '1.3',
      processingTime: Date.now() - startTime,
      cached: true,
      backgroundJobsQueued: false,
      dataSource: 'enhanced',
      tracksAnalyzed: {
        user1: (user1Data.tracks || user1Data.topTracks || []).length,
        user2: (user2Data.tracks || user2Data.topTracks || []).length
      }
    }
  };

  console.log(`COMPARE API: Enhanced comparison completed in ${Date.now() - startTime}ms`);
  res.status(200).json(comparisonData);
}