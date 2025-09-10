import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    // Use getToken to authenticate
    const token = await getToken({ req: request })
    
    if (!token || !token.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = token.sub || "anonymous"
    
    // Get subscription data
    const subscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
    
    // Check if this is a Free plan
    const isFree = 
      !subscriptionData?.planType || 
      subscriptionData.planType === 'FREE' || 
      (subscriptionData.plan && (subscriptionData.plan as string).includes('Free'))
    
    if (isFree) {
      // Update the status to active for Free plan
      await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
        status: 'active',
        planType: 'FREE',
        plan: 'Free Plan'
      })
      
      return NextResponse.json({
        success: true,
        message: 'Free plan status updated to active',
        updatedAt: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'User is not on a Free plan',
        currentPlan: subscriptionData?.plan || 'Unknown'
      })
    }
  } catch (error) {
    console.error('Error fixing subscription status:', error)
    return NextResponse.json({ error: 'Failed to fix subscription status' }, { status: 500 })
  }
} 