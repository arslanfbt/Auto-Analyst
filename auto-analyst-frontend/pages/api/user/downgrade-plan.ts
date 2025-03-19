import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS } from '@/lib/redis'

// Define subscription plan constants
const PLAN_DETAILS = {
  'Free Plan': {
    name: 'Free Plan',
    planType: 'FREE',
    amount: '0',
    interval: 'month',
    credits: 100
  },
  'Standard Plan': {
    name: 'Standard Plan',
    planType: 'STANDARD',
    amount: '15',
    interval: 'month',
    credits: 500
  },
  'Pro Plan': {
    name: 'Pro Plan',
    planType: 'PRO',
    amount: '29',
    interval: 'month',
    credits: 999999
  }
}

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
    const { targetPlan } = req.body

    if (!targetPlan || !PLAN_DETAILS[targetPlan as keyof typeof PLAN_DETAILS]) {
      return res.status(400).json({ error: 'Invalid plan specified' })
    }

    const planDetails = PLAN_DETAILS[targetPlan as keyof typeof PLAN_DETAILS]
    const now = new Date()
    
    // Get current subscription data to preserve certain fields
    const currentSubscription = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
    const currentCredits = await redis.hgetall(KEYS.USER_CREDITS(userId))
    
    // Calculate next month for reset date
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(1) // First day of next month
    const resetDate = nextMonth.toISOString().split('T')[0]

    // Prepare subscription data
    const subscriptionData = {
      plan: planDetails.name,
      planType: planDetails.planType,
      status: 'active',
      amount: planDetails.amount,
      interval: planDetails.interval,
      purchaseDate: currentSubscription?.purchaseDate || now.toISOString(),
      renewalDate: resetDate,
      lastUpdated: now.toISOString(),
      planUpdateTime: Date.now().toString(),
      // Preserve stripe IDs if they exist
      stripeCustomerId: currentSubscription?.stripeCustomerId || '',
      stripeSubscriptionId: currentSubscription?.stripeSubscriptionId || ''
    }

    // Fix the used credits calculation to handle parsing errors
    const usedCredits = (() => {
      try {
        // If credits exist, use them (capped at new plan limit)
        if (currentCredits?.used) {
          const parsed = parseInt(String(currentCredits.used));
          return isNaN(parsed) ? 0 : Math.min(parsed, planDetails.credits);
        }
        return 0;
      } catch (err) {
        console.error('Error parsing used credits:', err);
        return 0;
      }
    })();

    // Ensure the creditData has all required fields
    const creditData = {
      total: planDetails.credits.toString(),
      used: usedCredits.toString(),
      resetDate: resetDate,
      lastUpdate: now.toISOString(),
      planUpdateTime: Date.now().toString()
    }

    // Add debug logging to track values
    console.log('Downgrading plan - updating credits:', {
      userId,
      currentUsed: currentCredits?.used,
      newUsed: usedCredits,
      newTotal: planDetails.credits,
      targetPlan
    });

    // Update Redis with transaction to ensure atomicity
    const pipeline = redis.pipeline();
    pipeline.hset(KEYS.USER_SUBSCRIPTION(userId), subscriptionData);
    pipeline.hset(KEYS.USER_CREDITS(userId), creditData);

    // Update legacy keys if email available
    const userEmail = await redis.hget(KEYS.USER_PROFILE(userId), 'email');
    if (userEmail) {
      pipeline.set(`user_credits:${userEmail}`, planDetails.credits);
      pipeline.set(`user:${userEmail}:creditsUsed`, usedCredits);
      pipeline.set(`user:${userEmail}:planName`, planDetails.name);
      pipeline.set(`user:${userEmail}:creditsTotal`, planDetails.credits);
    }

    // Execute all Redis commands atomically
    await pipeline.exec();

    return res.status(200).json({
      success: true,
      message: `Successfully downgraded to ${planDetails.name}`,
      data: {
        subscription: subscriptionData,
        credits: creditData
      }
    })
  } catch (error: any) {
    console.error('Error downgrading plan:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to downgrade plan' 
    })
  }
} 