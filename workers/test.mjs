// workers/test.mjs - Simple test to check if worker system works
console.log('🚀 Test worker starting...');

try {
  const Redis = (await import('ioredis')).default;
  console.log('✅ Redis import successful');

  const redis = new Redis('redis://localhost:6379');

  redis.on('connect', () => {
    console.log('✅ Redis connected');
  });

  redis.on('error', (err) => {
    console.error('❌ Redis error:', err.message);
  });

  // Test Redis
  await redis.ping();
  console.log('✅ Redis ping successful');

  // Test Bull queue
  const Queue = (await import('bull')).default;
  console.log('✅ Bull import successful');

  const testQueue = new Queue('test queue', {
    redis: { port: 6379, host: 'localhost' }
  });

  console.log('✅ Queue created successfully');

  // Add a test job
  const job = await testQueue.add({ message: 'test job' });
  console.log('✅ Test job added:', job.id);

  // Process jobs
  testQueue.process(async (job) => {
    console.log('🎯 Processing job:', job.data.message);
    return { result: 'success' };
  });

  console.log('✅ Test worker ready and listening for jobs');

} catch (error) {
  console.error('❌ Worker setup failed:', error.message);
  console.error('Stack:', error.stack);
}