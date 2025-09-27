import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS, creditUtils } from '@/lib/redis'
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
      planName = subscriptionHash?.plan || 'No Active Plan'
    } else {
      // Check if user is canceled before giving any credits
      const isCanceled = await creditUtils.isCanceledUser(userId)
      
      if (isCanceled) {
        // User is canceled - they get 0 credits permanently
        creditsTotal = 0
        creditsUsed = 0
        resetDate = ''
        lastUpdate = new Date().toISOString()
        planName = 'No Active Plan'
        
        // Create hash entry with 0 credits for canceled users
        await redis.hset(KEYS.USER_CREDITS(userId), {
          total: '0',
          used: '0',
          resetDate: '',
          lastUpdate,
          canceledUser: 'true'
        })
      } else {
        // Free user - they get 20 credits for the month
        creditsTotal = 20
        creditsUsed = 0
        resetDate = CreditConfig.getNextResetDate()
        lastUpdate = new Date().toISOString()
        planName = 'Free Plan'
        
        // Create hash entry for free users with 20 credits
        await redis.hset(KEYS.USER_CREDITS(userId), {
          total: '20',
          used: '0',
          resetDate,
          lastUpdate,
          freeUser: 'true'
        })
      }
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