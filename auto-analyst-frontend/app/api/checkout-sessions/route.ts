import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

// Initialize Stripe only if the secret key exists
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    })
  : null

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is initialized
    if (!stripe) {
      console.error('Stripe is not initialized - missing API key')
      return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 })
    }
    
    const body = await request.json()
    const { priceId, userId, planName, interval } = body
    
    if (!priceId || !planName || !interval) {
      return NextResponse.json({ message: 'Price ID and plan details are required' }, { status: 400 })
    }

    // Create a customer or retrieve existing one
    let customerId
    if (userId) {
      const existingCustomers = await stripe.customers.list({
        email: userId,
        limit: 1,
      })

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id
      } else {
        const customer = await stripe.customers.create({
          email: userId,
          metadata: {
            userId: userId || 'anonymous',
          },
        })
        customerId = customer.id
      }
    }

    if (!customerId) {
      return NextResponse.json({ message: 'Unable to create or retrieve customer' }, { status: 400 })
    }

    // Create a subscription with the provided price ID
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: userId || 'anonymous',
        planName,
        interval,
      },
    })

    // Get the client secret from the payment intent
    // @ts-ignore - We know this exists because we expanded it
    const clientSecret = subscription.latest_invoice.payment_intent.client_secret

    return NextResponse.json({ 
      clientSecret,
      subscriptionId: subscription.id 
    })
  } catch (error) {
    console.error('Stripe error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ message: `Stripe error: ${errorMessage}` }, { status: 500 })
  }
} 