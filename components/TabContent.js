// components/TabContent.js
import { MusicCard } from './MusicCards.js';
import { GenreCard } from './GenreComponents.js';

// Overview Tab Content
export function OverviewTab({ artistOverlap, trackOverlap, users }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          🤝 Top Shared Artists
        </h3>
        {artistOverlap.shared.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {artistOverlap.shared.slice(0, 6).map((artist, index) => (
              <MusicCard
                key={index}
                item={artist}
                type="artist"
                users={users}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎭</div>
            <p className="text-gray-600">No shared artists found in top lists</p>
            <p className="text-sm text-gray-500 mt-2">Very different music tastes!</p>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          🎵 Top Shared Tracks
        </h3>
        {trackOverlap.shared.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trackOverlap.shared.slice(0, 6).map((track, index) => (
              <MusicCard
                key={index}
                item={track}
                type="track"
                users={users}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎪</div>
            <p className="text-gray-600">No shared tracks found in top lists</p>
            <p className="text-sm text-gray-500 mt-2">Explore each other's music!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Artists Tab Content
export function ArtistsTab({ artistOverlap, users }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          🤝 Shared Artists ({artistOverlap.stats.sharedCount})
        </h3>
        {artistOverlap.shared.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {artistOverlap.shared.map((artist, index) => (
              <MusicCard key={index} item={artist} type="artist" users={users} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎭</div>
            <p className="text-gray-600">No shared artists found</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-bold mb-4 text-blue-600">
            🎨 Unique to {users.user1.name}
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {artistOverlap.uniqueToUser1.slice(0, 15).map((artist, index) => (
              <MusicCard
                key={index}
                item={artist}
                type="artist"
                users={users}
                showPlaycounts={true}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4 text-purple-600">
            🎪 Unique to {users.user2.name}
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {artistOverlap.uniqueToUser2.slice(0, 15).map((artist, index) => (
              <MusicCard
                key={index}
                item={artist}
                type="artist"
                users={users}
                showPlaycounts={true}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tracks Tab Content
export function TracksTab({ trackOverlap, users }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          🤝 Shared Tracks ({trackOverlap.stats.sharedCount})
        </h3>
        {trackOverlap.shared.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trackOverlap.shared.map((track, index) => (
              <MusicCard key={index} item={track} type="track" users={users} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎪</div>
            <p className="text-gray-600">No shared tracks found</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-bold mb-4 text-blue-600">
            🎵 Unique to {users.user1.name}
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {trackOverlap.uniqueToUser1.slice(0, 15).map((track, index) => (
              <MusicCard
                key={index}
                item={track}
                type="track"
                users={users}
                showPlaycounts={true}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4 text-purple-600">
            🎶 Unique to {users.user2.name}
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {trackOverlap.uniqueToUser2.slice(0, 15).map((track, index) => (
              <MusicCard
                key={index}
                item={track}
                type="track"
                users={users}
                showPlaycounts={true}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Genre Comparison Tab Content
export function GenreTab({ users, overlappingGenres }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">🎨 Genre Compatibility</h3>
        <p className="text-gray-600">
          Comparing musical genres between {users.user1.name} and {users.user2.name}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Highlighted genres show shared musical tastes ⭐
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GenreCard
          user={users.user1}
          genres={users.user1.genres || []}
          overlappingGenres={overlappingGenres}
          isUser1={true}
        />
        <GenreCard
          user={users.user2}
          genres={users.user2.genres || []}
          overlappingGenres={overlappingGenres}
          isUser1={false}
        />
      </div>

      {overlappingGenres.size > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-6">
          <h4 className="text-lg font-bold text-red-800 mb-3 flex items-center gap-2">
            ⭐ Shared Genre Interests
          </h4>
          <div className="flex flex-wrap gap-2">
            {Array.from(overlappingGenres).map((genre, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium"
              >
                {genre.charAt(0).toUpperCase() + genre.slice(1)}
              </span>
            ))}
          </div>
          <p className="text-sm text-red-600 mt-3">
            You both enjoy these {overlappingGenres.size} genre{overlappingGenres.size !== 1 ? 's' : ''}!
          </p>
        </div>
      )}
    </div>
  );
}

// Recommendations Tab Content
export function RecommendationsTab({ recommendations, users }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          ✨ For {users.user1.name}
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Discover music from {users.user2.name}'s favorites
        </p>
        <div className="space-y-4">
          {recommendations.forUser1.map((rec, index) => (
            <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-400 rounded-xl hover:scale-105 transition-all duration-200">
              <h4 className="font-semibold text-gray-800 mb-1">{rec.name}</h4>
              <p className="text-xs text-gray-600 mb-2">{rec.reason}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  {rec.playcount} plays
                </span>
                <span className="text-gray-500">by {users.user2.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          ✨ For {users.user2.name}
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Discover music from {users.user1.name}'s favorites
        </p>
        <div className="space-y-4">
          {recommendations.forUser2.map((rec, index) => (
            <div key={index} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-400 rounded-xl hover:scale-105 transition-all duration-200">
              <h4 className="font-semibold text-gray-800 mb-1">{rec.name}</h4>
              <p className="text-xs text-gray-600 mb-2">{rec.reason}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  {rec.playcount} plays
                </span>
                <span className="text-gray-500">by {users.user1.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}