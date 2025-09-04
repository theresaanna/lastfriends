// pages/api/cache.js - Cache management API
import { getCacheStats, clearCache } from '../../utils/lastfm.js';

export default async function handler(req, res) {
  // Simple authentication check - you can enhance this
  const adminKey = process.env.ADMIN_KEY || 'your-admin-key';
  const providedKey = req.headers['x-admin-key'] || req.query.key;

  if (providedKey !== adminKey) {
    return res.status(401).json({
      error: 'Unauthorized. Please provide valid admin key.'
    });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Get cache statistics
        const stats = getCacheStats();
        return res.status(200).json({
          success: true,
          cache: stats,
          timestamp: new Date().toISOString()
        });

      case 'DELETE':
        // Clear cache
        clearCache();
        return res.status(200).json({
          success: true,
          message: 'Cache cleared successfully',
          timestamp: new Date().toISOString()
        });

      default:
        return res.status(405).json({
          error: 'Method not allowed. Use GET to view stats or DELETE to clear cache.'
        });
    }
  } catch (error) {
    console.error('Cache API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}