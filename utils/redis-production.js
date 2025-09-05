// utils/redis-production.js
import Redis from 'ioredis';

let redis = null;

export function getRedisClient() {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      console.warn('REDIS_URL not found, Redis features disabled');
      return null;
    }

    redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      // Production optimizations
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxLoadingTimeout: 1000,
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    redis.on('ready', () => {
      console.log('Redis ready for commands');
    });
  }

  return redis;
}

// ... rest of redis utility functions