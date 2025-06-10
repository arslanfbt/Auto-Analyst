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
      return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 })
    }
    
    const body = await request.json()
    const { priceId, userId, planName, interval, promoCode } = body
    
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

    // Validate promo code if provided
    let couponId = null
    if (promoCode) {
      try {
        // First try to find a promotion code
        const promotionCodes = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
          limit: 1,
        })

        if (promotionCodes.data.length > 0) {
          const promotionCode = promotionCodes.data[0]
          
          // Check if promotion code is valid and not expired
          if (promotionCode.active && 
              (!promotionCode.expires_at || promotionCode.expires_at > Math.floor(Date.now() / 1000))) {
            couponId = promotionCode.coupon.id
          } else {
            return NextResponse.json({ message: 'Promo code has expired or is no longer active' }, { status: 400 })
          }
        } else {
          // If no promotion code found, try direct coupon lookup
          try {
            const coupon = await stripe.coupons.retrieve(promoCode)
            if (coupon.valid) {
              couponId = coupon.id
            }
          } catch (couponError) {
            return NextResponse.json({ message: 'Invalid promo code' }, { status: 400 })
          }
        }
      } catch (error) {
        return NextResponse.json({ message: 'Error validating promo code' }, { status: 400 })
      }
    }

    // Prepare subscription creation parameters
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: userId || 'anonymous',
        planName,
        interval,
        ...(promoCode && { promoCode }),
      },
    }

    // Apply coupon if valid promo code was found
    if (couponId) {
      subscriptionParams.coupon = couponId
    }

    // Create a subscription with the provided price ID and optional coupon
    const subscription = await stripe.subscriptions.create(subscriptionParams)

    // Get the client secret from the payment intent
    // @ts-ignore - We know this exists because we expanded it
    const clientSecret = subscription.latest_invoice.payment_intent.client_secret

    return NextResponse.json({ 
      clientSecret,
      subscriptionId: subscription.id,
      discountApplied: !!couponId,
      ...(couponId && { couponId })
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ message: `Stripe error: ${errorMessage}` }, { status: 500 })
  }
} 