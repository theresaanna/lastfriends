// pages/api/workers/track-collector.js
import { getTrackCollectorQueue, JOB_TYPES } from '../../../utils/jobQueue.js';
import { getUserData, getUserTopTracksWithPagination } from '../../../utils/lastfm.js';
import { setCachedData, getCachedData, isRedisAvailable } from '../../../utils/redis.js';

export default async function handler(req, res) {
  // Security: Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: Add API key protection
  if (process.env.WORKER_API_KEY && req.headers['x-api-key'] !== process.env.WORKER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      return res.status(503).json({ error: 'Redis not available' });
    }

    const queue = getTrackCollectorQueue();

    // Process up to 5 jobs per invocation (Vercel timeout limits)
    const jobs = await queue.getWaiting(5);

    if (jobs.length === 0) {
      return res.status(200).json({ message: 'No jobs to process' });
    }

    const results = [];
    for (const job of jobs) {
      try {
        const result = await processJob(job);
        results.push({ jobId: job.id, status: 'completed', result });
        await job.moveToCompleted(result);
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        results.push({ jobId: job.id, status: 'failed', error: error.message });
        await job.moveToFailed(error);
      }
    }

    return res.status(200).json({
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('Worker function error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Job processing logic (extracted from your worker)
async function processJob(job) {
  const { type, username, period } = job.data;

  if (type === JOB_TYPES.COLLECT_USER_TRACKS) {
    // ... your existing track collection logic
    // (simplified for serverless execution)
  }

  return { username, period, processed: true };
}