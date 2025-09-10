import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { TrialUtils } from '@/lib/credits-config'

export const dynamic = 'force-dynamic'

// Initialize Stripe only if the secret key exists
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-05-28.basil',
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

    // CHANGED: Create only a setup intent for payment method collection
    // Do NOT create subscription until user confirms payment
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      metadata: {
        userId: userId || 'anonymous',
        planName,
        interval,
        priceId,
        isTrial: 'true',
        trialEndDate: TrialUtils.getTrialEndDate(),
        ...(promoCode && { promoCode }),
        ...(couponId && { couponId }),
      },
    })

    return NextResponse.json({ 
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
      customerId: customerId,
      discountApplied: !!couponId,
      isTrialSetup: true,
      planName,
      interval,
      priceId,
      ...(couponId && { couponId })
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ message: `Stripe error: ${errorMessage}` }, { status: 500 })
  }
}

// Helper function to calculate discounted amount
async function calculateDiscountedAmount(amount: number, couponId: string): Promise<number> {
  if (!stripe) return amount
  
  try {
    const coupon = await stripe.coupons.retrieve(couponId)
    
    if (coupon.percent_off) {
      return Math.round(amount * (1 - coupon.percent_off / 100))
    } else if (coupon.amount_off) {
      return Math.max(0, amount - coupon.amount_off)
    }
    
    return amount
  } catch (error) {
    console.error('Error calculating discount:', error)
    return amount
  }
} 
