import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    // Get the user token
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub

    // Get the user's credits from Redis
    const credits = await redis.get(`user:${userId}:credits`)
    const lastReset = await redis.get(`user:${userId}:last_reset`) || new Date().toISOString()
    const usedCredits = await redis.get(`user:${userId}:used_credits`)

    // Ensure values are strings or numbers before parsing
    const parseValue = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return parseInt(value) || 0;
      return 0;
    };

    // Return the user's credits with safe parsing
    return NextResponse.json({
      total: parseValue(credits),
      used: parseValue(usedCredits),
      remaining: parseValue(credits) - parseValue(usedCredits),
      lastReset
    })
  } catch (error: any) {
    console.error('Error getting credits:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get credits' }, 
      { status: 500 }
    )
  }
} 