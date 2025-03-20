import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS, subscriptionUtils } from '@/lib/redis'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = await getToken({ req })
    if (!token?.sub) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = token.sub
    const userEmail = token.email

    // Get requested plan to downgrade to
    const { targetPlan } = req.body
    
    if (!targetPlan) {
      return res.status(400).json({ error: 'Target plan is required' })
    }
    
    // Determine plan properties based on target plan
    let planName = 'Free Plan'
    let planType = 'FREE'
    let creditTotal = 100
    
    if (targetPlan.toLowerCase() === 'standard') {
      planName = 'Standard Plan'
      planType = 'STANDARD'
      creditTotal = 500
    }
    
    // Pro plan shouldn't be reached here as this is for downgrades
    // but adding it for completeness
    if (targetPlan.toLowerCase() === 'pro') {
      planName = 'Pro Plan'
      planType = 'PRO'
      creditTotal = 999999
    }
    
    const now = new Date()
    
    // Calculate next reset date (first day of next month)
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    
    // Update subscription data in Redis
    const subscriptionData = {
      plan: planName,
      planType: planType,
      status: 'active',
      amount: targetPlan.toLowerCase() === 'standard' ? '15' : '0',
      interval: 'month',
      purchaseDate: now.toISOString(),
      renewalDate: resetDate.toISOString().split('T')[0],
      lastUpdated: now.toISOString(),
      // Keep the existing Stripe customer/subscription IDs if moving to Standard
      // Clear them if moving to Free
      stripeCustomerId: targetPlan.toLowerCase() === 'free' ? '' : await redis.hget(KEYS.USER_SUBSCRIPTION(userId), 'stripeCustomerId') || '',
      stripeSubscriptionId: targetPlan.toLowerCase() === 'free' ? '' : await redis.hget(KEYS.USER_SUBSCRIPTION(userId), 'stripeSubscriptionId') || ''
    }
    
    // Get current credits used
    const currentCreditsData = await redis.hgetall(KEYS.USER_CREDITS(userId))
    const creditsUsed = currentCreditsData && currentCreditsData.used 
      ? parseInt(currentCreditsData.used as string) 
      : 0
    
    // Update credits data - maintain the used credits count but adjust the total
    // This ensures users don't suddenly get more credits by downgrading and upgrading
    const creditData = {
      total: creditTotal.toString(),
      used: Math.min(creditsUsed, creditTotal).toString(), // Ensure used doesn't exceed new total
      resetDate: resetDate.toISOString().split('T')[0],
      lastUpdate: now.toISOString(),
      planUpdateTime: Date.now().toString()
    }
    
    // Update Redis data
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), subscriptionData)
    await redis.hset(KEYS.USER_CREDITS(userId), creditData)

    // Return success with updated plan data
    return res.status(200).json({
      success: true,
      subscription: subscriptionData,
      credits: creditData
    })
  } catch (error: any) {
    console.error('Error downgrading plan:', error)
    return res.status(500).json({ error: error.message || 'Failed to downgrade plan' })
  }
} 