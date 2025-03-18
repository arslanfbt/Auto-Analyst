import { NextApiRequest, NextApiResponse } from 'next';
import redisInstance, { KEYS, creditUtils } from '@/lib/redis';
import { getToken } from 'next-auth/jwt';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow in development mode or for authenticated users
  if (process.env.NODE_ENV !== 'development') {
    const token = await getToken({ req });
    if (!token?.sub) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  
  try {
    const testUserId = req.query.userId || 'test-user';
    
    // Check Redis connection
    const pingResult = await redisInstance.ping();
    
    // Try to get user credits
    const userCredits = await creditUtils.getRemainingCredits(testUserId as string);
    
    // Try to initialize some test data
    const testKey = `redis-debug-test-${Date.now()}`;
    const setResult = await redisInstance.set(testKey, 'test-value');
    const getResult = await redisInstance.get(testKey);
    
    // Try to delete the test key
    const deleteResult = await redisInstance.del(testKey);
    
    // Try to create a hash
    const hashKey = `redis-debug-hash-${Date.now()}`;
    const hashResult = await redisInstance.hset(hashKey, {
      field1: 'value1',
      field2: 'value2'
    });
    
    // Get the hash
    const hashGetResult = await redisInstance.hgetall(hashKey);
    
    // Delete the hash
    const hashDeleteResult = await redisInstance.del(hashKey);
    
    // Return all debug info
    return res.status(200).json({
      connectionStatus: {
        ping: pingResult
      },
      userCredits,
      testOperations: {
        set: setResult,
        get: getResult,
        delete: deleteResult,
        hash: {
          set: hashResult,
          get: hashGetResult,
          delete: hashDeleteResult
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasRedisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        hasRedisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
      }
    });
  } catch (error) {
    console.error('Redis debug error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    });
  }
}