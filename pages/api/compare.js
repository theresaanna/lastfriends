// pages/api/compare.js - Enhanced with Progressive Genre Loading
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

// Enhanced cache with longer TTL for full comparisons
const getCachedComparison = withCache(async (user1, user2, period) => {
  console.log(`Starting enhanced comparison for ${user1} vs ${user2} (${period})`);

  // Fetch data for both users
  const [user1Data, user2Data] = await Promise.all([
    getUserData(user1, period),
    getUserData(user2, period)
  ]);

  console.log(`Fetched ${user1Data.topArtists.length} artists for ${user1}, ${user2Data.topArtists.length} for ${user2}`);

  // Progressive genre extraction - first get basic data, then enrich
  const user1BasicGenres = extractBasicGenresFromArtists(user1Data.topArtists);
  const user2BasicGenres = extractBasicGenresFromArtists(user2Data.topArtists);

  // Enrich artists with tags for better genre analysis
  const [user1ArtistsWithTags, user2ArtistsWithTags] = await Promise.all([
    enrichArtistsWithTags(user1Data.topArtists, 75), // Increased from 30
    enrichArtistsWithTags(user2Data.topArtists, 75)
  ]);

  // Calculate overlaps with enhanced data
  const artistOverlap = calculateArtistOverlap(
    user1Data.topArtists,
    user2Data.topArtists
  );

  const trackOverlap = calculateTrackOverlap(
    user1Data.topTracks,
    user2Data.topTracks
  );

  // Extract enhanced genres from enriched artist data
  const user1EnhancedGenres = extractGenresFromTags(user1ArtistsWithTags);
  const user2EnhancedGenres = extractGenresFromTags(user2ArtistsWithTags);

  // Fallback to basic genres if enhanced extraction fails
  const user1Genres = user1EnhancedGenres.length > 0 ? user1EnhancedGenres : user1BasicGenres;
  const user2Genres = user2EnhancedGenres.length > 0 ? user2EnhancedGenres : user2BasicGenres;

  const genreOverlap = calculateGenreOverlap(user1Genres, user2Genres);

  // Generate recommendations
  const recommendations = generateRecommendations(user1Data, user2Data, 10);

  // Calculate overall compatibility
  const compatibility = calculateOverallCompatibility(artistOverlap, trackOverlap);

  console.log(`Analysis complete: ${artistOverlap.stats.sharedCount} shared artists, ${trackOverlap.stats.sharedCount} shared tracks`);

  return {
    user1Data,
    user2Data,
    user1Genres,
    user2Genres,
    artistOverlap,
    trackOverlap,
    genreOverlap,
    recommendations,
    compatibility,
    metadata: {
      user1ArtistsEnriched: user1ArtistsWithTags.filter(a => a.tags).length,
      user2ArtistsEnriched: user2ArtistsWithTags.filter(a => a.tags).length,
      totalArtistsFetched: user1Data.topArtists.length + user2Data.topArtists.length
    }
  };
}, 'fullComparison', 900); // 15 minutes cache for enhanced comparisons

// Helper function to extract basic genres from artist names (immediate fallback)
function extractBasicGenresFromArtists(artists) {
  const genreKeywords = {
    'Electronic': ['electronic', 'techno', 'house', 'edm', 'synth', 'ambient', 'trance', 'dubstep'],
    'Rock': ['rock', 'metal', 'punk', 'grunge', 'hardcore'],
    'Pop': ['pop', 'mainstream', 'chart'],
    'Hip Hop': ['hip hop', 'rap', 'mc', 'hip-hop'],
    'Jazz': ['jazz', 'blues', 'swing'],
    'Classical': ['classical', 'orchestra', 'symphony', 'opera'],
    'Folk': ['folk', 'acoustic', 'country', 'americana'],
    'Indie': ['indie', 'alternative', 'alt', 'underground'],
    'R&B': ['r&b', 'soul', 'funk', 'rnb'],
    'Reggae': ['reggae', 'ska', 'dub']
  };

  const genreCount = new Map();

  artists.slice(0, 50).forEach(artist => {
    const artistName = artist.name.toLowerCase();
    Object.entries(genreKeywords).forEach(([genre, keywords]) => {
      if (keywords.some(keyword => artistName.includes(keyword))) {
        const count = genreCount.get(genre) || 0;
        genreCount.set(genre, count + (parseInt(artist.playcount) || 0));
      }
    });
  });

  return Array.from(genreCount.entries())
    .map(([name, count]) => ({
      name,
      count,
      isBasic: true
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// Enhanced function to enrich artists with tags (with better error handling)
async function enrichArtistsWithTags(artists, maxArtists = 75) {
  const artistsToEnrich = artists.slice(0, Math.min(maxArtists, artists.length));
  const enrichedArtists = [];
  let successCount = 0;

  console.log(`Enriching ${artistsToEnrich.length} artists with tags...`);

  for (let i = 0; i < artistsToEnrich.length; i++) {
    const artist = artistsToEnrich[i];
    try {
      // Improved rate limiting with jitter
      if (i > 0) {
        const delay = 120 + Math.random() * 50; // 120-170ms with jitter
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const artistInfo = await getArtistInfo(artist.name, artist.mbid);
      enrichedArtists.push({
        ...artist,
        tags: artistInfo?.tags || null,
        bio: artistInfo?.bio?.summary || null
      });

      if (artistInfo?.tags) successCount++;

      // Log progress every 25 artists
      if ((i + 1) % 25 === 0) {
        console.log(`Enriched ${i + 1}/${artistsToEnrich.length} artists (${successCount} with tags)`);
      }
    } catch (error) {
      console.warn(`Failed to enrich artist ${artist.name}:`, error.message);
      enrichedArtists.push(artist);
    }
  }

  // Add remaining artists without tags
  enrichedArtists.push(...artists.slice(artistsToEnrich.length));

  console.log(`Enrichment complete: ${successCount}/${artistsToEnrich.length} artists enriched with tags`);
  return enrichedArtists;
}

export default async function handler(req, res) {
  // Enhanced cache headers
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');

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
    console.log(`Starting enhanced comparison for ${user1} vs ${user2} (${period})`);
    const startTime = Date.now();

    // Use enhanced cached comparison function
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
      compatibility,
      metadata
    } = comparisonResults;

    // Prepare enhanced response
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
          topArtists: user1Data.topArtists.slice(0, 50), // Show more artists in UI
          topTracks: user1Data.topTracks.slice(0, 50),
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
          topArtists: user2Data.topArtists.slice(0, 50),
          topTracks: user2Data.topTracks.slice(0, 50),
          genres: user2Genres
        }
      },
      analysis: {
        period,
        compatibility,
        artistOverlap: {
          ...artistOverlap,
          shared: artistOverlap.shared.slice(0, 50) // Show more shared items
        },
        trackOverlap: {
          ...trackOverlap,
          shared: trackOverlap.shared.slice(0, 50)
        },
        genreOverlap,
        recommendations
      },
      metadata: {
        comparedAt: new Date().toISOString(),
        apiVersion: '1.3',
        processingTime: Date.now() - startTime,
        cached: true,
        enhancedGenres: true,
        ...metadata
      }
    };

    console.log(`Enhanced comparison completed in ${Date.now() - startTime}ms`);
    console.log(`Stats: ${artistOverlap.stats.totalUnique} total unique artists, ${user1Genres.length + user2Genres.length} total genres`);

    res.status(200).json(comparisonData);

  } catch (error) {
    console.error('Enhanced comparison error:', error);

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
      error: 'Failed to fetch user data. Please try again.'
    });
  }
}