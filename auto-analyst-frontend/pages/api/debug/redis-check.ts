import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS } from '@/lib/redis'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Forbidden in production' })
  }

  try {
    const token = await getToken({ req })
    if (!token?.sub) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = token.sub
    const userEmail = token.email

    // Get all user data from Redis
    const subscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
    const creditsData = await redis.hgetall(KEYS.USER_CREDITS(userId))
    
    // Also check legacy data
    const legacyCredits = await redis.get(`user_credits:${userEmail}`)
    const legacyCreditsUsed = await redis.get(`user:${userEmail}:creditsUsed`)
    
    // Return all data for debugging
    return res.status(200).json({
      userId,
      userEmail,
      redis: {
        subscription: subscriptionData,
        credits: creditsData,
        legacy: {
          credits: legacyCredits,
          creditsUsed: legacyCreditsUsed
        }
      }
    })
  } catch (error: any) {
    console.error('Redis check error:', error)
    return res.status(500).json({ error: error.message || 'Failed to check Redis data' })
  }
} 