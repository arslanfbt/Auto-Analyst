import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

// Initialize Stripe only if the secret key exists
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-05-28.basil',
    })
  : null

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const session_id = searchParams.get('session_id')

  if (!session_id) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
  }

  try {
    // Check if Stripe is initialized
    if (!stripe) {
      console.error('Stripe is not initialized - missing API key')
      return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 })
    }
    
    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'line_items.data.price.product'],
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get the product and price details
    const lineItem = session.line_items?.data[0]
    
    if (!lineItem) {
      return NextResponse.json({ error: 'Product information not found' }, { status: 404 })
    }

    const price = lineItem.price
    const product = price?.product as Stripe.Product

    // Return the payment details
    return NextResponse.json({
      plan: product.name,
      amount: price?.unit_amount ? price.unit_amount / 100 : 0,
      interval: price?.recurring?.interval || 'month',
      status: session.payment_status,
    })
  } catch (error: any) {
    console.error('Error retrieving payment details:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve payment details' }, 
      { status: 500 }
    )
  }
} 