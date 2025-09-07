// components/Skeletons.js - Lightweight skeleton loaders for lists

export function ArtistSkeletonGrid({ count = 6 }) {
  const items = Array.from({ length: count });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gray-200"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/5"></div>
              <div className="h-3 bg-gray-100 rounded w-2/5"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrackSkeletonGrid({ count = 6 }) {
  const items = Array.from({ length: count });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded bg-gray-200"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-4/5"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

