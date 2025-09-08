// pages/api/debug/spotify-library.js - Summarize Spotify library counts for the logged-in user
import { getSessionFromRequest } from '../../../utils/session.js';
import { SpotifyDataAPI } from '../../../utils/spotify.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSessionFromRequest(req);
    if (!session || !session.tokens?.accessToken) {
      return res.status(401).json({ error: 'No Spotify session' });
    }

    // Ensure token is current
    let tokens = session.tokens;
    try {
      tokens = await SpotifyDataAPI.refreshTokenIfNeeded(tokens);
    } catch (e) {
      return res.status(401).json({ error: 'Token refresh failed', code: 'TOKEN_REFRESH_FAILED' });
    }

    // Query minimal metadata for totals and a sample
    const [profile, likedResp, albumsResp, followed] = await Promise.all([
      SpotifyDataAPI.getUserInfo(tokens.accessToken),
      // limit=1 to fetch a sample and the total field
      SpotifyDataAPI.makeSpotifyRequest('/me/tracks', tokens.accessToken, { params: { limit: 1 } }).catch(() => ({})),
      SpotifyDataAPI.makeSpotifyRequest('/me/albums', tokens.accessToken, { params: { limit: 1 } }).catch(() => ({})),
      SpotifyDataAPI.getFollowedArtists(tokens.accessToken, 500).catch(() => [])
    ]);

    const likedTotal = typeof likedResp.total === 'number' ? likedResp.total : (likedResp.items?.length || 0);
    const likedSample = likedResp.items?.[0]?.track?.name || null;

    const savedAlbumsTotal = typeof albumsResp.total === 'number' ? albumsResp.total : (albumsResp.items?.length || 0);
    const savedAlbumsSample = albumsResp.items?.[0]?.album?.name || null;

    const followedCount = Array.isArray(followed) ? followed.length : 0;
    const followedSample = followed?.[0]?.name || null;

    return res.status(200).json({
      user: { id: profile.id, name: profile.name },
      library: {
        likedTracksTotal: likedTotal,
        savedAlbumsTotal: savedAlbumsTotal,
        followedArtistsCount: followedCount
      },
      samples: {
        firstLikedTrack: likedSample,
        firstSavedAlbum: savedAlbumsSample,
        firstFollowedArtist: followedSample
      }
    });
  } catch (error) {
    console.error('spotify-library debug error:', error);
    return res.status(500).json({ error: 'Failed to query Spotify library', details: error.message });
  }
}
