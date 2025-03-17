import { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import redis from '@/lib/redis'

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

    // Get the user's credits from Redis
    const credits = await redis.get(`user:${userId}:credits`)
    const lastReset = await redis.get(`user:${userId}:last_reset`) || new Date().toISOString()
    const usedCredits = await redis.get(`user:${userId}:used_credits`)

    // Ensure values are strings or numbers before parsing
    const parseValue = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return parseInt(value) || 0;
      return 0;
    };

    // Return the user's credits with safe parsing
    return res.status(200).json({
      total: parseValue(credits),
      used: parseValue(usedCredits),
      remaining: parseValue(credits) - parseValue(usedCredits),
      lastReset
    })
  } catch (error: any) {
    console.error('Error getting credits:', error)
    return res.status(500).json({ error: error.message || 'Failed to get credits' })
  }
} 