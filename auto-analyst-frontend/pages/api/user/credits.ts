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
    
    // Get the latest credit usage data from redis or your backend
    const planName = await redis.get(`user:${userId}:planName`) || 'Free Plan'
    const creditsUsed = parseInt(await redis.get(`user:${userId}:creditsUsed`) || '0')
    const creditsTotal = parseInt(await redis.get(`user:${userId}:creditsTotal`) || 
      planName === 'Pro Plan' ? '999999' : '1000') 
    const resetDate = await redis.get(`user:${userId}:creditsResetDate`) || 
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0]
    
    // Update the last update timestamp
    const currentTime = new Date().toISOString()
    await redis.set(`user:${userId}:creditsLastUpdate`, currentTime)
    
    // Return the updated credit data
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