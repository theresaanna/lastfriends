// utils/jobQueue.js - Job queue management
import Queue from 'bull';
import { getRedisClient } from './redis.js';

let trackCollectorQueue = null;

export function getTrackCollectorQueue() {
  if (!trackCollectorQueue) {
    const redis = getRedisClient();

    trackCollectorQueue = new Queue('track collection', {
      redis: {
        port: redis.options.port,
        host: redis.options.host,
        password: redis.options.password,
        db: redis.options.db || 0
      },
      defaultJobOptions: {
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 50,     // Keep last 50 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    trackCollectorQueue.on('error', (error) => {
      console.error('Queue error:', error);
    });

    trackCollectorQueue.on('waiting', (jobId) => {
      console.log(`Job ${jobId} is waiting`);
    });

    trackCollectorQueue.on('active', (job) => {
      console.log(`Job ${job.id} started processing`);
    });

    trackCollectorQueue.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    trackCollectorQueue.on('failed', (job, err) => {
      console.error(`Job ${job.id} failed:`, err.message);
    });
  }

  return trackCollectorQueue;
}

// Job types
export const JOB_TYPES = {
  COLLECT_USER_TRACKS: 'collect_user_tracks',
  UPDATE_USER_DATA: 'update_user_data'
};

// Add a job to collect all tracks for a user
export async function queueTrackCollection(username, period = 'overall', priority = 'normal') {
  try {
    const queue = getTrackCollectorQueue();

    const jobData = {
      type: JOB_TYPES.COLLECT_USER_TRACKS,
      username,
      period,
      timestamp: Date.now()
    };

    const jobOptions = {
      priority: priority === 'high' ? 1 : priority === 'low' ? 10 : 5,
      delay: 0
    };

    const job = await queue.add(jobData, jobOptions);
    console.log(`Queued track collection job ${job.id} for user ${username}`);

    return job.id;
  } catch (error) {
    console.error('Error queueing track collection:', error);
    throw error;
  }
}

// Get job status
export async function getJobStatus(jobId) {
  try {
    const queue = getTrackCollectorQueue();
    const job = await queue.getJob(jobId);

    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      status: state,
      progress: progress,
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason
    };
  } catch (error) {
    console.error('Error getting job status:', error);
    return { status: 'error', error: error.message };
  }
}