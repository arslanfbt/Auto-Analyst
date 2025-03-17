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
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { amount, priceId, email } = req.body

    // Try to get the token instead of session
    const token = await getToken({ req })
    
    // For development/testing purposes, proceed even without authentication
    const userId = token?.sub || 'test-user'
    const userEmail = email || token?.email || 'test@example.com'

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        priceId,
        userId,
        email: userEmail,
        isSubscription: 'true',
      },
    })

    return res.status(200).json({ 
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error: any) {
    console.error('Stripe payment intent error:', error)
    return res.status(500).json({ 
      error: error.message || 'Something went wrong with the payment process' 
    })
  }
} 