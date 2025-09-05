// pages/api/jobs.js - Job management API
import { queueTrackCollection, getJobStatus } from '../../utils/jobQueue.js';
import { isRedisAvailable } from '../../utils/redis.js';

export default async function handler(req, res) {
  // Check if Redis/workers are available
  const redisAvailable = await isRedisAvailable();
  if (!redisAvailable) {
    return res.status(503).json({
      error: 'Background workers not available. Using fallback processing.',
      code: 'WORKERS_UNAVAILABLE'
    });
  }

  try {
    switch (req.method) {
      case 'POST':
        return await handleCreateJob(req, res);

      case 'GET':
        return await handleGetJobStatus(req, res);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Jobs API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

async function handleCreateJob(req, res) {
  const { username, period = 'overall', priority = 'normal' } = req.body;

  if (!username) {
    return res.status(400).json({
      error: 'Username is required'
    });
  }

  try {
    const jobId = await queueTrackCollection(username, period, priority);

    return res.status(201).json({
      success: true,
      jobId,
      message: `Track collection job queued for ${username}`,
      username,
      period
    });
  } catch (error) {
    console.error('Error creating job:', error);
    return res.status(500).json({
      error: 'Failed to queue track collection job',
      message: error.message
    });
  }
}

async function handleGetJobStatus(req, res) {
  const { jobId } = req.query;

  if (!jobId) {
    return res.status(400).json({
      error: 'Job ID is required'
    });
  }

  try {
    const status = await getJobStatus(jobId);

    return res.status(200).json({
      success: true,
      jobId,
      ...status
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    return res.status(500).json({
      error: 'Failed to get job status',
      message: error.message
    });
  }
}