import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { getToken } from "next-auth/jwt"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const token = await getToken({ req })
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { priceId, planName, interval, email } = req.body

    if (!priceId) {
      return res.status(400).json({ message: 'Price ID is required' })
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

    res.status(200).json({
      clientSecret,
      subscriptionId: subscription.id,
    })
  } catch (error) {
    console.error('Stripe error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    res.status(500).json({ message: `Stripe error: ${errorMessage}` })
  }
} 