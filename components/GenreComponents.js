// components/GenreComponents.js (renamed from WordCloudComponents.js)

// Genre Card Component
export function GenreCard({ user, genres, overlappingGenres, isUser1 = true }) {
  const avatar = user.name.charAt(0).toUpperCase();

  return (
    <div className="genre-card">
      <h3>
        <div className="user-avatar">{avatar}</div>
        {user.name}'s Top Genres
      </h3>
      <ul className="genre-list">
        {genres && genres.slice(0, 10).map((genre, index) => (
          <li
            key={index}
            className={`genre-item ${overlappingGenres.has(genre.name.toLowerCase()) ? 'overlap' : ''}`}
          >
            <span>{genre.name}</span>
            <span className="genre-count">{genre.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}