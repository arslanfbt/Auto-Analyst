import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS } from '@/lib/redis'
import { CreditConfig } from '@/lib/credits-config'

export async function GET(request: NextRequest) {
  try {
    // Get the user token
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    
    // Get credits from hash
    const creditsHash = await redis.hgetall(KEYS.USER_CREDITS(userId))
    const subscriptionHash = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
    
    let planName, creditsUsed, creditsTotal, resetDate, lastUpdate
    
    if (creditsHash && creditsHash.total) {
      // Use hash data
      creditsTotal = parseInt(creditsHash.total as string)
      creditsUsed = parseInt(creditsHash.used as string || '0')
      resetDate = creditsHash.resetDate || CreditConfig.getNextResetDate()
      lastUpdate = creditsHash.lastUpdate || new Date().toISOString()
      planName = subscriptionHash?.plan || 'Free Plan'
    } else {
      // Initialize default values for new users using centralized config
      creditsTotal = CreditConfig.getDefaultInitialCredits()
      creditsUsed = 0
      resetDate = CreditConfig.getNextResetDate()
      lastUpdate = new Date().toISOString()
      planName = 'Free Plan'
      
      // Create hash entry for new users
      await redis.hset(KEYS.USER_CREDITS(userId), {
        total: creditsTotal.toString(),
        used: creditsUsed.toString(),
        resetDate,
        lastUpdate
      })
    }
    
    // Update the last update timestamp
    const currentTime = new Date().toISOString()
    
    await redis.hset(KEYS.USER_CREDITS(userId), {
      lastUpdate: currentTime
    })
    
    // Return the credit data - use centralized config for unlimited check
    return NextResponse.json({
      used: creditsUsed,
      total: CreditConfig.isUnlimitedTotal(creditsTotal) ? Infinity : creditsTotal,
      resetDate,
      lastUpdate: currentTime,
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to refresh credit data' }, 
      { status: 500 }
    )
  }
} 