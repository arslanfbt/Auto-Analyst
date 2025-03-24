import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS } from '@/lib/redis'

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Forbidden in production' }, { status: 403 })
  }

  try {
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    const userEmail = token.email
    
    // Get params from request
    const searchParams = request.nextUrl.searchParams
    const plan = searchParams.get('plan') || 'Standard Plan'
    const amount = searchParams.get('amount') || '15'
    const interval = searchParams.get('interval') || 'month'
    
    // Create dummy subscription data
    const now = new Date()
    let renewalDate = new Date()
    if (interval === 'month') {
      renewalDate.setMonth(now.getMonth() + 1)
    } else {
      renewalDate.setFullYear(now.getFullYear() + 1)
    }
    
    // Determine credits
    let credits = 100
    if (plan.toString().toUpperCase().includes('STANDARD')) credits = 500
    if (plan.toString().toUpperCase().includes('PRO')) credits = 999999
    
    // Create a planType for easy mapping
    let planType = 'FREE'
    if (plan.toString().toUpperCase().includes('STANDARD')) planType = 'STANDARD'
    if (plan.toString().toUpperCase().includes('PRO')) planType = 'PRO'
    
    // Update subscription data
    const subscriptionData = {
      plan: plan.toString(),
      planType: planType,
      status: 'active',
      amount: amount.toString(),
      interval: interval.toString(),
      purchaseDate: now.toISOString(),
      renewalDate: renewalDate.toISOString().split('T')[0],
      lastUpdated: now.toISOString(),
      stripeCustomerId: 'debug-customer',
      stripeSubscriptionId: 'debug-subscription'
    }
    
    // Update credit data
    const creditData = {
      total: credits.toString(),
      used: '0',
      resetDate: renewalDate.toISOString().split('T')[0],
      lastUpdate: now.toISOString()
    }
    
    // Store in Redis
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), subscriptionData)
    await redis.hset(KEYS.USER_CREDITS(userId), creditData)
    
    return NextResponse.json({
      success: true,
      message: 'Subscription and credits updated',
      data: {
        subscription: subscriptionData,
        credits: creditData
      }
    })
  } catch (error: any) {
    console.error('Debug force-subscription error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to update subscription data' 
    }, { status: 500 })
  }
} 