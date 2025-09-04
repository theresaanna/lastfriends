// pages/api/compare.js
import { getUserData, getArtistInfo, LastFMError } from '../../utils/lastfm';
import {
  calculateArtistOverlap,
  calculateTrackOverlap,
  generateRecommendations,
  calculateOverallCompatibility,
  extractGenresFromTags,
  calculateGenreOverlap
} from '../../utils/overlap';

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

    // Prepare word cloud data
    const wordCloudData = {
      artists: [
        ...user1Data.topArtists.slice(0, 30).map(artist => ({
          text: artist.name,
          value: parseInt(artist.playcount) || 0,
          user: user1
        })),
        ...user2Data.topArtists.slice(0, 30).map(artist => ({
          text: artist.name,
          value: parseInt(artist.playcount) || 0,
          user: user2
        }))
      ].sort((a, b) => b.value - a.value).slice(0, 40),
      genres: [
        ...user1Genres.slice(0, 20).map(genre => ({
          text: genre.name,
          value: genre.count,
          user: user1
        })),
        ...user2Genres.slice(0, 20).map(genre => ({
          text: genre.name,
          value: genre.count,
          user: user2
        }))
      ].sort((a, b) => b.value - a.value).slice(0, 30)
    };

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
        apiVersion: '1.1'
      }
    };

    res.status(200).json(comparisonData);

  } catch (error) {
    console.error('Comparison error:', error);

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