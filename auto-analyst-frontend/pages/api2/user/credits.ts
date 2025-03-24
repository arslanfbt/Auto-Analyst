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
    
    // Get credits from hash
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
      // Initialize default values for new users
      creditsTotal = 100;
      creditsUsed = 0;
      resetDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0];
      lastUpdate = new Date().toISOString();
      planName = 'Free Plan';
      
      // Create hash entry for new users
      await redis.hset(KEYS.USER_CREDITS(userId), {
        total: creditsTotal.toString(),
        used: creditsUsed.toString(),
        resetDate,
        lastUpdate
      });
    }
    
    // Update the last update timestamp
    const currentTime = new Date().toISOString();
    
    await redis.hset(KEYS.USER_CREDITS(userId), {
      lastUpdate: currentTime
    });
    
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