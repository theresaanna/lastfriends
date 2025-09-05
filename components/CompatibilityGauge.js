// components/CompatibilityGauge.js
export function CompatibilityGauge({ percentage, level, isEnhanced = false }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (pct) => {
    if (pct >= 20) return '#10b981'; // emerald-500
    if (pct >= 15) return '#f59e0b'; // amber-500
    if (pct >= 10) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const getGradient = (pct) => {
    if (pct >= 20) return 'from-emerald-400 to-green-500';
    if (pct >= 15) return 'from-yellow-400 to-orange-500';
    if (pct >= 10) return 'from-orange-400 to-red-500';
    return 'from-red-400 to-pink-500';
  };

  return (
    <div className="flex flex-col items-center fade-in-up relative">
      {isEnhanced && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
          Enhanced
        </div>
      )}
      <div className="relative w-40 h-40">
        <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#e5e7eb"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={getColor(percentage)}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ filter: 'drop-shadow(0 0 8px rgba(217, 35, 35, 0.3))' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-4xl font-bold bg-gradient-to-r ${getGradient(percentage)} bg-clip-text text-transparent`}>
              {percentage}%
            </div>
            <div className="text-sm text-gray-600 font-medium">{level}</div>
          </div>
        </div>
      </div>
    </div>
  );
}