import { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS } from '@/lib/redis'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the user token
    const token = await getToken({ req })
    if (!token?.sub) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = token.sub
    
    // Try the new hash-based approach first
    const creditsHash = await redis.hgetall(KEYS.USER_CREDITS(userId));
    const subscriptionHash = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId));
    
    let planName, creditsUsed, creditsTotal, resetDate, lastUpdate;
    
    if (creditsHash && creditsHash.total) {
      // Use hash data
      creditsTotal = parseInt(creditsHash.total as string);
      creditsUsed = parseInt(creditsHash.used as string || '0');
      resetDate = creditsHash.resetDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0];
      lastUpdate = creditsHash.lastUpdate || new Date().toISOString();
      planName = subscriptionHash?.plan || 'Free Plan';
    } else {
      // Fall back to legacy keys
      planName = await redis.get(`user:${userId}:planName`) || 'Free Plan';
      creditsUsed = parseInt(await redis.get(`user:${userId}:creditsUsed`) || '0');
      creditsTotal = parseInt(await redis.get(`user:${userId}:creditsTotal`) || 
        planName === 'Pro Plan' ? '999999' : '1000');
      resetDate = await redis.get(`user:${userId}:creditsResetDate`) || 
        new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0];
      lastUpdate = await redis.get(`user:${userId}:creditsLastUpdate`) || new Date().toISOString();
    }
    
    // Update the last update timestamp
    const currentTime = new Date().toISOString();
    
    // Update in both formats
    if (creditsHash) {
      await redis.hset(KEYS.USER_CREDITS(userId), {
        lastUpdate: currentTime
      });
    }
    await redis.set(`user:${userId}:creditsLastUpdate`, currentTime);
    
    // Return the credit data
    res.status(200).json({
      used: creditsUsed,
      total: creditsTotal === 999999 ? Infinity : creditsTotal,
      resetDate,
      lastUpdate: currentTime,
    })
  } catch (error: any) {
    console.error('API error:', error)
    res.status(500).json({ error: error.message || 'Failed to refresh credit data' })
  }
} 