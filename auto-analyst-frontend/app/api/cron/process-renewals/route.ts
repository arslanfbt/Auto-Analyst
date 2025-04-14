import { NextRequest, NextResponse } from 'next/server'
import { checkSubscriptionsAndRenewals } from '@/lib/redis'

// This API route is designed to be called by a scheduled job (e.g., Upstash cron) 
// to process subscription renewals for STANDARD users
export async function GET(request: NextRequest) {
  try {
    // Check for authorization key to ensure this isn't called by unauthorized sources
    const authKey = request.headers.get('x-cron-auth-key')
    const configuredKey = process.env.CRON_AUTH_KEY

    // Verify that an auth key is configured
    if (!configuredKey) {
      console.error('CRON_AUTH_KEY environment variable is not configured')
      return NextResponse.json(
        { error: 'Server is not configured for cron jobs' },
        { status: 500 }
      )
    }

    // Verify the auth key matches
    if (authKey !== configuredKey) {
      console.error('Invalid cron job authentication key')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting subscription renewal process from cron job')
    
    // Process subscriptions and renewals
    await checkSubscriptionsAndRenewals()
    
    // Return success response
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Subscription renewals processed successfully'
    })
  } catch (error: any) {
    console.error('Error processing subscription renewals:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process subscription renewals' },
      { status: 500 }
    )
  }
}

// Add POST handler for QStash compatibility
export async function POST(request: NextRequest) {
  try {
    // Check for authorization key to ensure this isn't called by unauthorized sources
    const authKey = request.headers.get('x-cron-auth-key')
    const configuredKey = process.env.CRON_AUTH_KEY

    // Verify that an auth key is configured
    if (!configuredKey) {
      console.error('CRON_AUTH_KEY environment variable is not configured')
      return NextResponse.json(
        { error: 'Server is not configured for cron jobs' },
        { status: 500 }
      )
    }

    // Verify the auth key matches
    if (authKey !== configuredKey) {
      console.error('Invalid cron job authentication key')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting subscription renewal process from cron job (POST method)')
    
    // Process subscriptions and renewals
    await checkSubscriptionsAndRenewals()
    
    // Return success response
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Subscription renewals processed successfully'
    })
  } catch (error: any) {
    console.error('Error processing subscription renewals:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process subscription renewals' },
      { status: 500 }
    )
  }
} 