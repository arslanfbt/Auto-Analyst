import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import redis, { subscriptionUtils } from '@/lib/redis'

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
    
    // Get subscription data using our optimized utility
    const subscriptionData = await subscriptionUtils.getUserSubscriptionData(userId);
    
    // Check if the user can use credits (for quick validation)
    const canUseCredits = await subscriptionUtils.canUseCredits(userId);
    
    res.status(200).json({
      ...subscriptionData,
      canUseCredits
    })
  } catch (error: any) {
    console.error('API error checking subscription:', error)
    res.status(500).json({ error: error.message || 'Failed to check subscription' })
  }
} 