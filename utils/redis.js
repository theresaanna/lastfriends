// utils/redis.js - Redis connection utility
import Redis from 'ioredis';

let redis = null;

export function getRedisClient() {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    // Parse Redis URL or use individual config
    let redisConfig;

    if (process.env.REDIS_URL) {
      // Use URL if provided (handles auth automatically)
      redisConfig = redisUrl;
    } else {
      // Build config from individual environment variables
      redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        // Add connection timeout
        connectTimeout: 10000,
        commandTimeout: 5000
      };
    }

    redis = new Redis(redisConfig);

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

// Check if Redis is available
export async function isRedisAvailable() {
  try {
    const client = getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    console.warn('Redis not available:', error.message);
    return false;
  }
}

// Redis-based cache functions
export async function getCachedData(key) {
  try {
    const client = getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('Redis get error:', error.message);
    return null;
  }
}

export async function setCachedData(key, data, ttlSeconds = 3600) {
  try {
    const client = getRedisClient();
    await client.setex(key, ttlSeconds, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn('Redis set error:', error.message);
    return false;
  }
}

export async function deleteCachedData(key) {
  try {
    const client = getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    console.warn('Redis delete error:', error.message);
    return false;
  }
}