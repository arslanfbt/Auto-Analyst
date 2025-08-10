import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { creditUtils } from '@/lib/redis'
import { CreditConfig } from '@/lib/credits-config'

export async function GET(request: Request) {
  try {
    // Get user info from session or query params
    const session = await getServerSession()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || (session?.user?.email || 'guest-user')
    
    // Get user's remaining credits
    const credits = await creditUtils.getRemainingCredits(userId as string)
    
    return NextResponse.json({ credits })
  } catch (error) {
    console.error('Error fetching credits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    const { userId, action, amount } = await request.json()
    
    // Ensure authenticated or valid request
    if (!session?.user && !userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const userIdentifier = userId || session?.user?.email
    
    if (action === 'reset') {
      // Reset credits to the monthly allowance using centralized config
      const defaultCredits = 20 // No free credits anymore
      await creditUtils.initializeTrialCredits(userIdentifier, 'manual-init', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      return NextResponse.json({ success: true, credits: defaultCredits })
    } else if (action === 'deduct') {
      // Deduct credits
      const success = await creditUtils.deductCredits(userIdentifier, amount)
      if (success) {
        const remaining = await creditUtils.getRemainingCredits(userIdentifier)
        return NextResponse.json({ success: true, credits: remaining })
      } else {
        return NextResponse.json(
          { error: 'Insufficient credits' },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error managing credits:', error)
    return NextResponse.json(
      { error: 'Failed to manage credits' },
      { status: 500 }
    )
  }
} 
