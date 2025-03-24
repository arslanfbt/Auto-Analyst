import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { getSession } from 'next-auth/react'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { priceId, userId, email } = req.body

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' })
    }

    // Get user session to ensure they're logged in
    const session = await getSession({ req })
    
    if (!session) {
      return res.status(401).json({ error: 'You must be logged in to subscribe' })
    }

    // Create a checkout session with the specified price
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Use metadata to store user ID for webhooks
      metadata: {
        userId: userId || session.user.id,
      },
      customer_email: email || session.user.email,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
    })

    return res.status(200).json({ 
      clientSecret: checkoutSession.client_secret,
      id: checkoutSession.id,
    })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return res.status(500).json({ 
      error: error.message || 'Something went wrong with the checkout process' 
    })
  }
} 