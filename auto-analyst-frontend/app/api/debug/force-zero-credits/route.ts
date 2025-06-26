import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { creditUtils, KEYS, subscriptionUtils } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Get the user token
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    
    
    // Get current state before
    const beforeCredits = await redis.hgetall(KEYS.USER_CREDITS(userId))
    const beforeSubscription = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
        
    // Force set zero credits multiple ways
    await creditUtils.setZeroCredits(userId)
    
    // Also force via direct Redis
    const now = new Date()
    await redis.hset(KEYS.USER_CREDITS(userId), {
      total: '0',
      used: '0',
      resetDate: '',
      lastUpdate: now.toISOString(),
      downgradedAt: now.toISOString(),
      forcedZero: 'true'
    })
    
    // Get state after
    const afterCredits = await redis.hgetall(KEYS.USER_CREDITS(userId))
    const afterSubscription = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
    
    // Test the refresh logic
    const refreshResult = await subscriptionUtils.refreshCreditsIfNeeded(userId)
    
    // Get final state
    const finalCredits = await redis.hgetall(KEYS.USER_CREDITS(userId))
    
    return NextResponse.json({
      success: true,
      userId,
      before: {
        credits: beforeCredits,
        subscription: beforeSubscription
      },
      after: {
        credits: afterCredits,
        subscription: afterSubscription
      },
      final: {
        credits: finalCredits
      },
      refreshResult,
      timestamp: now.toISOString()
    })
    
  } catch (error: any) {
    console.error('Error forcing zero credits:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to force zero credits' 
    }, { status: 500 })
  }
} 