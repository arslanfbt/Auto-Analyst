import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    })
  : null

export async function GET(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 })
    }

    const searchParams = request.nextUrl.searchParams
    const couponId = searchParams.get('couponId')

    if (!couponId) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 })
    }

    const coupon = await stripe.coupons.retrieve(couponId)

    return NextResponse.json({
      id: coupon.id,
      percent_off: coupon.percent_off,
      amount_off: coupon.amount_off,
      currency: coupon.currency,
      name: coupon.name,
      valid: coupon.valid,
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Failed to retrieve coupon details' 
    }, { status: 500 })
  }
} 