import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getToken } from "next-auth/jwt"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { priceId, planName, interval, email } = body

    if (!priceId) {
      return NextResponse.json({ message: 'Price ID is required' }, { status: 400 })
    }

    // Create a customer or retrieve existing one
    let customerId
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id
    } else {
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          userId: token.sub || '',
        },
      })
      customerId = customer.id
    }

    // Create a subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    })

    // @ts-ignore - We know the expanded field exists
    const clientSecret = subscription.latest_invoice.payment_intent.client_secret

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
    })
  } catch (error) {
    console.error('Stripe error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ message: `Stripe error: ${errorMessage}` }, { status: 500 })
  }
} 