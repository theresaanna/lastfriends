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

// New function to extract genres from artist tags
export function extractGenresFromTags(artists) {
  const genreCount = new Map();

  // Common genre mappings and cleanup
  const genreAliases = {
    'electronic': ['electronica', 'electro', 'edm'],
    'indie rock': ['indie', 'indierock'],
    'alternative rock': ['alternative', 'alt-rock', 'alt rock'],
    'hip hop': ['hip-hop', 'hiphop', 'rap'],
    'dance': ['danceable'],
    'ambient': ['atmospheric'],
    'post-rock': ['postrock'],
    'synthwave': ['synthpop', 'synth-pop', 'retrowave'],
    'experimental': ['avant-garde'],
    'folk': ['indie folk', 'folk rock'],
    'metal': ['heavy metal'],
    'punk': ['punk rock'],
    'jazz': ['contemporary jazz'],
    'classical': ['contemporary classical'],
    'r&b': ['rnb', 'soul'],
    'country': ['americana']
  };

  // Reverse mapping for aliases
  const aliasToGenre = {};
  Object.entries(genreAliases).forEach(([genre, aliases]) => {
    aliases.forEach(alias => {
      aliasToGenre[alias] = genre;
    });
  });

  artists.forEach(artist => {
    if (artist.tags && artist.tags.tag) {
      const tags = Array.isArray(artist.tags.tag) ? artist.tags.tag : [artist.tags.tag];

      tags.forEach(tag => {
        if (tag.name) {
          let genreName = tag.name.toLowerCase().trim();

          // Skip very generic or non-genre tags
          const skipTags = ['seen live', 'favorite', 'good', 'awesome', 'love', 'great', 'best', 'top'];
          if (skipTags.some(skip => genreName.includes(skip))) return;

          // Apply alias mapping
          genreName = aliasToGenre[genreName] || genreName;

          // Clean up the genre name
          genreName = genreName
            .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

          if (genreName.length > 2) { // Skip very short tags
            const count = genreCount.get(genreName) || 0;
            genreCount.set(genreName, count + parseInt(artist.playcount || 0));
          }
        }
      });
    }
  });

  // Convert to sorted array
  return Array.from(genreCount.entries())
    .map(([name, count]) => ({
      name: name.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '), // Title case
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20 genres
}

// New function to calculate genre overlap
export function calculateGenreOverlap(user1Genres, user2Genres) {
  const user1GenreNames = new Set(user1Genres.map(g => g.name.toLowerCase()));
  const user2GenreNames = new Set(user2Genres.map(g => g.name.toLowerCase()));

  const user1Map = new Map(user1Genres.map(g => [g.name.toLowerCase(), g]));
  const user2Map = new Map(user2Genres.map(g => [g.name.toLowerCase(), g]));

  const sharedGenres = [];
  const uniqueToUser1 = [];
  const uniqueToUser2 = [];

  // Check user1's genres
  for (const genre of user1Genres) {
    const lowerName = genre.name.toLowerCase();
    if (user2GenreNames.has(lowerName)) {
      const user2Genre = user2Map.get(lowerName);
      sharedGenres.push({
        name: genre.name,
        user1Count: genre.count,
        user2Count: user2Genre.count,
        user1Rank: user1Genres.indexOf(genre) + 1,
        user2Rank: user2Genres.indexOf(user2Genre) + 1
      });
    } else {
      uniqueToUser1.push({
        name: genre.name,
        count: genre.count,
        rank: user1Genres.indexOf(genre) + 1
      });
    }
  }

  // Check user2's unique genres
  for (const genre of user2Genres) {
    const lowerName = genre.name.toLowerCase();
    if (!user1GenreNames.has(lowerName)) {
      uniqueToUser2.push({
        name: genre.name,
        count: genre.count,
        rank: user2Genres.indexOf(genre) + 1
      });
    }
  }

  const totalUniqueGenres = user1GenreNames.size + user2GenreNames.size - sharedGenres.length;
  const compatibilityScore = totalUniqueGenres > 0 ? sharedGenres.length / totalUniqueGenres : 0;

  return {
    shared: sharedGenres,
    uniqueToUser1,
    uniqueToUser2,
    compatibilityScore: Math.round(compatibilityScore * 100) / 100,
    stats: {
      sharedCount: sharedGenres.length,
      user1UniqueCount: uniqueToUser1.length,
      user2UniqueCount: uniqueToUser2.length,
      totalUnique: totalUniqueGenres
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