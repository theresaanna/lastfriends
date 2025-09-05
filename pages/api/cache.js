// pages/api/cache.js - Enhanced Cache management API with Redis support
import { cache } from '../../utils/cache.js';

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
        // Get comprehensive cache statistics (Redis + Memory)
        const stats = await cache.getStats();
        return res.status(200).json({
          success: true,
          cache: stats,
          timestamp: new Date().toISOString()
        });

      case 'DELETE':
        // Clear all cache (Redis + Memory)
        await cache.clear();
        return res.status(200).json({
          success: true,
          message: 'All cache cleared successfully (Redis + Memory)',
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