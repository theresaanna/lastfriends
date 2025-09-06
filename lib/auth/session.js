// lib/auth/session.js - Session management with Redis or in-memory store (FIXED)

// Use Redis in production, fallback to in-memory for development
const isProduction = process.env.NODE_ENV === 'production';
let redis = null;

// Use global memory store to persist across API calls
const globalKey = Symbol.for('app.session.memoryStore');
const globalStore = globalThis[globalKey] || (globalThis[globalKey] = new Map());
const memoryStore = globalStore;

// Session configuration
const SESSION_PREFIX = 'session:';
const SESSION_EXPIRY = 30 * 24 * 60 * 60; // 30 days in seconds

// Initialize Redis connection only if in production and Redis URL is available
if (isProduction && process.env.REDIS_URL) {
  // Dynamic import of Redis to avoid errors if not installed
  try {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    redis.on('error', (error) => {
      console.error('Redis connection error:', error);
      // Fallback to memory store if Redis fails
      redis = null;
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected for session storage');
    });
  } catch (error) {
    console.warn('⚠️  Redis not available, using in-memory session storage');
    redis = null;
  }
} else {
  console.log('📝 Using in-memory session storage (development mode)');
}

/**
 * Create a new session
 * @param {string} sessionToken - Unique session token
 * @param {Object} sessionData - Session data to store
 */
export async function createSession(sessionToken, sessionData) {
  const key = `${SESSION_PREFIX}${sessionToken}`;

  try {
    console.log('🔧 Creating session with key:', key);
    console.log('🔧 Session data:', sessionData);
    console.log('🔧 Using Redis?', !!redis);
    console.log('🔧 Global memory store before:', globalThis[globalKey]?.size || 0);

    if (redis) {
      try {
        const data = JSON.stringify(sessionData);
        await redis.setex(key, SESSION_EXPIRY, data);
        console.log('✅ Redis session created');
      } catch (error) {
        console.error('❌ Redis createSession error:', error);
        // Fallback to memory store
        memoryStore.set(key, {
          data: sessionData,
          expires: Date.now() + (SESSION_EXPIRY * 1000)
        });
        console.log('✅ Fallback to memory store');
      }
    } else {
      // In-memory fallback with TTL simulation
      console.log('🔧 About to set in global memory store...');
      memoryStore.set(key, {
        data: sessionData,
        expires: Date.now() + (SESSION_EXPIRY * 1000)
      });
      console.log('✅ Memory store session created');
      console.log('🔧 Global memory store after:', globalThis[globalKey]?.size || 0);
      console.log('🔧 Global memory store keys:', Array.from(globalThis[globalKey]?.keys() || []));

      // Immediately verify it was stored
      const verification = memoryStore.get(key);
      console.log('🔍 Immediate verification:', verification ? 'SUCCESS' : 'FAILED');
      if (verification) {
        console.log('🔍 Verification data:', verification);
      }
    }
  } catch (error) {
    console.error('❌ CRITICAL: Session creation failed:', error);
    throw error;
  }
}

/**
 * Get session data by token
 * @param {string} sessionToken - Session token to look up
 * @returns {Object|null} Session data or null if not found/expired
 */
export async function getSession(sessionToken) {
  const key = `${SESSION_PREFIX}${sessionToken}`;

  console.log('🔍 Looking up session with key:', key);
  console.log('🔍 Using Redis?', !!redis);
  console.log('🔍 Global memory store size:', globalThis[globalKey]?.size || 0);
  console.log('🔍 Global memory store keys:', Array.from(globalThis[globalKey]?.keys() || []));

  if (redis) {
    try {
      const data = await redis.get(key);
      console.log('🔍 Redis result:', data ? 'FOUND' : 'NOT FOUND');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis getSession error:', error);
      // Fallback to memory store
      const entry = memoryStore.get(key);
      console.log('🔍 Memory fallback result:', entry ? 'FOUND' : 'NOT FOUND');

      if (!entry) return null;

      if (Date.now() > entry.expires) {
        console.log('🔍 Session expired, deleting');
        memoryStore.delete(key);
        return null;
      }

      return entry.data;
    }
  } else {
    // In-memory fallback
    console.log('🔍 Looking in global memory store for key:', key);
    const entry = memoryStore.get(key);
    console.log('🔍 Global memory store entry:', entry ? 'FOUND' : 'NOT FOUND');

    if (!entry) {
      console.log('🔍 No entry found, available keys:', Array.from(globalThis[globalKey]?.keys() || []));
      return null;
    }

    console.log('🔍 Entry expires at:', new Date(entry.expires));
    console.log('🔍 Current time:', new Date());
    console.log('🔍 Is expired?', Date.now() > entry.expires);

    if (Date.now() > entry.expires) {
      console.log('🔍 Session expired, deleting');
      memoryStore.delete(key);
      return null;
    }

    console.log('🔍 Returning session data:', entry.data);
    return entry.data;
  }
}

/**
 * Update existing session data
 * @param {string} sessionToken - Session token to update
 * @param {Object} sessionData - New session data
 */
export async function updateSession(sessionToken, sessionData) {
  const key = `${SESSION_PREFIX}${sessionToken}`;

  if (redis) {
    try {
      const data = JSON.stringify(sessionData);
      await redis.setex(key, SESSION_EXPIRY, data);
    } catch (error) {
      console.error('Redis updateSession error:', error);
      // Fallback to memory store
      memoryStore.set(key, {
        data: sessionData,
        expires: Date.now() + (SESSION_EXPIRY * 1000)
      });
    }
  } else {
    // In-memory fallback
    memoryStore.set(key, {
      data: sessionData,
      expires: Date.now() + (SESSION_EXPIRY * 1000)
    });
  }
}

/**
 * Delete a session
 * @param {string} sessionToken - Session token to delete
 */
export async function deleteSession(sessionToken) {
  const key = `${SESSION_PREFIX}${sessionToken}`;

  if (redis) {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Redis deleteSession error:', error);
      // Also clean from memory store as fallback
      memoryStore.delete(key);
    }
  } else {
    memoryStore.delete(key);
  }
}

/**
 * Clean up expired sessions (mainly for in-memory store)
 */
export async function cleanExpiredSessions() {
  if (!redis) {
    // Clean expired in-memory sessions
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (now > entry.expires) {
        memoryStore.delete(key);
      }
    }
    console.log('🧹 Cleaned expired in-memory sessions');
  }
  // Redis handles expiration automatically with SETEX
}

/**
 * Get session statistics (for debugging/monitoring)
 * @returns {Object} Session stats
 */
export async function getSessionStats() {
  if (redis) {
    try {
      const keys = await redis.keys(`${SESSION_PREFIX}*`);
      return {
        storageType: 'redis',
        totalSessions: keys.length,
        connected: redis.status === 'ready'
      };
    } catch (error) {
      return {
        storageType: 'redis',
        totalSessions: 0,
        connected: false,
        error: error.message
      };
    }
  } else {
    const now = Date.now();
    const activeSessions = Array.from(memoryStore.entries())
      .filter(([key, entry]) => key.startsWith(SESSION_PREFIX) && now <= entry.expires);

    return {
      storageType: 'memory',
      totalSessions: activeSessions.length,
      memoryUsage: memoryStore.size,
      globalStoreSize: globalThis[globalKey]?.size || 0
    };
  }
}