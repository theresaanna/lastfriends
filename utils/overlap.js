// utils/overlap.js

export function calculateArtistOverlap(user1Artists, user2Artists) {
  const user1ArtistNames = new Set(user1Artists.map(a => a.name.toLowerCase()));
  const user2ArtistNames = new Set(user2Artists.map(a => a.name.toLowerCase()));

  // Create maps for easy lookup with playcounts
  const user1Map = new Map(user1Artists.map(a => [a.name.toLowerCase(), a]));
  const user2Map = new Map(user2Artists.map(a => [a.name.toLowerCase(), a]));

  // Find shared artists
  const sharedArtists = [];
  const uniqueToUser1 = [];
  const uniqueToUser2 = [];

  // Check user1's artists
  for (const artist of user1Artists) {
    const lowerName = artist.name.toLowerCase();
    if (user2ArtistNames.has(lowerName)) {
      const user2Artist = user2Map.get(lowerName);
      sharedArtists.push({
        name: artist.name,
        user1Playcount: parseInt(artist.playcount) || 0,
        user2Playcount: parseInt(user2Artist.playcount) || 0,
        user1Rank: user1Artists.indexOf(artist) + 1,
        user2Rank: user2Artists.indexOf(user2Artist) + 1
      });
    } else {
      uniqueToUser1.push({
        name: artist.name,
        playcount: parseInt(artist.playcount) || 0,
        rank: user1Artists.indexOf(artist) + 1
      });
    }
  }

  // Check user2's unique artists
  for (const artist of user2Artists) {
    const lowerName = artist.name.toLowerCase();
    if (!user1ArtistNames.has(lowerName)) {
      uniqueToUser2.push({
        name: artist.name,
        playcount: parseInt(artist.playcount) || 0,
        rank: user2Artists.indexOf(artist) + 1
      });
    }
  }

  // Calculate compatibility score
  const totalUniqueArtists = user1ArtistNames.size + user2ArtistNames.size - sharedArtists.length;
  const compatibilityScore = totalUniqueArtists > 0 ? sharedArtists.length / totalUniqueArtists : 0;

  return {
    shared: sharedArtists,
    uniqueToUser1,
    uniqueToUser2,
    compatibilityScore: Math.round(compatibilityScore * 100) / 100,
    stats: {
      sharedCount: sharedArtists.length,
      user1UniqueCount: uniqueToUser1.length,
      user2UniqueCount: uniqueToUser2.length,
      totalUnique: totalUniqueArtists
    }
  };
}

export function calculateTrackOverlap(user1Tracks, user2Tracks) {
  const user1TrackKeys = new Set(user1Tracks.map(t => `${t.name.toLowerCase()}|${t.artist.name.toLowerCase()}`));
  const user2TrackKeys = new Set(user2Tracks.map(t => `${t.name.toLowerCase()}|${t.artist.name.toLowerCase()}`));

  const user1Map = new Map(user1Tracks.map(t => [`${t.name.toLowerCase()}|${t.artist.name.toLowerCase()}`, t]));
  const user2Map = new Map(user2Tracks.map(t => [`${t.name.toLowerCase()}|${t.artist.name.toLowerCase()}`, t]));

  const sharedTracks = [];
  const uniqueToUser1 = [];
  const uniqueToUser2 = [];

  // Check user1's tracks
  for (const track of user1Tracks) {
    const key = `${track.name.toLowerCase()}|${track.artist.name.toLowerCase()}`;
    if (user2TrackKeys.has(key)) {
      const user2Track = user2Map.get(key);
      sharedTracks.push({
        name: track.name,
        artist: track.artist.name,
        user1Playcount: parseInt(track.playcount) || 0,
        user2Playcount: parseInt(user2Track.playcount) || 0,
        user1Rank: user1Tracks.indexOf(track) + 1,
        user2Rank: user2Tracks.indexOf(user2Track) + 1
      });
    } else {
      uniqueToUser1.push({
        name: track.name,
        artist: track.artist.name,
        playcount: parseInt(track.playcount) || 0,
        rank: user1Tracks.indexOf(track) + 1
      });
    }
  }

  // Check user2's unique tracks
  for (const track of user2Tracks) {
    const key = `${track.name.toLowerCase()}|${track.artist.name.toLowerCase()}`;
    if (!user1TrackKeys.has(key)) {
      uniqueToUser2.push({
        name: track.name,
        artist: track.artist.name,
        playcount: parseInt(track.playcount) || 0,
        rank: user2Tracks.indexOf(track) + 1
      });
    }
  }

  const totalUniqueTracks = user1TrackKeys.size + user2TrackKeys.size - sharedTracks.length;
  const compatibilityScore = totalUniqueTracks > 0 ? sharedTracks.length / totalUniqueTracks : 0;

  return {
    shared: sharedTracks,
    uniqueToUser1,
    uniqueToUser2,
    compatibilityScore: Math.round(compatibilityScore * 100) / 100,
    stats: {
      sharedCount: sharedTracks.length,
      user1UniqueCount: uniqueToUser1.length,
      user2UniqueCount: uniqueToUser2.length,
      totalUnique: totalUniqueTracks
    }
  };
}

export function generateRecommendations(user1Data, user2Data, maxRecommendations = 10) {
  // Recommend top artists from user2 that user1 doesn't have
  const user1ArtistNames = new Set(user1Data.topArtists.map(a => a.name.toLowerCase()));
  const recommendationsForUser1 = user2Data.topArtists
    .filter(artist => !user1ArtistNames.has(artist.name.toLowerCase()))
    .slice(0, maxRecommendations)
    .map(artist => ({
      name: artist.name,
      playcount: parseInt(artist.playcount) || 0,
      reason: `${user2Data.userInfo.name}'s #${user2Data.topArtists.indexOf(artist) + 1} artist`
    }));

  // Recommend top artists from user1 that user2 doesn't have
  const user2ArtistNames = new Set(user2Data.topArtists.map(a => a.name.toLowerCase()));
  const recommendationsForUser2 = user1Data.topArtists
    .filter(artist => !user2ArtistNames.has(artist.name.toLowerCase()))
    .slice(0, maxRecommendations)
    .map(artist => ({
      name: artist.name,
      playcount: parseInt(artist.playcount) || 0,
      reason: `${user1Data.userInfo.name}'s #${user1Data.topArtists.indexOf(artist) + 1} artist`
    }));

  return {
    forUser1: recommendationsForUser1,
    forUser2: recommendationsForUser2
  };
}

export function calculateOverallCompatibility(artistOverlap, trackOverlap) {
  // Weight artists more heavily than tracks for overall compatibility
  const artistWeight = 0.7;
  const trackWeight = 0.3;

  const overallScore = (artistOverlap.compatibilityScore * artistWeight) +
                      (trackOverlap.compatibilityScore * trackWeight);

  let compatibilityLevel;
  if (overallScore >= 0.15) compatibilityLevel = 'Very High';
  else if (overallScore >= 0.10) compatibilityLevel = 'High';
  else if (overallScore >= 0.05) compatibilityLevel = 'Medium';
  else if (overallScore >= 0.02) compatibilityLevel = 'Low';
  else compatibilityLevel = 'Very Low';

  return {
    score: Math.round(overallScore * 100) / 100,
    percentage: Math.round(overallScore * 100),
    level: compatibilityLevel,
    artistScore: artistOverlap.compatibilityScore,
    trackScore: trackOverlap.compatibilityScore
  };
}