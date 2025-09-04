// components/StatsOverview.js
export function StatsOverview({ analysis }) {
  const { artistOverlap, trackOverlap, compatibility } = analysis;

  const stats = [
    {
      label: 'Shared Artists',
      value: artistOverlap.stats.sharedCount,
      total: artistOverlap.stats.totalUnique,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      icon: '🎵'
    },
    {
      label: 'Shared Tracks',
      value: trackOverlap.stats.sharedCount,
      total: trackOverlap.stats.totalUnique,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: '🎶'
    },
    {
      label: 'Artist Match',
      value: Math.round(compatibility.artistScore * 100) + '%',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      icon: '👥'
    },
    {
      label: 'Track Match',
      value: Math.round(compatibility.trackScore * 100) + '%',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      icon: '🎤'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`card p-4 text-center fade-in-up ${stat.bgColor} hover:scale-105 transition-all duration-200`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="text-2xl mb-2">{stat.icon}</div>
          <div className={`text-2xl font-bold ${stat.color} mb-1`}>
            {stat.value}
          </div>
          <div className="text-sm text-gray-600 font-medium">
            {stat.label}
          </div>
          {stat.total && (
            <div className="text-xs text-gray-500 mt-1">
              of {stat.total} total
            </div>
          )}
        </div>
      ))}
    </div>
  );
}