import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia', // Use the latest API version
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { priceId, userId, planName, amount, interval } = body
    
    if (!amount || !planName || !interval) {
      return NextResponse.json({ message: 'Plan details are required' }, { status: 400 })
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

    // Create a price on the fly
    const product = await stripe.products.create({
      name: `${planName} Plan`,
      metadata: {
        planName,
      },
    })

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount * 100, // Convert to cents
      currency: 'usd',
      recurring: {
        interval: interval === 'year' ? 'year' : 'month',
      },
    })

    // Create a subscription with the newly created price
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: userId || 'anonymous',
        planName,
        amount: amount.toString(),
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