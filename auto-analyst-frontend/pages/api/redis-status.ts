import { NextApiRequest, NextApiResponse } from 'next'
import { testServerRedisConnection } from '@/lib/server/redis-server'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Test if environment variables are available
    const envCheck = {
      UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    };
    
    // Test Redis connection
    const connectionTest = await testServerRedisConnection();
    
    return res.status(connectionTest.success ? 200 : 500).json({
      status: connectionTest.success ? 'success' : 'error',
      message: connectionTest.message,
      environmentVariables: envCheck,
      nodeEnv: process.env.NODE_ENV
    });
  } catch (error: any) {
    console.error('Redis status endpoint error:', error);
    return res.status(500).json({ 
      status: 'error',
      message: error.message || 'Failed to connect to Redis',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
} 