// utils/lastfm.js - Server-side Last.fm API calls
const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

export class LastFMError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = 'LastFMError';
  }
}

async function makeLastFMRequest(method, params = {}) {
  // Read API key dynamically from process.env each time
  const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

  // Debug logging
  console.log('🔍 makeLastFMRequest - API key check:', LASTFM_API_KEY ? 'Present' : 'Missing');
  console.log('🔍 process.env.LASTFM_API_KEY:', process.env.LASTFM_API_KEY ? 'Present' : 'Missing');

  // Check if API key is available
  if (!LASTFM_API_KEY) {
    console.error('❌ No API key found in makeLastFMRequest');
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

export async function getUserTopArtists(username, period = 'overall', limit = 50) {
  const data = await makeLastFMRequest('user.gettopartists', {
    user: username,
    period,
    limit: limit.toString()
  });
  return data.topartists?.artist || [];
}

export async function getUserTopTracks(username, period = 'overall', limit = 50) {
  const data = await makeLastFMRequest('user.gettoptracks', {
    user: username,
    period,
    limit: limit.toString()
  });
  return data.toptracks?.track || [];
}

// New function to get tracks with pagination support
export async function getUserTopTracksWithPagination(username, period = 'overall', page = 1, limit = 200) {
  const data = await makeLastFMRequest('user.gettoptracks', {
    user: username,
    period,
    limit: limit.toString(),
    page: page.toString()
  });
  return data.toptracks?.track || [];
}

export async function getUserTopAlbums(username, period = 'overall', limit = 50) {
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

export async function getUserData(username, period = 'overall') {
  try {
    const [userInfo, topArtists, topTracks, topAlbums] = await Promise.all([
      getUserInfo(username),
      getUserTopArtists(username, period, 100),
      getUserTopTracks(username, period, 100),
      getUserTopAlbums(username, period, 50)
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