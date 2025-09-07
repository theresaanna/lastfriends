// utils/spotify.js - Spotify API data fetching utilities

export class SpotifyError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'SpotifyError';
  }
}

export class SpotifyDataAPI {
  static async makeSpotifyRequest(endpoint, accessToken, options = {}) {
    const { method = 'GET', params = {} } = options;

    const url = new URL(`https://api.spotify.com/v1${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value.toString());
      }
    });

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new SpotifyError('Access token expired or invalid', 'TOKEN_EXPIRED', 401);
        }
        if (response.status === 403) {
          throw new SpotifyError('Insufficient permissions', 'FORBIDDEN', 403);
        }
        if (response.status === 404) {
          throw new SpotifyError('User not found or profile private', 'USER_NOT_FOUND', 404);
        }
        throw new SpotifyError(`HTTP ${response.status}: ${response.statusText}`, 'HTTP_ERROR', response.status);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof SpotifyError) {
        throw error;
      }
      throw new SpotifyError(`Network error: ${error.message}`, 'NETWORK_ERROR', 0);
    }
  }

  // Get user profile information
  static async getUserInfo(accessToken, userId = 'me') {
    // Correct endpoint: use /me for the current authenticated user
    const endpoint = userId === 'me' ? '/me' : `/users/${userId}`;
    const data = await this.makeSpotifyRequest(endpoint, accessToken);

    return {
      id: data.id,
      name: data.display_name || data.id,
      realname: data.display_name || '',
      url: data.external_urls?.spotify || '',
      image: data.images?.[0]?.url || '',
      followers: data.followers?.total || 0,
      country: data.country || '',
      product: data.product || 'free',
      // Add fields to match Last.fm structure
      playcount: 0, // Spotify doesn't provide total play count
      artistCount: 0, // We'll calculate this
      trackCount: 0, // We'll calculate this
    };
  }

  // Get user's top artists
  static async getUserTopArtists(accessToken, timeRange = 'medium_term', limit = 50) {
    // Spotify time ranges: short_term (4 weeks), medium_term (6 months), long_term (several years)
    const params = {
      time_range: timeRange,
      limit: Math.min(limit, 50), // Spotify max is 50 per request
      offset: 0
    };

    const allArtists = [];
    let hasMore = true;
    let totalRequests = 0;
    const maxRequests = Math.ceil(limit / 50);

    while (hasMore && totalRequests < maxRequests && allArtists.length < limit) {
      const data = await this.makeSpotifyRequest('/me/top/artists', accessToken, { params });

      if (data.items && data.items.length > 0) {
        const artists = data.items.map((artist, index) => ({
          name: artist.name,
          playcount: 0, // Spotify doesn't provide play counts
          mbid: null, // Spotify doesn't use MusicBrainz IDs
          url: artist.external_urls?.spotify || '',
          image: artist.images?.[0]?.url || '',
          genres: artist.genres || [],
          popularity: artist.popularity || 0,
          followers: artist.followers?.total || 0,
          rank: params.offset + index + 1,
          // Additional Spotify-specific data
          spotifyId: artist.id,
          spotifyUri: artist.uri
        }));

        allArtists.push(...artists);

        // Update offset for next request
        params.offset = allArtists.length;

        // Check if we have more data
        hasMore = data.next !== null && allArtists.length < limit;
        totalRequests++;

        // Rate limiting - Spotify allows more requests but let's be conservative
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        hasMore = false;
      }
    }

    return allArtists.slice(0, limit);
  }

  // Get user's top tracks
  static async getUserTopTracks(accessToken, timeRange = 'medium_term', limit = 50) {
    const params = {
      time_range: timeRange,
      limit: Math.min(limit, 50),
      offset: 0
    };

    const allTracks = [];
    let hasMore = true;
    let totalRequests = 0;
    const maxRequests = Math.ceil(limit / 50);

    while (hasMore && totalRequests < maxRequests && allTracks.length < limit) {
      const data = await this.makeSpotifyRequest('/me/top/tracks', accessToken, { params });

      if (data.items && data.items.length > 0) {
        const tracks = data.items.map((track, index) => ({
          name: track.name,
          artist: {
            name: track.artists[0]?.name || 'Unknown Artist',
            mbid: null
          },
          playcount: 0, // Spotify doesn't provide play counts
          mbid: null,
          url: track.external_urls?.spotify || '',
          image: track.album?.images?.[0]?.url || '',
          duration: track.duration_ms,
          popularity: track.popularity || 0,
          explicit: track.explicit || false,
          rank: params.offset + index + 1,
          // Additional Spotify-specific data
          spotifyId: track.id,
          spotifyUri: track.uri,
          album: {
            name: track.album?.name || '',
            image: track.album?.images?.[0]?.url || ''
          }
        }));

        allTracks.push(...tracks);
        params.offset = allTracks.length;
        hasMore = data.next !== null && allTracks.length < limit;
        totalRequests++;

        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        hasMore = false;
      }
    }

    return allTracks.slice(0, limit);
  }

  // Get user's saved albums (as substitute for top albums)
  static async getUserSavedAlbums(accessToken, limit = 50) {
    const params = {
      limit: Math.min(limit, 50),
      offset: 0
    };

    const allAlbums = [];
    let hasMore = true;
    let totalRequests = 0;
    const maxRequests = Math.ceil(limit / 50);

    while (hasMore && totalRequests < maxRequests && allAlbums.length < limit) {
      const data = await this.makeSpotifyRequest('/me/albums', accessToken, { params });

      if (data.items && data.items.length > 0) {
        const albums = data.items.map((item, index) => ({
          name: item.album.name,
          artist: {
            name: item.album.artists[0]?.name || 'Unknown Artist',
            spotifyId: item.album.artists[0]?.id || null
          },
          playcount: 0, // Spotify doesn't provide play counts
          mbid: null,
          url: item.album.external_urls?.spotify || '',
          image: item.album.images?.[0]?.url || '',
          added_at: item.added_at,
          rank: params.offset + index + 1,
          // Additional Spotify-specific data
          spotifyId: item.album.id,
          spotifyUri: item.album.uri,
          total_tracks: item.album.total_tracks
        }));

        allAlbums.push(...albums);
        params.offset = allAlbums.length;
        hasMore = data.next !== null && allAlbums.length < limit;
        totalRequests++;

        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        hasMore = false;
      }
    }

    return allAlbums.slice(0, limit);
  }

  // Get user's saved tracks (Liked Songs)
  static async getUserSavedTracks(accessToken, limit = 500) {
    const params = {
      limit: Math.min(50, limit), // API max 50
      offset: 0
    };

    const allTracks = [];
    let hasMore = true;

    while (hasMore && allTracks.length < limit) {
      const data = await this.makeSpotifyRequest('/me/tracks', accessToken, { params });
      if (data.items && data.items.length > 0) {
        const tracks = data.items.map((item, index) => {
          const track = item.track;
          return {
            name: track.name,
            artist: {
              name: track.artists[0]?.name || 'Unknown Artist',
              mbid: null
            },
            playcount: 0,
            mbid: null,
            url: track.external_urls?.spotify || '',
            image: track.album?.images?.[0]?.url || '',
            duration: track.duration_ms,
            popularity: track.popularity || 0,
            explicit: track.explicit || false,
            rank: params.offset + index + 1,
            spotifyId: track.id,
            spotifyUri: track.uri,
            album: {
              name: track.album?.name || '',
              image: track.album?.images?.[0]?.url || ''
            }
          };
        });
        allTracks.push(...tracks);
        params.offset = allTracks.length;
        hasMore = data.next !== null && allTracks.length < limit;
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        hasMore = false;
      }
    }

    return allTracks.slice(0, limit);
  }

  // Get followed artists (fallback source)
  static async getFollowedArtists(accessToken, limit = 200) {
    let after = undefined;
    const all = [];

    while (all.length < limit) {
      const params = { type: 'artist', limit: Math.min(50, limit - all.length) };
      if (after) params.after = after;
      const data = await this.makeSpotifyRequest('/me/following', accessToken, { params });
      if (data.artists && data.artists.items && data.artists.items.length > 0) {
        const artists = data.artists.items.map((artist, idx) => ({
          name: artist.name,
          playcount: 0,
          mbid: null,
          url: artist.external_urls?.spotify || '',
          image: artist.images?.[0]?.url || '',
          genres: artist.genres || [],
          popularity: artist.popularity || 0,
          followers: artist.followers?.total || 0,
          rank: all.length + idx + 1,
          spotifyId: artist.id,
          spotifyUri: artist.uri
        }));
        all.push(...artists);
        after = data.artists.cursors?.after;
        if (!after) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        break;
      }
    }

    return all.slice(0, limit);
  }

  // Convert Spotify time range to Last.fm period equivalent
  static convertTimeRangeToPeriod(timeRange) {
    switch (timeRange) {
      case 'short_term': return '1month';
      case 'medium_term': return '6month';
      case 'long_term': return 'overall';
      default: return 'overall';
    }
  }

  // Convert Last.fm period to Spotify time range
  static convertPeriodToTimeRange(period) {
    switch (period) {
      case '7day':
      case '1month': return 'short_term';
      case '3month':
      case '6month': return 'medium_term';
      case '12month':
      case 'overall': return 'long_term';
      default: return 'medium_term';
    }
  }

  // Get comprehensive user data (main function matching Last.fm structure)
  static async getUserData(accessToken, period = 'overall') {
    const timeRange = this.convertPeriodToTimeRange(period);

    try {
      const [userInfo, topArtistsRaw, topTracksRaw, savedAlbums] = await Promise.all([
        this.getUserInfo(accessToken),
        this.getUserTopArtists(accessToken, timeRange, 500),
        this.getUserTopTracks(accessToken, timeRange, 500),
        this.getUserSavedAlbums(accessToken, 100)
      ]);

      let topArtists = topArtistsRaw;
      let topTracks = topTracksRaw;

      // Fallbacks when Spotify has no top data for the account
      if ((topArtists?.length || 0) === 0 || (topTracks?.length || 0) === 0) {
        // Try to derive from saved tracks and followed artists
        const [savedTracks, followedArtists] = await Promise.all([
          this.getUserSavedTracks(accessToken, 500).catch(() => []),
          this.getFollowedArtists(accessToken, 200).catch(() => [])
        ]);

        if ((topTracks?.length || 0) === 0 && savedTracks.length > 0) {
          // Use saved tracks as a proxy for top tracks
          topTracks = savedTracks.slice(0, 500).map((t, idx) => ({ ...t, rank: idx + 1 }));
        }

        if ((topArtists?.length || 0) === 0) {
          // Build artist counts from saved tracks and saved albums
          const counts = new Map();

          savedTracks.forEach(t => {
            const name = t.artist?.name || 'Unknown Artist';
            counts.set(name, (counts.get(name) || 0) + 1);
          });

          savedAlbums.forEach(a => {
            const name = a.artist?.name || 'Unknown Artist';
            counts.set(name, (counts.get(name) || 0) + 1);
          });

          let derivedArtists = Array.from(counts.entries()).map(([name, count]) => ({
            name,
            playcount: count,
            mbid: null,
            url: '',
            image: '',
            genres: [],
            popularity: 0,
            followers: 0,
            rank: 0,
            spotifyId: null,
            spotifyUri: null
          }));

          // Enrich with followed artists data where available
          const followedByName = new Map(followedArtists.map(a => [a.name, a]));
          derivedArtists = derivedArtists.map(a => {
            const f = followedByName.get(a.name);
            if (f) {
              return { ...a, image: f.image || a.image, url: f.url || a.url, popularity: f.popularity || a.popularity, followers: f.followers || a.followers, spotifyId: f.spotifyId || a.spotifyId, spotifyUri: f.spotifyUri || a.spotifyUri };
            }
            return a;
          });

          // Sort by playcount desc and assign rank
          derivedArtists.sort((a, b) => (b.playcount || 0) - (a.playcount || 0));
          derivedArtists = derivedArtists.map((a, idx) => ({ ...a, rank: idx + 1 }));

          topArtists = derivedArtists.slice(0, 500);
        }
      }

      // Update user info with calculated counts
      userInfo.artistCount = topArtists.length;
      userInfo.trackCount = topTracks.length;

      return {
        userInfo,
        topArtists,
        topTracks,
        topAlbums: savedAlbums, // Using saved albums as proxy for top albums
        period: this.convertTimeRangeToPeriod(timeRange),
        dataSource: 'spotify'
      };
    } catch (error) {
      console.error('Error fetching Spotify user data:', error);
      throw error;
    }
  }

  // Extract genres from Spotify artist data
  static extractGenresFromSpotifyData(artists) {
    const genreCount = new Map();

    artists.forEach(artist => {
      if (artist.genres && artist.genres.length > 0) {
        // Use artist popularity as weight (similar to playcount in Last.fm)
        const weight = artist.popularity || 1;

        artist.genres.forEach(genre => {
          const normalizedGenre = genre.toLowerCase().trim();
          if (normalizedGenre.length >= 3) {
            const count = genreCount.get(normalizedGenre) || 0;
            genreCount.set(normalizedGenre, count + weight);
          }
        });
      }
    });

    return Array.from(genreCount.entries())
      .map(([name, count]) => ({
        name: this.titleCase(name),
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  // Helper function for title case formatting
  static titleCase(str) {
    const exceptions = ['and', 'or', 'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with'];

    return str.split(' ').map((word, index) => {
      if (index === 0 || !exceptions.includes(word.toLowerCase())) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word.toLowerCase();
    }).join(' ');
  }

  // Check if token needs refresh
  static async refreshTokenIfNeeded(currentTokens) {
    if (!currentTokens || !currentTokens.expiresAt) {
      throw new SpotifyError('No token information available', 'NO_TOKEN');
    }

    // Check if token expires in the next 5 minutes
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    if (currentTokens.expiresAt > fiveMinutesFromNow) {
      return currentTokens; // Token is still valid
    }

    // Token needs refresh
    if (!currentTokens.refreshToken) {
      throw new SpotifyError('No refresh token available', 'NO_REFRESH_TOKEN');
    }

    try {
      const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basic}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: currentTokens.refreshToken,
        }),
      });

      const tokens = await response.json();
      if (!response.ok) {
        throw new Error(`${response.status}: ${JSON.stringify(tokens)}`);
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || currentTokens.refreshToken,
        expiresAt: Date.now() + tokens.expires_in * 1000,
        scope: tokens.scope,
      };
    } catch (error) {
      throw new SpotifyError(`Token refresh failed: ${error.message}`, 'REFRESH_FAILED');
    }
  }
}