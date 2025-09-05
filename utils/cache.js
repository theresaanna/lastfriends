// utils/cache.js - Hybrid Redis + In-Memory Cache with TTL
import { getRedisClient, isRedisAvailable, getCachedData, setCachedData, deleteCachedData } from './redis.js';

class HybridCache {
  constructor() {
    this.memoryCache = new Map();
    this.timers = new Map();
    this.redisAvailable = null; // Cache the Redis availability check
  }

  // Check Redis availability with caching
  async checkRedisAvailability() {
    if (this.redisAvailable === null) {
      this.redisAvailable = await isRedisAvailable();
      console.log(`Redis availability: ${this.redisAvailable ? 'Available' : 'Not available'}`);
    }
    return this.redisAvailable;
  }

  // Generate cache key from parameters
  generateKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  // Set cache entry with TTL (Redis first, then memory fallback)
  async set(key, value, ttlSeconds = 300) {
    try {
      const redisAvailable = await this.checkRedisAvailability();

      if (redisAvailable) {
        // Try Redis first
        const success = await setCachedData(key, value, ttlSeconds);
        if (success) {
          console.log(`Cache SET (Redis): ${key}`);
          return;
        }
        console.warn(`Redis SET failed for ${key}, falling back to memory`);
      }
    } catch (error) {
      console.warn(`Redis SET error for ${key}:`, error.message);
    }

    // Fallback to memory cache
    this.setMemory(key, value, ttlSeconds);
  }

  // Memory cache set method
  setMemory(key, value, ttlSeconds = 300) {
    // Clear existing timer if present
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Store the value
    this.memoryCache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.deleteMemory(key);
    }, ttlSeconds * 1000);

    this.timers.set(key, timer);
    console.log(`Cache SET (Memory): ${key}`);
  }

  // Get cache entry (Redis first, then memory fallback)
  async get(key) {
    try {
      const redisAvailable = await this.checkRedisAvailability();

      if (redisAvailable) {
        // Try Redis first
        const redisData = await getCachedData(key);
        if (redisData !== null) {
          console.log(`Cache HIT (Redis): ${key}`);
          return redisData;
        }
      }
    } catch (error) {
      console.warn(`Redis GET error for ${key}:`, error.message);
    }

    // Fallback to memory cache
    return this.getMemory(key);
  }

  // Memory cache get method
  getMemory(key) {
    const entry = this.memoryCache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.deleteMemory(key);
      return null;
    }

    console.log(`Cache HIT (Memory): ${key}`);
    return entry.data;
  }

  // Delete cache entry (both Redis and memory)
  async delete(key) {
    try {
      const redisAvailable = await this.checkRedisAvailability();

      if (redisAvailable) {
        await deleteCachedData(key);
        console.log(`Cache DELETE (Redis): ${key}`);
      }
    } catch (error) {
      console.warn(`Redis DELETE error for ${key}:`, error.message);
    }

    // Always delete from memory cache too
    this.deleteMemory(key);
  }

  // Memory cache delete method
  deleteMemory(key) {
    // Clear timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    // Remove from cache
    this.memoryCache.delete(key);
    console.log(`Cache DELETE (Memory): ${key}`);
  }

  // Check if key exists and is valid
  async has(key) {
    const value = await this.get(key);
    return value !== null;
  }

  // Clear all cache (both Redis and memory)
  async clear() {
    try {
      const redisAvailable = await this.checkRedisAvailability();

      if (redisAvailable) {
        const redis = getRedisClient();
        await redis.flushdb(); // Clear current database
        console.log('Cache CLEAR (Redis): All data cleared');
      }
    } catch (error) {
      console.warn('Redis CLEAR error:', error.message);
    }

    // Always clear memory cache
    this.clearMemory();
  }

  // Clear memory cache only
  clearMemory() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.memoryCache.clear();
    console.log('Cache CLEAR (Memory): All data cleared');
  }

  // Get comprehensive cache statistics
  async getStats() {
    const memoryStats = this.getMemoryStats();
    let redisStats = { available: false, entries: 0, memory: 0 };

    try {
      const redisAvailable = await this.checkRedisAvailability();

      if (redisAvailable) {
        const redis = getRedisClient();
        const dbsize = await redis.dbsize();
        const memoryInfo = await redis.memory('usage');

        redisStats = {
          available: true,
          entries: dbsize,
          memory: memoryInfo || 0
        };
      }
    } catch (error) {
      console.warn('Redis STATS error:', error.message);
    }

    return {
      redis: redisStats,
      memory: memoryStats,
      totalEntries: redisStats.entries + memoryStats.totalEntries,
      totalMemoryUsage: redisStats.memory + memoryStats.memoryUsage
    };
  }

  // Get memory cache statistics
  getMemoryStats() {
    const now = Date.now();
    const entries = Array.from(this.memoryCache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl,
      expired: now - entry.timestamp > entry.ttl
    }));

    return {
      totalEntries: this.memoryCache.size,
      validEntries: entries.filter(e => !e.expired).length,
      expiredEntries: entries.filter(e => e.expired).length,
      memoryUsage: JSON.stringify([...this.memoryCache.entries()]).length,
      entries: entries
    };
  }
}

// Create singleton hybrid cache instance
const cache = new HybridCache();

// Enhanced cache wrapper for async functions
export function withCache(fn, cacheKey, ttlSeconds = 300) {
  return async (...args) => {
    const key = cache.generateKey(cacheKey, { args: JSON.stringify(args) });

    // Try to get from cache first
    const cached = await cache.get(key);
    if (cached) {
      console.log(`Cache HIT for ${cacheKey}:`, key);
      return cached;
    }

    console.log(`Cache MISS for ${cacheKey}:`, key);

    // Execute function and cache result
    try {
      const result = await fn(...args);
      await cache.set(key, result, ttlSeconds);
      return result;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  };
}

// Export cache instance and utilities
export { cache };

// Legacy synchronous methods for backward compatibility
export function getCacheStats() {
  return cache.getStats();
}

export function clearCache() {
  return cache.clear();
}

export default cache;