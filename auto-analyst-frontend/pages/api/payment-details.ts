import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { session_id } = req.query

  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'Session ID is required' })
  }

  try {
    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'line_items.data.price.product'],
    })

    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Get the product and price details
    const lineItem = session.line_items?.data[0]
    
    if (!lineItem) {
      return res.status(404).json({ error: 'Product information not found' })
    }

    const price = lineItem.price
    const product = price?.product as Stripe.Product

    // Return the payment details
    return res.status(200).json({
      plan: product.name,
      amount: price?.unit_amount ? price.unit_amount / 100 : 0,
      interval: price?.recurring?.interval || 'month',
      status: session.payment_status,
    })
  } catch (error: any) {
    console.error('Error retrieving payment details:', error)
    return res.status(500).json({ error: error.message || 'Failed to retrieve payment details' })
  }
} 