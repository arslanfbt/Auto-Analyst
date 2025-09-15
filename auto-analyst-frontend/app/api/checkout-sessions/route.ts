import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { TrialUtils } from '@/lib/credits-config'

export const dynamic = 'force-dynamic'

// Initialize Stripe only if the secret key exists
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-05-28.basil', // Use the exact version the types expect
    })
  : null

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is initialized
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      )
    }

    const { priceId, promotionCode } = await request.json()

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      )
    }

    // Get the price to extract product information
    const price = await stripe.prices.retrieve(priceId)
    const productId = price.product as string

    // Validate promotion code if provided
    let validatedPromotionCode = null
    let discountAmount = 0
    let coupon = null

    if (promotionCode) {
      try {
        console.log('🔍 Validating promo code:', promotionCode)
        
        // List promotion codes to find the one with the given code
        const promotionCodes = await stripe.promotionCodes.list({
          code: promotionCode,
          active: true,
          limit: 1
        })

        console.log('🔍 Found promotion codes:', promotionCodes.data.length)

        if (promotionCodes.data.length === 0) {
          console.log('❌ No promotion code found')
          return NextResponse.json(
            { error: `Promo code "${promotionCode}" is invalid or inactive` },
            { status: 400 }
          )
        }

        const promotionCodeObj = promotionCodes.data[0]
        console.log('✅ Found promotion code:', promotionCodeObj.id)
        
        // Check if the promotion code has expired
        if (promotionCodeObj.expires_at && promotionCodeObj.expires_at < Math.floor(Date.now() / 1000)) {
          console.log('❌ Promotion code expired')
          return NextResponse.json(
            { error: 'This promotion code has expired' },
            { status: 400 }
          )
        }

        coupon = promotionCodeObj.coupon
        console.log('🔍 Coupon details:', {
          id: coupon.id,
          percent_off: coupon.percent_off,
          amount_off: coupon.amount_off,
          applies_to: coupon.applies_to
        })

        // Check if coupon has restrictions
        if (coupon.applies_to) {
          console.log('🔍 Checking coupon restrictions...')
          
          // Check product restrictions
          if (coupon.applies_to.products && coupon.applies_to.products.length > 0) {
            console.log('🔍 Product restrictions:', coupon.applies_to.products)
            console.log('🔍 Current product:', productId)
            
            const isProductAllowed = coupon.applies_to.products.includes(productId)
            console.log('🔍 Product allowed:', isProductAllowed)
            
            if (!isProductAllowed) {
              return NextResponse.json(
                { error: 'This promo code is not valid for the selected plan' },
                { status: 400 }
              )
            }
          }
          
          // Check price restrictions
          const appliesTo = coupon.applies_to as any
          if (appliesTo.prices && appliesTo.prices.length > 0) {
            console.log('🔍 Price restrictions:', appliesTo.prices)
            console.log('🔍 Current price:', priceId)
            
            const isPriceAllowed = appliesTo.prices.includes(priceId)
            console.log('🔍 Price allowed:', isPriceAllowed)
            
            if (!isPriceAllowed) {
              return NextResponse.json(
                { error: 'This promo code is not valid for the selected billing cycle' },
                { status: 400 }
              )
            }
          }
        }

        // Calculate discount amount
        if (coupon.amount_off) {
          discountAmount = coupon.amount_off
          console.log('💰 Fixed discount:', discountAmount)
        } else if (coupon.percent_off) {
          discountAmount = Math.round((price.unit_amount || 0) * (coupon.percent_off / 100))
          console.log('💰 Percentage discount:', coupon.percent_off, '% =', discountAmount)
        }

        // If no discount was calculated, the promo code doesn't apply
        if (discountAmount === 0) {
          console.log('❌ No discount calculated')
          return NextResponse.json(
            { error: 'This promo code does not provide any discount for the selected plan' },
            { status: 400 }
          )
        }

        validatedPromotionCode = promotionCodeObj.id
        console.log('✅ Promo code validated successfully')
        
      } catch (error) {
        console.error('❌ Error validating promotion code:', error)
        return NextResponse.json(
          { error: 'Failed to validate promotion code. Please try again.' },
          { status: 500 }
        )
      }
    }

    // Create setup intent for subscription (remove trial metadata)
    const setupIntent = await stripe.setupIntents.create({
      usage: 'off_session',
      payment_method_types: ['card'],
      metadata: {
        priceId,
        productId,
        promotionCode: validatedPromotionCode || '',
        // Remove: isTrial: 'false'
      }
    })

    // Calculate final amount after discount
    const originalAmount = price.unit_amount || 0
    const finalAmount = Math.max(0, originalAmount - discountAmount)

    // Get product details for better messaging
    const product = await stripe.products.retrieve(productId)

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      priceId,
      productId,
      originalAmount,
      discountAmount,
      finalAmount,
      promotionCode: validatedPromotionCode,
      billingCycle: price.recurring?.interval || 'one_time',
      // Enhanced promo code information
      promoCodeInfo: validatedPromotionCode && coupon ? {
        productName: product.name,
        billingCycle: price.recurring?.interval || 'one_time',
        discountType: coupon.percent_off ? 'percentage' : 'amount',
        discountValue: coupon.percent_off || (coupon.amount_off ? coupon.amount_off / 100 : 0),
        appliesTo: {
          products: coupon.applies_to?.products || [],
          prices: (coupon.applies_to as any)?.prices || []
        }
      } : null
    })

  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

// Helper function to calculate discount amount
function calculateDiscountAmount(price: Stripe.Price, coupon: Stripe.Coupon): number {
  let amount = 0
  
  if (coupon.amount_off) {
    amount = coupon.amount_off
  } else if (coupon.percent_off) {
    amount = Math.round((price.unit_amount || 0) * (coupon.percent_off / 100))
  }
  
  return amount
}