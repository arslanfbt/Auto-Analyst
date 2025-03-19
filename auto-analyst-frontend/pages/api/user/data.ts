import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import { Redis } from '@upstash/redis'

// Create Redis client
const redis = Redis.fromEnv()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Use getToken instead of getServerSession to avoid the dependency
  const token = await getToken({ req })
  
  if (!token || !token.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const userEmail = token.email
    
    // Use correct key format from Upstash screenshot
    const creditKey = `user_credits:${userEmail}`
    let remainingCredits = await redis.get(creditKey) || 0
    
    // Directly fetch used credits instead of calculating
    const creditsUsedKey = `user:${userEmail}:creditsUsed`
    let creditsUsed = await redis.get(creditsUsedKey) || 0

    // Total credits for the user's plan
    const totalCredits = 100 // Default for free plan
    
    // Get timestamp of last credit update
    // This uses userId format as seen in screenshot
    const userId = token.sub || "anonymous"
    const lastUpdateKey = `user:${userId}:creditsLastUpdate`
    const lastUpdate = await redis.get(lastUpdateKey) || new Date().toISOString()
    
    // Get user join date if available
    const joinDateKey = `user:${userId}:joinDate`
    const joinDate = await redis.get(joinDateKey) || '2023-01-01'

    // Calculate reset date
    const resetDate = calculateResetDate()

    const userData = {
      profile: {
        name: token.name || 'User',
        email: userEmail,
        image: token.picture,
        joinedDate: joinDate,
        role: 'Free'
      },
      subscription: {
        plan: 'Free',
        status: 'active',
        renewalDate: resetDate,
        amount: 0,
        interval: 'month'
      },
      credits: {
        used: Number(creditsUsed),
        total: totalCredits,
        resetDate: resetDate,
        lastUpdate: lastUpdate
      }
    }

    return res.status(200).json(userData)
  } catch (error) {
    console.error('Error fetching user data:', error)
    return res.status(500).json({ error: 'Failed to fetch user data' })
  }
}

function calculateResetDate(): string {
  const today = new Date()
  const resetDate = new Date(today.getFullYear(), today.getMonth() + 2, 0)
  return resetDate.toISOString().split('T')[0]
} 