import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS, subscriptionUtils, profileUtils } from '@/lib/redis'
import { CreditConfig, PLAN_CREDITS } from '@/lib/credits-config'

export async function GET(request: NextRequest) {
  // Use getToken to authenticate
  const token = await getToken({ req: request })
  
  if (!token || !token.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const userEmail = token.email
    const userId = token.sub || "anonymous"
    
    // Get force flag to bypass caching
    const searchParams = request.nextUrl.searchParams
    const forceRefresh = searchParams.get('force') === 'true' || searchParams.get('refresh') === 'true'
    
    // Check if we should force a credits check/refresh
    if (forceRefresh) {
      await subscriptionUtils.refreshCreditsIfNeeded(userId)
    }
    
    // Get timestamp query param (for cache busting)
    const timestamp = searchParams.get('_t') || Date.now()
    
    // Check subscription data in Redis (hash-based storage)
    const subscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId)) || {}
    
    // Determine plan using centralized config
    let planType = subscriptionData.planType || 'FREE'
    let planCredits = CreditConfig.getCreditsByType(planType as any)
    
    // Fallback to plan name if planType not found
    if (!planCredits || planCredits.type === 'FREE' && subscriptionData.plan) {
      planCredits = CreditConfig.getCreditsForPlan(subscriptionData.plan as string)
    }
    
    // Get subscription values from Redis with defaults from centralized config
    const amount = subscriptionData.amount ? parseFloat(subscriptionData.amount as string) : 0
    const purchaseDate = subscriptionData.purchaseDate || new Date().toISOString()
    const interval = subscriptionData.interval || 'month'
    let status = subscriptionData.status || 'inactive'
    
    // Override status for Free plans - Free plans should always be active
    if (planCredits.type === 'FREE') {
      status = 'active'
    }
    
    const stripeCustomerId = subscriptionData.stripeCustomerId || ''
    const stripeSubscriptionId = subscriptionData.stripeSubscriptionId || ''
    
    // Calculate renewal date based on purchase date and interval
    let renewalDate = subscriptionData.renewalDate as string || calculateRenewalDate(purchaseDate as string, interval as string)
    
    // Get credit data from Redis
    const creditsData = await redis.hgetall(KEYS.USER_CREDITS(userId)) || {}
    
    // Parse credits with fallback using centralized config
    const creditsTotal = parseInt(creditsData.total as string || CreditConfig.getDefaultInitialCredits().toString())
    const creditsUsed = parseInt(creditsData.used as string || '0')
    const resetDate = creditsData.resetDate as string || CreditConfig.getNextResetDate()
    const lastUpdate = creditsData.lastUpdate as string || new Date().toISOString()

    // Format total credits for UI display using centralized config
    const formattedTotal = CreditConfig.isUnlimitedTotal(creditsTotal) ? Infinity : creditsTotal
    
    // Handle yearly subscription special case
    const isYearly = interval === 'year'
    if (isYearly && !creditsData.nextMonthlyReset) {
      // Add a special field for yearly subscriptions to show next monthly credit reset
      // Ensure lastUpdate is a valid date string
      const lastUpdateStr = typeof lastUpdate === 'string' ? lastUpdate : new Date().toISOString()
      const nextReset = new Date(lastUpdateStr)
      nextReset.setMonth(nextReset.getMonth() + 1)
      
      // Add the next monthly reset date for yearly plans
      creditsData.nextMonthlyReset = nextReset.toISOString().split('T')[0]
    }
    
    // For yearly subscriptions, ensure we have the correct next credit reset date
    if (subscriptionData.interval === 'year') {
      // If we have a subscription but no explicit nextMonthlyReset field, calculate it
      if (!subscriptionData.nextMonthlyReset) {
        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(now.getMonth() + 1);
        nextMonth.setDate(1); // First day of next month
        
        // Store this for future reference
        await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
          nextMonthlyReset: nextMonth.toISOString().split('T')[0]
        });
        
        // Update our local copy too
        subscriptionData.nextMonthlyReset = nextMonth.toISOString().split('T')[0];
      }
    }
    
    // Return the user data
    const userData = {
      profile: {
        name: token.name || 'User',
        email: userEmail,
        image: token.picture,
        joinedDate: subscriptionData.purchaseDate ? 
          (subscriptionData.purchaseDate as string).split('T')[0] : 
          new Date().toISOString().split('T')[0],
        role: planCredits.displayName
      },
      subscription: {
        plan: planCredits.displayName,
        planType: planCredits.type,
        status: status,
        amount: parseFloat(subscriptionData.amount as string) || amount,
        interval: subscriptionData.interval || interval,
        renewalDate: renewalDate,
        isYearly: interval === 'year',
        nextCreditReset: interval === 'year' ? resetDate : null,
        stripeCustomerId: stripeCustomerId,
        stripeSubscriptionId: stripeSubscriptionId
      },
      credits: {
        used: creditsUsed,
        total: formattedTotal,
        resetDate: resetDate,
        lastUpdate: lastUpdate,
        resetInterval: 'month' // Always monthly
      },
      debug: {
        userId,
        timestamp,
        rawSubscriptionData: subscriptionData,
        rawCreditsData: creditsData,
        planType: planCredits.type
      }
    }
    
    // Save user profile to Redis
    await profileUtils.saveUserProfile(userId, {
      email: userEmail,
      name: token.name || 'User',
      image: token.picture as string || '',
      joinedDate: userData.profile.joinedDate,
      role: planCredits.displayName
    });
    
    return NextResponse.json(userData)
  } catch (error) {
    console.error('Error fetching user data:', error)
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
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