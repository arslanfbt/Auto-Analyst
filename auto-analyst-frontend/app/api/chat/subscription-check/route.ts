import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { subscriptionUtils } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    // Get the user token
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    
    // Get subscription data using our optimized utility
    const subscriptionData = await subscriptionUtils.getUserSubscriptionData(userId)
    
    // Check if the user can use credits (for quick validation)
    const canUseCredits = await subscriptionUtils.canUseCredits(userId)
    
    return NextResponse.json({
      ...subscriptionData,
      canUseCredits
    })
  } catch (error: any) {
    console.error('API error checking subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check subscription' }, 
      { status: 500 }
    )
  }
} 