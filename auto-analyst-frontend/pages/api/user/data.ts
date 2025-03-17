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
    
    // Load user profile information
    const email = token.email || 'user@example.com'
    const name = token.name || 'User'
    const image = token.picture || undefined
    
    // Get user join date or use current date
    const joinedDate = await redis.get(`user:${userId}:joinDate`) || new Date().toISOString().split('T')[0]
    // Store join date if it doesn't exist
    if (!await redis.exists(`user:${userId}:joinDate`)) {
      await redis.set(`user:${userId}:joinDate`, joinedDate)
      
      // Also store in new hash format
      await redis.hset(KEYS.USER_PROFILE(userId), {
        name,
        email,
        joinDate: joinedDate,
        role: 'user'
      });
    }
    
    // Try to get data from the new hash-based format
    const subscriptionHash = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId));
    const creditsHash = await redis.hgetall(KEYS.USER_CREDITS(userId));
    
    // Use hash data if available, otherwise fall back to individual keys
    let planName, planStatus, planAmount, planInterval, planRenewalDate;
    let creditsUsed, creditsTotal, creditsResetDate, creditsLastUpdate;
    
    // Get subscription data
    if (subscriptionHash && subscriptionHash.plan) {
      planName = subscriptionHash.plan;
      planStatus = subscriptionHash.status || 'inactive';
      planAmount = parseFloat(subscriptionHash.amount as string || '0');
      planInterval = subscriptionHash.interval || 'month';
      planRenewalDate = subscriptionHash.renewalDate || 'N/A';
    } else {
      // Fall back to legacy keys
      planName = await redis.get(`user:${userId}:planName`) || 'Free Plan';
      planStatus = await redis.get(`user:${userId}:planStatus`) || 'inactive';
      planAmount = parseFloat(await redis.get(`user:${userId}:planAmount`) || '0');
      planInterval = await redis.get(`user:${userId}:planInterval`) || 'month';
      planRenewalDate = await redis.get(`user:${userId}:planRenewalDate`) || 'N/A';
    }
    
    // Get credit usage data
    if (creditsHash && creditsHash.total) {
      creditsTotal = parseInt(creditsHash.total as string);
      creditsUsed = parseInt(creditsHash.used as string || '0');
      creditsResetDate = creditsHash.resetDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0];
      creditsLastUpdate = creditsHash.lastUpdate || new Date().toISOString();
    } else {
      // Fall back to legacy keys
      creditsUsed = parseInt(await redis.get(`user:${userId}:creditsUsed`) || '0');
      creditsTotal = parseInt(await redis.get(`user:${userId}:creditsTotal`) || 
        planName === 'Pro Plan' ? '999999' : '100');
      creditsResetDate = await redis.get(`user:${userId}:creditsResetDate`) || 
        new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0];
      creditsLastUpdate = await redis.get(`user:${userId}:creditsLastUpdate`) || new Date().toISOString();
    }
    
    // Prepare response object
    const userData = {
      profile: {
        name,
        email,
        image,
        joinedDate,
        role: 'user',
      },
      subscription: planName === 'Free Plan' && planStatus === 'inactive' ? null : {
        plan: planName,
        status: planStatus,
        renewalDate: planRenewalDate,
        amount: planAmount,
        interval: planInterval,
      },
      credits: {
        used: creditsUsed,
        total: creditsTotal === 999999 ? Infinity : creditsTotal,
        resetDate: creditsResetDate,
        lastUpdate: creditsLastUpdate,
      }
    }
    
    res.status(200).json(userData)
  } catch (error: any) {
    console.error('API error:', error)
    res.status(500).json({ error: error.message || 'Failed to load user data' })
  }
} 