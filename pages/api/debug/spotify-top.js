// pages/api/debug/spotify-top.js - Quick probe of Spotify top data for the logged-in user
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

    const period = req.query.period || 'overall';
    const timeRange = SpotifyDataAPI.convertPeriodToTimeRange(period);

    // Ensure token is current using the same refresh helper used in compare
    let tokens = session.tokens;
    try {
      tokens = await SpotifyDataAPI.refreshTokenIfNeeded(tokens);
    } catch (e) {
      return res.status(401).json({ error: 'Token refresh failed', code: 'TOKEN_REFRESH_FAILED' });
    }

    // Fetch a small sample to prove data is available
    const [profile, artists, tracks] = await Promise.all([
      SpotifyDataAPI.getUserInfo(tokens.accessToken),
      SpotifyDataAPI.getUserTopArtists(tokens.accessToken, timeRange, 10),
      SpotifyDataAPI.getUserTopTracks(tokens.accessToken, timeRange, 10)
    ]);

    return res.status(200).json({
      user: { id: profile.id, name: profile.name },
      timeRange,
      counts: { artists: artists.length, tracks: tracks.length },
      sample: {
        firstArtist: artists[0]?.name || null,
        firstTrack: tracks[0]?.name || null
      }
    });
  } catch (error) {
    console.error('spotify-top debug error:', error);
    return res.status(500).json({ error: 'Failed to query Spotify top data', details: error.message });
  }
}
