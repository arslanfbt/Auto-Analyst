import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    // Get the user token to verify authorization
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    const body = await request.json()
    const { credits = 1, description = 'Chat usage' } = body
    
    // Get current credit data
    const creditsHash = await redis.hgetall(KEYS.USER_CREDITS(userId))
    
    if (!creditsHash || !creditsHash.total) {
      // Initialize new user with default credits
      await redis.hset(KEYS.USER_CREDITS(userId), {
        total: '100',
        used: credits.toString(),
        resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0],
        lastUpdate: new Date().toISOString()
      })
      
      return NextResponse.json({
        success: true,
        remaining: 100 - credits,
        deducted: credits
      })
    }
    
    // Calculate new used amount
    const total = parseInt(creditsHash.total as string)
    const currentUsed = creditsHash.used ? parseInt(creditsHash.used as string) : 0
    const newUsed = currentUsed + credits
    
    // Update the credits hash
    await redis.hset(KEYS.USER_CREDITS(userId), {
      used: newUsed.toString(),
      lastUpdate: new Date().toISOString()
    })
    
    console.log(`Deducted ${credits} credits for user ${userId}. New total: ${total - newUsed}`)
    
    // Return updated credit information
    return NextResponse.json({
      success: true,
      remaining: total - newUsed,
      deducted: credits,
      description
    })
  } catch (error: any) {
    console.error('Error deducting credits:', error)
    return NextResponse.json({ error: error.message || 'Failed to deduct credits' }, { status: 500 })
  }
} 