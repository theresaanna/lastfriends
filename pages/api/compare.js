// pages/api/compare.js - Enhanced with mixed comparison support
import { getUserData as getLastFMUserData, getArtistInfo, LastFMError } from '../../utils/lastfm.js';
import { SpotifyDataAPI, SpotifyError } from '../../utils/spotify.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { getToken } from 'next-auth/jwt';
import {
  calculateArtistOverlap,
  calculateTrackOverlap,
  generateRecommendations,
  calculateOverallCompatibility,
  extractGenresFromTags,
  calculateGenreOverlap
} from '../../utils/overlap.js';
import { withCache } from '../../utils/cache.js';

// Enhanced cache with support for mixed data sources  
const getCachedComparison = withCache(async (user1, user2, period, user1Service, user2Service, spotifyUserId) => {
  console.log(`Starting mixed comparison: ${user1} (${user1Service}) vs ${user2} (${user2Service}), period: ${period}, spotifyUserId: ${spotifyUserId}`);

  // Fetch data based on source type (we'll get accessToken fresh each time)
  const session = global.currentSession; // We'll set this in the main handler
  const accessToken = session?.tokens?.accessToken;
  
  const [user1Data, user2Data] = await Promise.all([
    fetchUserDataBySource(user1, period, user1Service, user1Service === 'spotify' ? accessToken : null),
    fetchUserDataBySource(user2, period, user2Service, user2Service === 'spotify' ? accessToken : null)
  ]);

  console.log(`Fetched ${user1Data.topArtists.length} artists for ${user1}, ${user2Data.topArtists.length} for ${user2}`);

  // Extract genres based on data source
  const user1Genres = user1Service === 'spotify'
    ? SpotifyDataAPI.extractGenresFromSpotifyData(user1Data.topArtists)
    : await extractLastFMGenres(user1Data.topArtists);

  const user2Genres = user2Service === 'spotify'
    ? SpotifyDataAPI.extractGenresFromSpotifyData(user2Data.topArtists)
    : await extractLastFMGenres(user2Data.topArtists);

  // Calculate overlaps
  const artistOverlap = calculateArtistOverlap(user1Data.topArtists, user2Data.topArtists);
  const trackOverlap = calculateTrackOverlap(user1Data.topTracks, user2Data.topTracks);
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
      user1Service,
      user2Service,
      mixedSources: user1Service !== user2Service,
      dataSource: user1Service === user2Service ? user1Service : 'mixed',
      cacheSource: 'hybrid'
    }
  };
}, 'mixedComparison', 1800);

// Helper function to fetch user data based on source
async function fetchUserDataBySource(username, period, source, accessToken = null) {
  if (source === 'spotify') {
    if (!accessToken) {
      throw new SpotifyError('Spotify access token required', 'NO_TOKEN');
    }
    // Note: For Spotify, we can only fetch data for the logged-in user (token owner)
    // The username parameter is ignored as Spotify API uses the access token
    const userData = await SpotifyDataAPI.getUserData(accessToken, period);
    console.log('Spotify user data fetched:', {
      name: userData.userInfo?.name,
      id: userData.userInfo?.id,
      displayName: userData.userInfo?.displayName
    });
    return userData;
  } else {
    // Default to Last.fm
    return await getLastFMUserData(username, period);
  }
}

// Helper function to extract Last.fm genres (existing logic)
async function extractLastFMGenres(artists) {
  const artistsToEnrich = artists.slice(0, Math.min(75, artists.length));
  const enrichedArtists = [];

  for (let i = 0; i < artistsToEnrich.length; i++) {
    const artist = artistsToEnrich[i];
    try {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 120));
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

  return extractGenresFromTags(enrichedArtists);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let {
    user1,
    user2,
    period = 'overall',
    user1Service = 'lastfm',
    user2Service = 'lastfm'
  } = req.body;

  if (!user1 || !user2) {
    return res.status(400).json({
      error: 'Both user1 and user2 are required'
    });
  }

  // Prevent comparing the same Spotify user with themselves
  if (user1Service === 'spotify' && user2Service === 'spotify') {
    return res.status(400).json({
      error: 'Cannot compare the same Spotify user with themselves. Please use Last.fm for one of the users.',
      code: 'SAME_SPOTIFY_USER'
    });
  }

  try {
    console.log(`Starting comparison for ${user1} (${user1Service}) vs ${user2} (${user2Service}) (${period})`);
    const startTime = Date.now();

    // Get session for Spotify access token if needed
    let session = await getSessionFromRequest(req);
    console.log('[Compare API] Secure session check:', {
      hasSession: !!session,
      hasTokens: !!session?.tokens,
      hasAccessToken: !!session?.tokens?.accessToken
    });
    
    // If no secure session, try NextAuth session as fallback
    let nextAuthToken = null;
    if (!session || !session.tokens?.accessToken) {
      console.log('[Compare API] No secure session, checking NextAuth...');
      nextAuthToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      console.log('[Compare API] NextAuth token check:', {
        hasToken: !!nextAuthToken,
        hasAccessToken: !!nextAuthToken?.accessToken,
        hasRefreshToken: !!nextAuthToken?.refreshToken,
        tokenExpires: nextAuthToken?.accessTokenExpires,
        email: nextAuthToken?.email,
        name: nextAuthToken?.name
      });
      
      if (nextAuthToken?.accessToken) {
        console.log('[Compare API] Using NextAuth token for Spotify');
        // Create a temporary session-like object from NextAuth token
        session = {
          dataSource: 'spotify',
          username: nextAuthToken.email || nextAuthToken.name,
          displayName: nextAuthToken.name,
          email: nextAuthToken.email,
          tokens: {
            accessToken: nextAuthToken.accessToken,
            refreshToken: nextAuthToken.refreshToken,
            expiresAt: nextAuthToken.accessTokenExpires
          }
        };
      } else {
        console.log('[Compare API] No NextAuth token available either');
      }
    }
    
    console.log('Session data in compare API:', {
      source: session ? (nextAuthToken ? 'nextauth' : 'secure-session') : 'none',
      username: session?.username,
      spotifyId: session?.spotifyId,
      displayName: session?.displayName,
      email: session?.email,
      hasTokens: !!session?.tokens?.accessToken,
      tokenPreview: session?.tokens?.accessToken?.substring(0, 20) + '...'
    });
    let accessToken = null;

    // Check if Spotify authentication is needed
    if (user1Service === 'spotify' || user2Service === 'spotify') {
      if (!session || !session.tokens?.accessToken) {
        return res.status(401).json({
          error: 'Spotify authentication required for Spotify comparisons',
          code: 'SPOTIFY_AUTH_REQUIRED'
        });
      }

      // Check if token needs refresh
      let currentSpotifyUserId = null;
      try {
        const refreshedTokens = await SpotifyDataAPI.refreshTokenIfNeeded(session.tokens);
        accessToken = refreshedTokens.accessToken;
        
        // DEBUG: Verify whose account this token belongs to
        const currentUserProfile = await SpotifyDataAPI.getUserInfo(accessToken);
        currentSpotifyUserId = currentUserProfile?.id || null;
        console.log('Current Spotify user profile from token:', {
          id: currentUserProfile.id,
          name: currentUserProfile.name,
          realname: currentUserProfile.realname
        });
      } catch (error) {
        return res.status(401).json({
          error: 'Spotify token refresh failed. Please log in again.',
          code: 'TOKEN_REFRESH_FAILED'
        });
      }

      // For Spotify users, we'll get the actual username from the session
      // The frontend should now send the actual username, but we keep this as fallback
      if (user1Service === 'spotify' && (user1 === 'me' || !user1)) {
        user1 = session.username || session.spotifyId || 'spotify_user';
      }
      if (user2Service === 'spotify' && (user2 === 'me' || !user2)) {
        user2 = session.username || session.spotifyId || 'spotify_user';
      }
    }

    // Use enhanced cached comparison function
    const spotifyUserId = (typeof currentSpotifyUserId !== 'undefined' && currentSpotifyUserId) 
      ? currentSpotifyUserId 
      : (session?.spotifyId || session?.username || 'anonymous');
    global.currentSession = session; // Set for the cached function to use
    const comparisonResults = await getCachedComparison(
      user1, user2, period, user1Service, user2Service, spotifyUserId
    );

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

    // Prepare response data
    const comparisonData = {
      users: {
        user1: formatUserData(user1Data, user1Genres, user1Service),
        user2: formatUserData(user2Data, user2Genres, user2Service)
      },
      analysis: {
        period,
        compatibility,
        artistOverlap: {
          ...artistOverlap,
          shared: artistOverlap.shared.slice(0, 50)
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
        apiVersion: '1.7', // Bumped to include correct Spotify /me usage and cache key fix
        processingTime: Date.now() - startTime,
        dataSource: metadata.dataSource,
        mixedSources: metadata.mixedSources,
        user1Service: metadata.user1Service,
        user2Service: metadata.user2Service,
        spotifyEnabled: true,
        mixedComparison: true,
        ...metadata
      }
    };

    console.log(`Mixed comparison completed in ${Date.now() - startTime}ms`);
    console.log(`Stats: ${artistOverlap.stats.totalUnique} total unique artists, ${user1Genres.length + user2Genres.length} total genres`);

    res.status(200).json(comparisonData);

  } catch (error) {
    console.error('Mixed comparison error:', error);

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
          error: 'Last.fm user not found. Please check the username.',
          code: error.code
        });
      }
      return res.status(400).json({
        error: error.message,
        code: error.code
      });
    }

    if (error instanceof SpotifyError) {
      if (error.code === 'TOKEN_EXPIRED' || error.code === 'NO_TOKEN') {
        return res.status(401).json({
          error: 'Spotify authentication expired. Please log in again.',
          code: error.code
        });
      }
      if (error.code === 'USER_NOT_FOUND') {
        return res.status(404).json({
          error: 'Spotify user not found or profile is private.',
          code: error.code
        });
      }
      if (error.code === 'FORBIDDEN') {
        return res.status(403).json({
          error: 'Insufficient Spotify permissions. Please re-authorize.',
          code: error.code
        });
      }
      return res.status(error.status || 400).json({
        error: error.message,
        code: error.code
      });
    }

    res.status(500).json({
      error: 'Failed to fetch user data. Please try again.'
    });
  }
}

// Helper function to format user data consistently
function formatUserData(userData, genres, service) {
  // Normalize image by service
  let imageUrl = '';
  if (service === 'lastfm') {
    const imgs = userData?.userInfo?.image;
    if (Array.isArray(imgs)) {
      const preference = ['mega', 'extralarge', 'large', 'medium', 'small'];
      for (const size of preference) {
        const match = imgs.find(i => (i?.size === size) && i?.['#text']);
        if (match && match['#text']) { imageUrl = match['#text']; break; }
      }
      if (!imageUrl) {
        const nonEmpty = imgs.map(i => i?.['#text']).filter(Boolean);
        imageUrl = nonEmpty.length > 0 ? nonEmpty[nonEmpty.length - 1] : '';
      }
    } else if (typeof imgs === 'string') {
      imageUrl = imgs;
    }
  } else {
    imageUrl = userData?.userInfo?.image || '';
  }

  return {
    name: userData.userInfo.name,
    realname: userData.userInfo.realname || '',
    playcount: parseInt(userData.userInfo.playcount) || 0,
    // Prefer derived counts from fetched lists; fallback to any provided totals
    artistCount: (Array.isArray(userData.topArtists) && userData.topArtists.length > 0)
      ? userData.topArtists.length
      : (parseInt(userData.userInfo.artistCount) || 0),
    trackCount: (Array.isArray(userData.topTracks) && userData.topTracks.length > 0)
      ? userData.topTracks.length
      : (parseInt(userData.userInfo.trackCount) || 0),
    url: userData.userInfo.url,
    image: imageUrl,
    topArtists: userData.topArtists.slice(0, 50),
    topTracks: userData.topTracks.slice(0, 50),
    genres: genres,
    dataSource: service,
    // Service-specific fields
    followers: userData.userInfo.followers || 0,
    country: userData.userInfo.country || '',
    product: userData.userInfo.product || ''
  };
}
