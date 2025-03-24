import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS, subscriptionUtils } from '@/lib/redis'

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
    const resetDate = new Date()
    resetDate.setMonth(now.getMonth() + 1)
    
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