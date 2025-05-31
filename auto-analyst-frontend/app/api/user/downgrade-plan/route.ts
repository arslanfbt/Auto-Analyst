import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS, subscriptionUtils } from '@/lib/redis'
import { CreditConfig } from '@/lib/credits-config'

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    const userEmail = token.email
    const body = await request.json()

    // Get requested plan to downgrade to
    const { targetPlan } = body
    
    if (!targetPlan) {
      return NextResponse.json({ error: 'Target plan is required' }, { status: 400 })
    }
    
    // Get plan configuration using centralized config
    const planCredits = CreditConfig.getCreditsForPlan(targetPlan)
    
    const now = new Date()
    const resetDate = new Date()
    resetDate.setMonth(now.getMonth() + 1)
    
    // Determine amount based on plan
    let amount = '0'
    if (planCredits.type === 'STANDARD') {
      amount = '15'
    }
    // Free and Pro plans default to '0' for this context
    
    // Update subscription data in Redis
    const subscriptionData = {
      plan: planCredits.displayName,
      planType: planCredits.type,
      status: 'active',
      amount: amount,
      interval: 'month',
      purchaseDate: now.toISOString(),
      renewalDate: resetDate.toISOString().split('T')[0],
      lastUpdated: now.toISOString(),
      // Keep the existing Stripe customer/subscription IDs if moving to Standard
      // Clear them if moving to Free
      stripeCustomerId: planCredits.type === 'FREE' ? '' : await redis.hget(KEYS.USER_SUBSCRIPTION(userId), 'stripeCustomerId') || '',
      stripeSubscriptionId: planCredits.type === 'FREE' ? '' : await redis.hget(KEYS.USER_SUBSCRIPTION(userId), 'stripeSubscriptionId') || ''
    }
    
    // Get current credits used
    const currentCreditsData = await redis.hgetall(KEYS.USER_CREDITS(userId))
    const creditsUsed = currentCreditsData && currentCreditsData.used 
      ? parseInt(currentCreditsData.used as string) 
      : 0
    
    // Update credits data - maintain the used credits count but adjust the total
    // This ensures users don't suddenly get more credits by downgrading and upgrading
    const creditData = {
      total: planCredits.total.toString(),
      used: Math.min(creditsUsed, planCredits.total).toString(), // Ensure used doesn't exceed new total
      resetDate: resetDate.toISOString().split('T')[0],
      lastUpdate: now.toISOString(),
      planUpdateTime: Date.now().toString()
    }
    
    // Update Redis data
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), subscriptionData)
    await redis.hset(KEYS.USER_CREDITS(userId), creditData)

    // Return success with updated plan data
    return NextResponse.json({
      success: true,
      subscription: subscriptionData,
      credits: creditData
    })
  } catch (error: any) {
    console.error('Error downgrading plan:', error)
    return NextResponse.json({ error: error.message || 'Failed to downgrade plan' }, { status: 500 })
  }
} 