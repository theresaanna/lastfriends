// utils/cache.js - Simple in-memory cache with TTL
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  // Generate cache key from parameters
  generateKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  // Set cache entry with TTL
  set(key, value, ttlSeconds = 300) { // Default 5 minutes
    // Clear existing timer if present
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Store the value
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttlSeconds * 1000);

    this.timers.set(key, timer);
  }

  // Get cache entry
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    return entry.data;
  }

  // Delete cache entry
  delete(key) {
    // Clear timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    // Remove from cache
    this.cache.delete(key);
  }

  // Check if key exists and is valid
  has(key) {
    return this.get(key) !== null;
  }

  // Clear all cache
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl,
      expired: now - entry.timestamp > entry.ttl
    }));

    return {
      totalEntries: this.cache.size,
      validEntries: entries.filter(e => !e.expired).length,
      expiredEntries: entries.filter(e => e.expired).length,
      memoryUsage: JSON.stringify([...this.cache.entries()]).length,
      entries: entries
    };
  }
}

// Create singleton cache instance
const cache = new SimpleCache();

// Cache wrapper for async functions
export function withCache(fn, cacheKey, ttlSeconds = 300) {
  return async (...args) => {
    const key = cache.generateKey(cacheKey, { args: JSON.stringify(args) });

    // Try to get from cache first
    const cached = cache.get(key);
    if (cached) {
      console.log(`Cache HIT for ${cacheKey}:`, key);
      return cached;
    }

    console.log(`Cache MISS for ${cacheKey}:`, key);

    // Execute function and cache result
    try {
      const result = await fn(...args);
      cache.set(key, result, ttlSeconds);
      return result;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  };
}

// Export cache instance and utilities
export { cache };
export default cache;