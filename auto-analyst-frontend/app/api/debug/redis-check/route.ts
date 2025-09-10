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

    // Get all user data from Redis
    const subscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
    const creditsData = await redis.hgetall(KEYS.USER_CREDITS(userId))
    
    // Return all data for debugging
    return NextResponse.json({
      userId,
      userEmail,
      redis: {
        subscription: subscriptionData,
        credits: creditsData,
      }
    })
  } catch (error: any) {
    console.error('Redis check error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check Redis data' }, 
      { status: 500 }
    )
  }
} 