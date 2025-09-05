// utils/lastfm.js - Server-side Last.fm API calls
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

// Standardized API limits
const API_LIMITS = {
  ARTISTS: 500,
  TRACKS: 500,
  ALBUMS: 100,
  ENRICHED_ARTISTS: 75 // Increased for better genre data
};

export class LastFMError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = 'LastFMError';
  }
}

async function makeLastFMRequest(method, params = {}) {
  // Check if API key is available
  if (!LASTFM_API_KEY) {
    throw new LastFMError('Last.fm API key not configured', 'NO_API_KEY');
  }

  const url = new URL(LASTFM_BASE_URL);
  url.searchParams.set('method', method);
  url.searchParams.set('api_key', LASTFM_API_KEY);
  url.searchParams.set('format', 'json');

  // Add any additional parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value.toString());
    }
  });

  console.log('Making request to:', url.toString());

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Check if response is OK
    if (!response.ok) {
      const errorText = await response.text();
      console.error('HTTP Error response:', errorText.substring(0, 500));
      throw new LastFMError(`HTTP Error: ${response.status} ${response.statusText}`, 'HTTP_ERROR');
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);

    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('Non-JSON response:', textResponse.substring(0, 500));
      throw new LastFMError('Last.fm API returned invalid response format', 'INVALID_RESPONSE');
    }

    const data = await response.json();

    if (data.error) {
      console.error('Last.fm API error:', data);
      throw new LastFMError(data.message, data.error);
    }

    return data;
  } catch (fetchError) {
    console.error('Fetch error:', fetchError);
    if (fetchError instanceof LastFMError) {
      throw fetchError;
    }
    throw new LastFMError(`Network error: ${fetchError.message}`, 'NETWORK_ERROR');
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

// Enhanced function to get artist info with tags and better error handling
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

// Progressive genre extraction function
export async function getUserTopArtistsWithGenres(username, period = 'overall', progressCallback = null) {
  try {
    // First, get all artists
    const allArtists = await getUserTopArtists(username, period);

    // Send basic data immediately if callback provided
    if (progressCallback) {
      progressCallback({
        type: 'artists_loaded',
        artists: allArtists,
        basicGenres: extractBasicGenres(allArtists)
      });
    }

    // Then progressively enrich with tags
    const artistsToEnrich = allArtists.slice(0, Math.min(API_LIMITS.ENRICHED_ARTISTS, allArtists.length));
    const enrichedArtists = [];

    for (let i = 0; i < artistsToEnrich.length; i++) {
      const artist = artistsToEnrich[i];
      try {
        // Rate limiting: wait 120ms between requests for better reliability
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 120));
        }

        const artistInfo = await getArtistInfo(artist.name, artist.mbid);
        const enrichedArtist = {
          ...artist,
          tags: artistInfo?.tags || null,
          bio: artistInfo?.bio?.summary || null
        };
        enrichedArtists.push(enrichedArtist);

        // Send progress updates every 10 artists
        if (progressCallback && (i + 1) % 10 === 0) {
          progressCallback({
            type: 'enrichment_progress',
            processed: i + 1,
            total: artistsToEnrich.length,
            enrichedArtists: [...enrichedArtists, ...allArtists.slice(enrichedArtists.length)]
          });
        }
      } catch (error) {
        console.warn(`Failed to enrich artist ${artist.name}:`, error.message);
        enrichedArtists.push(artist);
      }
    }

    // Add remaining artists without tags
    const finalArtists = [...enrichedArtists, ...allArtists.slice(artistsToEnrich.length)];

    // Send final update
    if (progressCallback) {
      progressCallback({
        type: 'enrichment_complete',
        artists: finalArtists,
        enrichedCount: enrichedArtists.length
      });
    }

    return finalArtists;
  } catch (error) {
    console.error('Error in getUserTopArtistsWithGenres:', error);
    throw error;
  }
}

// Fallback genre extraction from artist names (for immediate display)
function extractBasicGenres(artists) {
  // Basic genre mapping for common artist patterns
  const genreKeywords = {
    'electronic': ['electronic', 'synth', 'techno', 'house', 'ambient', 'edm'],
    'rock': ['rock', 'metal', 'punk', 'grunge'],
    'pop': ['pop', 'mainstream'],
    'hip hop': ['hip', 'hop', 'rap', 'mc'],
    'jazz': ['jazz', 'blues'],
    'classical': ['orchestra', 'symphony', 'classical'],
    'folk': ['folk', 'acoustic', 'country'],
    'indie': ['indie', 'alternative', 'alt']
  };

  const genreCount = new Map();

  // This is a very basic fallback - real genres will come from API tags
  artists.slice(0, 20).forEach(artist => {
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
      name: name.charAt(0).toUpperCase() + name.slice(1),
      count,
      isBasic: true // Flag to indicate this is fallback data
    }))
    .sort((a, b) => b.count - a.count);
}

export async function getUserData(username, period = 'overall') {
  try {
    const [userInfo, topArtists, topTracks, topAlbums] = await Promise.all([
      getUserInfo(username),
      getUserTopArtists(username, period),
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

// Export cache stats and clear functions (for the cache monitor)
import { cache } from './cache.js';

export function getCacheStats() {
  return cache.getStats();
}

export function clearCache() {
  cache.clear();
}