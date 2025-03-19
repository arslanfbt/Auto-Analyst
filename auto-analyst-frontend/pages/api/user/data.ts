import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import { Redis } from '@upstash/redis'

// Create Redis client
const redis = Redis.fromEnv()

// Define subscription plan options to match pricing.tsx tiers
const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    totalCredits: 100,
    amount: 0,
    interval: 'month'
  },
  STANDARD: {
    name: 'Standard',
    totalCredits: 500,
    amount: 15,
    yearlyAmount: 126,
    interval: 'month',
    yearlyInterval: 'year'
  },
  PRO: {
    name: 'Pro',
    totalCredits: Number.MAX_SAFE_INTEGER, // Unlimited
    amount: 29,
    yearlyAmount: 243.60,
    interval: 'month',
    yearlyInterval: 'year'
  }
}

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
    const userId = token.sub || "anonymous"
    
    // Get force flag to bypass caching
    const forceRefresh = req.query.force === 'true'
    console.log(`Fetching user data for ${userEmail} (${userId}) with force=${forceRefresh}`)
    
    // Get timestamp query param (for cache busting)
    const timestamp = req.query._t || Date.now()
    console.log(`Request timestamp: ${timestamp}`)
    
    // Check subscription data in Redis (hash-based storage)
    console.log(`Checking subscription data in Redis...`)
    const subscriptionKey = `user:${userId}:subscription`
    const subscriptionData = await redis.hgetall(subscriptionKey) || {}
    console.log('Subscription data from Redis:', subscriptionData)
    
    // Determine plan key mapping
    let planKey = 'FREE'
    if (subscriptionData.planType) {
      // Use directly stored planType if available
      planKey = subscriptionData.planType as string
    } else if (subscriptionData.plan) {
      // Fall back to parsing from plan name
      const planName = (subscriptionData.plan as string).toUpperCase()
      if (planName.includes('STANDARD')) planKey = 'STANDARD'
      if (planName.includes('PRO')) planKey = 'PRO'
    }
    
    console.log(`Mapped to plan key: ${planKey}`)
    
    // Get plan details from our constants
    const planDetails = SUBSCRIPTION_PLANS[planKey as keyof typeof SUBSCRIPTION_PLANS]
    console.log('Plan details:', planDetails)
    
    // Determine if the plan is monthly or yearly
    const isYearly = subscriptionData.interval === 'year'
    
    // Get appropriate amount based on billing interval
    const amount = isYearly && 'yearlyAmount' in planDetails 
      ? planDetails.yearlyAmount 
      : planDetails.amount
    
    // Get the interval display name
    const interval = isYearly && 'yearlyInterval' in planDetails
      ? planDetails.yearlyInterval
      : planDetails.interval
    
    // Get subscription status
    const status = subscriptionData.status || 'active'
    
    // Handle purchase and renewal dates
    const purchaseDate = subscriptionData.purchaseDate || new Date().toISOString()
    const renewalDate = subscriptionData.renewalDate || 
      calculateRenewalDate(purchaseDate as string, interval as string)
    
    // Handle Stripe IDs
    const stripeCustomerId = subscriptionData.stripeCustomerId || ''
    const stripeSubscriptionId = subscriptionData.stripeSubscriptionId || ''
    
    // Check credit data in Redis with special handling for force refresh
    console.log(`Checking credit data in Redis for user ${userId}...`)
    const creditsKey = KEYS.USER_CREDITS(userId)
    console.log('Credit key to check:', creditsKey)
    
    // Try both key formats
    const creditsData = await redis.hgetall(creditsKey) || {}
    console.log('Credits data from Redis hash:', creditsData)
    
    // Also check direct keys for backup
    const singleCreditsKey = `user_credits:${userEmail}`
    const directCredits = await redis.get(singleCreditsKey)
    console.log('Direct credits key check:', singleCreditsKey, directCredits)
    
    const creditsUsedKey = `user:${userEmail}:creditsUsed`
    const directCreditsUsed = await redis.get(creditsUsedKey)
    console.log('Direct credits used key check:', creditsUsedKey, directCreditsUsed)
    
    // If we're forcing a refresh or if plan has changed, make sure we get the right credit total
    if (forceRefresh || Object.keys(creditsData).length === 0 || 
        (subscriptionData.plan && subscriptionData.planUpdateTime && 
         ((creditsData.planUpdateTime && parseInt(subscriptionData.planUpdateTime as string) > parseInt(creditsData.planUpdateTime as string)) || 
          !creditsData.planUpdateTime))) {
      console.log('Forcing credit refresh or handling plan change...')
      
      // If we have subscription data but no matching credit data, this might be a plan change
      // Let's create a proper credit object with the right total for the plan
      const total = planDetails.totalCredits
      
      // Keep the existing used credits if available
      const used = creditsData.used ? parseInt(creditsData.used as string) : 
                  directCreditsUsed !== null ? parseInt(directCreditsUsed as string) : 0
      
      const now = new Date().toISOString()
      
      // Update the credits in Redis with plan-specific totals
      const updatedCreditsData = {
        total: total.toString(),
        used: used.toString(),
        resetDate: creditsData.resetDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0],
        lastUpdate: now,
        planUpdateTime: Date.now().toString()
      }
      
      console.log('Updating credits with plan-specific data:', updatedCreditsData)
      await redis.hset(creditsKey, updatedCreditsData)
      
      // Use the updated data for our response
      return res.status(200).json({
        profile: {
          name: token.name || 'User',
          email: userEmail,
          image: token.picture,
          joinedDate: subscriptionData.purchaseDate ? 
            (subscriptionData.purchaseDate as string).split('T')[0] : 
            new Date().toISOString().split('T')[0],
          role: planDetails.name
        },
        subscription: {
          plan: planDetails.name,
          status: status,
          renewalDate: renewalDate,
          amount: parseFloat(subscriptionData.amount as string) || amount,
          interval: subscriptionData.interval || interval,
          stripeCustomerId: stripeCustomerId,
          stripeSubscriptionId: stripeSubscriptionId
        },
        credits: {
          total: total,
          used: used,
          resetDate: updatedCreditsData.resetDate,
          lastUpdate: now
        },
        debug: {
          userId,
          planKey,
          forced: forceRefresh,
          planChanged: true,
          rawCreditsData: creditsData,
          updatedCreditsData,
          rawSubscriptionData: subscriptionData,
          timestamp: Date.now()
        }
      })
    }
    
    // Parse credit usage numbers
    let creditsTotal = creditsData.total ? parseInt(creditsData.total as string) : planDetails.totalCredits
    let creditsUsed = creditsData.used ? parseInt(creditsData.used as string) : 0
    
    // For Pro plans, use "Unlimited" for display
    const formattedTotal = planKey === 'PRO' ? 'Unlimited' : creditsTotal
    
    // Get credit update info
    const lastUpdate = creditsData.lastUpdate || new Date().toISOString()
    const resetDate = creditsData.resetDate || renewalDate
    
    // Return the user data
    const userData = {
      profile: {
        name: token.name || 'User',
        email: userEmail,
        image: token.picture,
        joinedDate: subscriptionData.purchaseDate ? 
          (subscriptionData.purchaseDate as string).split('T')[0] : 
          new Date().toISOString().split('T')[0],
        role: planDetails.name
      },
      subscription: {
        plan: planDetails.name,
        status: status,
        renewalDate: renewalDate,
        amount: parseFloat(subscriptionData.amount as string) || amount,
        interval: subscriptionData.interval || interval,
        stripeCustomerId: stripeCustomerId,
        stripeSubscriptionId: stripeSubscriptionId
      },
      credits: {
        used: creditsUsed,
        total: formattedTotal,
        resetDate: resetDate,
        lastUpdate: lastUpdate
      },
      debug: {
        userId,
        timestamp,
        rawSubscriptionData: subscriptionData,
        rawCreditsData: creditsData,
        planKey
      }
    }
    
    console.log('Returning user data:', userData)
    return res.status(200).json(userData)
  } catch (error) {
    console.error('Error fetching user data:', error)
    return res.status(500).json({ error: 'Failed to fetch user data' })
  }
}

function calculateRenewalDate(purchaseDate: string, interval: string): string {
  const date = new Date(purchaseDate)
  
  if (interval === 'month') {
    // Add one month to the purchase date
    date.setMonth(date.getMonth() + 1)
  } else if (interval === 'year') {
    // Add one year to the purchase date
    date.setFullYear(date.getFullYear() + 1)
  }
  
  return date.toISOString().split('T')[0]
}

// Add key definitions if needed
export const KEYS = {
  USER_SUBSCRIPTION: (userId: string) => `user:${userId}:subscription`,
  USER_CREDITS: (userId: string) => `user:${userId}:credits`,
} 