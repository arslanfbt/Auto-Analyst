import { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS } from '@/lib/redis'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the user token to verify authorization
    const token = await getToken({ req })
    if (!token?.sub) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = token.sub
    const { credits = 1, description = 'Chat usage' } = req.body
    
    // Get current credit data
    const creditsHash = await redis.hgetall(KEYS.USER_CREDITS(userId))
    
    if (!creditsHash || !creditsHash.total) {
      // Initialize new user with default credits
      await redis.hset(KEYS.USER_CREDITS(userId), {
        total: '100',
        used: credits.toString(),
        resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0],
        lastUpdate: new Date().toISOString()
      })
      
      return res.status(200).json({
        success: true,
        remaining: 100 - credits,
        deducted: credits
      })
    }
    
    // Calculate new used amount
    const total = parseInt(creditsHash.total as string)
    const currentUsed = creditsHash.used ? parseInt(creditsHash.used as string) : 0
    const newUsed = currentUsed + credits
    
    // Update the credits hash
    await redis.hset(KEYS.USER_CREDITS(userId), {
      used: newUsed.toString(),
      lastUpdate: new Date().toISOString()
    })
    
    console.log(`Deducted ${credits} credits for user ${userId}. New total: ${total - newUsed}`)
    
    // Return updated credit information
    return res.status(200).json({
      success: true,
      remaining: total - newUsed,
      deducted: credits,
      description
    })
  } catch (error: any) {
    console.error('Error deducting credits:', error)
    return res.status(500).json({ error: error.message || 'Failed to deduct credits' })
  }
} 