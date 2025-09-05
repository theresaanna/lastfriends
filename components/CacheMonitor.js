// components/CacheMonitor.js - Enhanced Development cache monitoring with Redis support
import { useState, useEffect } from 'react';

export function CacheMonitor({ adminKey }) {
  const [cacheStats, setCacheStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchCacheStats = async () => {
    if (!adminKey) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/cache', {
        headers: {
          'X-Admin-Key': adminKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setCacheStats(data.cache);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    if (!adminKey || !confirm('Are you sure you want to clear the cache?')) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/cache', {
        method: 'DELETE',
        headers: {
          'X-Admin-Key': adminKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await fetchCacheStats(); // Refresh stats after clearing
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCacheStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchCacheStats, 30000);
    return () => clearInterval(interval);
  }, [adminKey]);

  if (!adminKey) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          Cache monitoring requires an admin key. Set ADMIN_KEY in your environment.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Cache Monitor</h3>
        <div className="flex gap-2">
          <button
            onClick={fetchCacheStats}
            disabled={loading}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={clearCache}
            disabled={loading}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Clear Cache
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-red-800 text-sm">Error: {error}</p>
        </div>
      )}

      {cacheStats && (
        <div className="space-y-4">
          {/* Redis Stats */}
          {cacheStats.redis && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-green-800 mb-3">
                Redis Cache {cacheStats.redis.available ? '✅ Connected' : '❌ Unavailable'}
              </h4>
              {cacheStats.redis.available && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded">
                    <div className="text-2xl font-bold text-green-600">{cacheStats.redis.entries}</div>
                    <div className="text-sm text-gray-600">Redis Entries</div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(cacheStats.redis.memory / 1024)}KB
                    </div>
                    <div className="text-sm text-gray-600">Redis Memory</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Memory Cache Stats */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-blue-800 mb-3">In-Memory Cache</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded">
                <div className="text-2xl font-bold text-blue-600">{cacheStats.memory?.totalEntries || 0}</div>
                <div className="text-sm text-gray-600">Memory Entries</div>
              </div>
              <div className="bg-white p-3 rounded">
                <div className="text-2xl font-bold text-green-600">{cacheStats.memory?.validEntries || 0}</div>
                <div className="text-sm text-gray-600">Valid Entries</div>
              </div>
              <div className="bg-white p-3 rounded">
                <div className="text-2xl font-bold text-red-600">{cacheStats.memory?.expiredEntries || 0}</div>
                <div className="text-sm text-gray-600">Expired</div>
              </div>
              <div className="bg-white p-3 rounded">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round((cacheStats.memory?.memoryUsage || 0) / 1024)}KB
                </div>
                <div className="text-sm text-gray-600">Memory Usage</div>
              </div>
            </div>
          </div>

          {/* Combined Stats */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Combined Statistics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded">
                <div className="text-2xl font-bold text-indigo-600">{cacheStats.totalEntries || 0}</div>
                <div className="text-sm text-gray-600">Total Entries</div>
              </div>
              <div className="bg-white p-3 rounded">
                <div className="text-2xl font-bold text-indigo-600">
                  {Math.round((cacheStats.totalMemoryUsage || 0) / 1024)}KB
                </div>
                <div className="text-sm text-gray-600">Total Memory</div>
              </div>
            </div>
          </div>

          {lastUpdated && (
            <p className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}

          {/* Memory Cache Entries Detail */}
          {cacheStats.memory?.entries && cacheStats.memory.entries.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Memory Cache Entries</h4>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-2">Key</th>
                      <th className="text-left p-2">Age</th>
                      <th className="text-left p-2">TTL</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cacheStats.memory.entries.slice(0, 20).map((entry, index) => (
                      <tr key={index} className="border-t border-gray-100">
                        <td className="p-2 font-mono text-xs truncate max-w-xs">
                          {entry.key.split(':')[0]}...
                        </td>
                        <td className="p-2">
                          {Math.round(entry.age / 1000)}s
                        </td>
                        <td className="p-2">
                          {Math.round(entry.ttl / 1000)}s
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            entry.expired 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {entry.expired ? 'Expired' : 'Valid'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cacheStats.memory.entries.length > 20 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Showing 20 of {cacheStats.memory.entries.length} entries
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CacheMonitor;