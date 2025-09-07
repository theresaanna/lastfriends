// components/MusicCards.js
import { useState } from 'react';

// Artist/Track card component
export function MusicCard({ item, type, users, showPlaycounts = true }) {
  const isShared = item.user1Playcount !== undefined;

  return (
    <div className={`${isShared ? 'music-card-shared' : 'music-card-unique'} transition-all duration-200 hover:scale-105`}>
      <h4 className="font-semibold text-gray-800 mb-1 text-sm">
        {item.name}
      </h4>
      {type === 'track' && (
        <p className="text-xs text-gray-600 mb-2">by {item.artist}</p>
      )}

      {showPlaycounts && (
        <div className="space-y-1">
          {isShared ? (
            <>
              <div className="flex justify-between text-xs text-gray-600">
                <span className="font-medium">{users.user1.name}:</span>
                <span className="font-medium text-emerald-600">{item.user1Playcount} plays</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span className="font-medium">{users.user2.name}:</span>
                <span className="font-medium text-emerald-600">{item.user2Playcount} plays</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Plays:</span>
              <span className="font-medium text-blue-600">{item.playcount}</span>
            </div>
          )}
        </div>
      )}

      {isShared && (
        <div className="mt-2 flex justify-between text-xs text-gray-500">
          <span>#{item.user1Rank}</span>
          <span>#{item.user2Rank}</span>
        </div>
      )}
    </div>
  );
}

// User profile card
export function UserProfile({ user, isLoading = false, highlightSpotifyPlaycount = false }) {
  if (isLoading) {
    return (
      <div className="card-elevated p-6 animate-pulse">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
          <div className="space-y-2 text-center w-full">
            <div className="h-6 bg-gray-200 rounded-xl w-32 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-24 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-36 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  const isSpotify = (user?.dataSource || '').toLowerCase() === 'spotify';
  const linkText = isSpotify ? 'View on Spotify →' : 'View on Last.fm →';
  const linkClass = isSpotify
    ? 'inline-block mt-4 text-green-600 hover:text-green-700 text-sm font-semibold transition-colors duration-200'
    : 'inline-block mt-4 text-lastfm-red hover:text-lastfm-red-dark text-sm font-semibold transition-colors duration-200';

  // State-driven avatar: only one element rendered to preserve original layout height
  const [showImage, setShowImage] = useState(Boolean(user?.image));

  // Compute playcount styling
  const playcountClass = isSpotify && highlightSpotifyPlaycount
    ? 'font-bold text-green-600 text-lg'
    : 'font-bold gradient-text text-lg';

  return (
    <div className="card-elevated p-6 fade-in-up hover:shadow-lg transition-all duration-300">
      <div className="flex flex-col items-center space-y-4">
        {showImage ? (
          <img
            src={user.image}
            alt={user.name}
            className="w-24 h-24 rounded-full object-cover shadow-soft ring-4 ring-white"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={() => setShowImage(false)}
          />
        ) : (
          <div className={`w-24 h-24 ${isSpotify ? 'bg-green-500' : 'bg-gradient-lastfm'} rounded-full flex items-center justify-center shadow-soft ring-4 ring-white`}>
            <span className="text-white text-2xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-800">{user.name}</h3>
          {user.realname && (
            <p className="text-gray-600 text-sm">{user.realname}</p>
          )}

          <div className="mt-3 space-y-1 text-sm text-gray-600">
            <p>
              <span className={playcountClass}>{user.playcount.toLocaleString()}</span>
              {" "}
              {isSpotify ? 'plays' : 'total scrobbles'}
            </p>
            <p className="text-xs">{user.artistCount.toLocaleString()} artists • {user.trackCount.toLocaleString()} tracks</p>
          </div>

          <a
            href={user.url}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {linkText}
          </a>
        </div>
      </div>
    </div>
  );
}
