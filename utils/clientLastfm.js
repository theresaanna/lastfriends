// utils/clientLastfm.js - Client-side Last.fm API calls (Standardized)
const LASTFM_API_KEY = process.env.NEXT_PUBLIC_LASTFM_API_KEY;
const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

// Standardized API limits (matching server-side)
const API_LIMITS = {
  ARTISTS: 500,
  TRACKS: 500,
  ALBUMS: 100,
  ENRICHED_ARTISTS: 75
};

export class LastFMError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = 'LastFMError';
  }
}

async function makeLastFMRequest(method, params = {}) {
  if (!LASTFM_API_KEY) {
    console.error('No API key found. NEXT_PUBLIC_LASTFM_API_KEY:', !!process.env.NEXT_PUBLIC_LASTFM_API_KEY);
    throw new LastFMError('Last.fm API key not configured', 'NO_API_KEY');
  }

  const url = new URL(LASTFM_BASE_URL);
  url.searchParams.set('method', method);
  url.searchParams.set('api_key', LASTFM_API_KEY);
  url.searchParams.set('format', 'json');

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value.toString());
    }
  });

  console.log('Making client-side request to:', url.toString());

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HTTP Error response:', errorText.substring(0, 500));
      throw new LastFMError(`HTTP Error: ${response.status}`, 'HTTP_ERROR');
    }

    // Check if we got HTML instead of JSON
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);

    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('Non-JSON response:', textResponse.substring(0, 500));
      throw new LastFMError('Received HTML instead of JSON - possible network redirect', 'INVALID_RESPONSE');
    }

    const data = await response.json();
    console.log('API Response:', data);

    if (data.error) {
      console.error('Last.fm API error:', data);
      throw new LastFMError(data.message || 'Last.fm API error', data.error);
    }

    return data;
  } catch (error) {
    console.error('Fetch error details:', error);
    if (error instanceof LastFMError) {
      throw error;
    }
    throw new LastFMError(`Network error: ${error.message}`, 'NETWORK_ERROR');
  }
}

export async function getUserInfo(username) {
  try {
    const data = await makeLastFMRequest('user.getinfo', { user: username });
    return data.user;
  } catch (error) {
    if (error.code === 6) {
      throw new LastFMError(`User "${username}" not found`, 'USER_NOT_FOUND');
    }
    throw error;
  }
}

export async function getUserTopArtists(username, period = 'overall', limit = API_LIMITS.ARTISTS) {
  const data = await makeLastFMRequest('user.gettopartists', {
    user: username,
    period,
    limit: limit.toString()
  });
  return data.topartists?.artist || [];
}

export async function getUserTopTracks(username, period = 'overall', limit = API_LIMITS.TRACKS) {
  const data = await makeLastFMRequest('user.gettoptracks', {
    user: username,
    period,
    limit: limit.toString()
  });
  return data.toptracks?.track || [];
}

export async function getUserTopAlbums(username, period = 'overall', limit = API_LIMITS.ALBUMS) {
  const data = await makeLastFMRequest('user.gettopalbums', {
    user: username,
    period,
    limit: limit.toString()
  });
  return data.topalbums?.album || [];
}

// New function to get artist info with tags
export async function getArtistInfo(artistName, mbid = null) {
  try {
    const params = mbid ? { mbid } : { artist: artistName };
    const data = await makeLastFMRequest('artist.getinfo', params);
    return data.artist;
  } catch (error) {
    console.warn(`Failed to get artist info for ${artistName}:`, error.message);
    return null;
  }
}

// Enhanced function to get top artists with tags (standardized limits)
export async function getUserTopArtistsWithTags(username, period = 'overall', limit = API_LIMITS.ARTISTS) {
  const artists = await getUserTopArtists(username, period, limit);

  // For performance, only fetch tags for top artists
  const artistsToEnrich = artists.slice(0, Math.min(API_LIMITS.ENRICHED_ARTISTS, artists.length));

  // Batch fetch artist info with rate limiting
  const enrichedArtists = [];
  for (let i = 0; i < artistsToEnrich.length; i++) {
    const artist = artistsToEnrich[i];
    try {
      // Rate limiting: wait 120ms between requests (matching server-side)
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

  // Add remaining artists without tags
  enrichedArtists.push(...artists.slice(artistsToEnrich.length));

  return enrichedArtists;
}

export async function getUserData(username, period = 'overall') {
  try {
    const [userInfo, topArtists, topTracks, topAlbums] = await Promise.all([
      getUserInfo(username),
      getUserTopArtistsWithTags(username, period), // Use enhanced function with standardized limits
      getUserTopTracks(username, period),
      getUserTopAlbums(username, period)
    ]);

    return {
      userInfo,
      topArtists,
      topTracks,
      topAlbums,
      period
    };
  } catch (error) {
    throw error;
  }
}