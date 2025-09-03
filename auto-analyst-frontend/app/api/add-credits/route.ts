import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS } from '@/lib/redis'
import { creditUtils } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    // Get the user token for authentication
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, amount, description } = await request.json()
    
    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }
    
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 })
    }

    // Get current credit data
    const creditsHash = await redis.hgetall(KEYS.USER_CREDITS(userId))
    
    let currentTotal = 0
    let currentUsed = 0
    
    if (creditsHash && creditsHash.total) {
      currentTotal = parseInt(creditsHash.total as string)
      currentUsed = parseInt(creditsHash.used as string || '0')
    }
    
    // Calculate new total
    const newTotal = currentTotal + amount
    
    // Update credits in Redis
    await redis.hset(KEYS.USER_CREDITS(userId), {
      total: newTotal.toString(),
      used: currentUsed.toString(),
      lastUpdate: new Date().toISOString(),
      resetDate: creditsHash?.resetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
    
    // Log the credit addition for audit purposes
    console.log(`Credits added for user ${userId}: +${amount} credits. New total: ${newTotal}. Added by: ${token.sub}`)
    
    // Get updated credit info
    const updatedCredits = await creditUtils.getRemainingCredits(userId)
    
    return NextResponse.json({
      success: true,
      userId,
      creditsAdded: amount,
      previousTotal: currentTotal,
      newTotal: newTotal,
      remainingCredits: updatedCredits,
      description: description || 'Credits added manually',
      addedBy: token.sub,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Error adding credits:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to add credits' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the user token for authentication
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId query parameter is required' }, { status: 400 })
    }

    // Get current credit data
    const creditsHash = await redis.hgetall(KEYS.USER_CREDITS(userId))
    
    if (!creditsHash || !creditsHash.total) {
      return NextResponse.json({
        userId,
        total: 0,
        used: 0,
        remaining: 0,
        message: 'No credits found for this user'
      })
    }
    
    const total = parseInt(creditsHash.total as string)
    const used = parseInt(creditsHash.used as string || '0')
    const remaining = total - used
    
    return NextResponse.json({
      userId,
      total,
      used,
      remaining,
      lastUpdate: creditsHash.lastUpdate,
      resetDate: creditsHash.resetDate
    })
    
  } catch (error: any) {
    console.error('Error getting credits:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to get credits' 
    }, { status: 500 })
  }
}
