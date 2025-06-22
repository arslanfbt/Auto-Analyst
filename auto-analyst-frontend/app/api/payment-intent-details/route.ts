import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe only if the secret key exists
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    })
  : null

export async function GET(request: NextRequest) {
  try {
    // Check if Stripe is initialized
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const payment_intent = searchParams.get('payment_intent')

    if (!payment_intent) {
      return NextResponse.json({ error: 'Payment intent ID is required' }, { status: 400 })
    }

    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent)

    if (!paymentIntent) {
      return NextResponse.json({ error: 'Payment intent not found' }, { status: 404 })
    }

    // Return the payment intent details including metadata
    return NextResponse.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
      capture_method: paymentIntent.capture_method,
    })
  } catch (error: any) {
    console.error('Error retrieving payment intent details:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve payment intent details' }, 
      { status: 500 }
    )
  }
} 