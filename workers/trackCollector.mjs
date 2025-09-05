// workers/trackCollector.mjs - Background worker for track collection

// Load environment variables from .env.local
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually since this is a standalone process
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf8');

  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, '');
      process.env[key.trim()] = cleanValue;
    }
  });

  console.log('✅ Environment variables loaded from .env.local');
  console.log('📧 LASTFM_API_KEY:', process.env.LASTFM_API_KEY ? 'Found' : 'Missing');
  console.log('🔍 API Key preview:', process.env.LASTFM_API_KEY ? process.env.LASTFM_API_KEY.substring(0, 8) + '...' : 'None');
} catch (error) {
  console.warn('⚠️  Could not load .env.local:', error.message);
  console.log('📧 LASTFM_API_KEY from system:', process.env.LASTFM_API_KEY ? 'Found' : 'Missing');
}

import { getTrackCollectorQueue, JOB_TYPES } from '../utils/jobQueue.js';
import { getUserData, getUserTopTracks } from '../utils/lastfm.js';
import { setCachedData, getCachedData } from '../utils/redis.js';

console.log('🚀 Starting track collector worker...');

// Debug: Check if API key is still available after imports
console.log('🔍 After imports - LASTFM_API_KEY:', process.env.LASTFM_API_KEY ? 'Still found' : 'Lost!');

const queue = getTrackCollectorQueue();

// Process jobs from the queue
queue.process(async (job) => {
  const { type, username, period } = job.data;

  console.log(`Processing job ${job.id}: ${type} for user ${username}`);

  try {
    switch (type) {
      case JOB_TYPES.COLLECT_USER_TRACKS:
        return await collectUserTracks(job, username, period);

      case JOB_TYPES.UPDATE_USER_DATA:
        return await updateUserData(job, username, period);

      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    throw error;
  }
});

// Collect comprehensive track data for a user
async function collectUserTracks(job, username, period) {
  const progressSteps = {
    STARTING: 10,
    BASIC_DATA: 30,
    COLLECTING_TRACKS: 50,
    PAGINATING: 80,
    CACHING: 90,
    COMPLETE: 100
  };

  // Update progress
  await job.progress(progressSteps.STARTING);

  // Check if we already have cached data
  const cacheKey = `user_full_data:${username}:${period}`;
  const existingData = await getCachedData(cacheKey);

  if (existingData && existingData.tracks && existingData.tracks.length > 200) {
    console.log(`Using cached data for ${username} (${existingData.tracks.length} tracks)`);
    await job.progress(progressSteps.COMPLETE);
    return {
      username,
      period,
      tracksCollected: existingData.tracks.length,
      fromCache: true
    };
  }

  await job.progress(progressSteps.BASIC_DATA);

  // Get basic user data first
  const basicData = await getUserData(username, period);

  await job.progress(progressSteps.COLLECTING_TRACKS);

  // Collect tracks in batches
  const allTracks = [];
  const batchSize = 200; // Last.fm max per request
  let page = 1;
  let hasMorePages = true;
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 3; // Stop after 3 failed pages in a row

  while (hasMorePages && allTracks.length < 2000 && consecutiveFailures < maxConsecutiveFailures) {
    try {
      console.log(`Collecting page ${page} for ${username}`);

      // Get tracks for this page
      const tracks = await getUserTopTracksWithPagination(username, period, page, batchSize);

      if (tracks && tracks.length > 0) {
        allTracks.push(...tracks);
        consecutiveFailures = 0; // Reset failure counter on success

        // Update progress based on tracks collected
        const progressPercent = Math.min(
          progressSteps.COLLECTING_TRACKS +
          (allTracks.length / 2000) * (progressSteps.PAGINATING - progressSteps.COLLECTING_TRACKS),
          progressSteps.PAGINATING
        );
        await job.progress(progressPercent);

        // Check if we got fewer results than requested (indicates last page)
        if (tracks.length < batchSize) {
          hasMorePages = false;
          console.log(`Reached last page for ${username} (got ${tracks.length} tracks)`);
        } else {
          page++;
        }

        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 250));
      } else {
        consecutiveFailures++;
        hasMorePages = false;
        console.log(`No tracks returned for ${username}, page ${page}`);
      }
    } catch (error) {
      consecutiveFailures++;
      console.error(`Error collecting page ${page} for ${username}:`, error.message);

      if (consecutiveFailures >= maxConsecutiveFailures) {
        console.log(`Stopping collection for ${username} after ${maxConsecutiveFailures} consecutive failures`);
        break;
      } else {
        console.log(`Continuing collection for ${username} (failure ${consecutiveFailures}/${maxConsecutiveFailures})`);
        page++; // Try next page
        // Longer wait after failure
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  await job.progress(progressSteps.CACHING);

  console.log(`🔍 About to cache ${allTracks.length} tracks for ${username}`);

  // Prepare enhanced user data
  const enhancedData = {
    ...basicData,
    tracks: allTracks,
    tracksCollected: allTracks.length, // Separate field for collected count
    collectedAt: new Date().toISOString(),
    period
    // Don't override trackCount - keep original userInfo intact
  };

  console.log('🔍 Enhanced data prepared, size:', JSON.stringify(enhancedData).length, 'bytes');

  // Cache the results for 24 hours
  try {
    const cacheResult = await setCachedData(cacheKey, enhancedData, 86400);
    console.log('🔍 Cache operation result:', cacheResult);
    if (cacheResult) {
      console.log('✅ Successfully cached enhanced data for', username);
    } else {
      console.warn('⚠️ Failed to cache enhanced data for', username);
    }
  } catch (cacheError) {
    console.error('❌ Error caching data:', cacheError.message);
  }

  await job.progress(progressSteps.COMPLETE);

  console.log(`Collected ${allTracks.length} tracks for ${username}`);

  return {
    username,
    period,
    tracksCollected: allTracks.length,
    fromCache: false
  };
}

// Helper function to get tracks with pagination
async function getUserTopTracksWithPagination(username, period, page, limit) {
  try {
    // Import the function dynamically to ensure we have the latest version
    const { getUserTopTracksWithPagination: getTracksWithPagination } = await import('../utils/lastfm.js');
    return await getTracksWithPagination(username, period, page, limit);
  } catch (error) {
    console.error(`Error getting tracks for ${username}, page ${page}:`, error);
    return [];
  }
}

// Update user data (lighter operation)
async function updateUserData(job, username, period) {
  await job.progress(50);

  const userData = await getUserData(username, period);
  const cacheKey = `user_basic_data:${username}:${period}`;

  await setCachedData(cacheKey, userData, 3600); // Cache for 1 hour

  await job.progress(100);

  return {
    username,
    period,
    updated: true
  };
}

console.log('Track collector worker is ready and waiting for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Worker shutting down...');
  await queue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Worker shutting down...');
  await queue.close();
  process.exit(0);
});