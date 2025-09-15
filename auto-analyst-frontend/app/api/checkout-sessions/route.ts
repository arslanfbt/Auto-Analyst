import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { TrialUtils } from '@/lib/credits-config'

export const dynamic = 'force-dynamic'

// Initialize Stripe only if the secret key exists
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16', // Fixed: Use a valid Stripe API version
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

    // Validate promo code if provided with enhanced price ID restrictions
    let couponId = null
    if (promoCode) {
      try {
        console.log(`🔍 Validating promo code: ${promoCode} for price: ${priceId}`)
        
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
        
            const coupon = promotionCode.coupon
            console.log(`📋 Coupon restrictions:`, {
              products: coupon.applies_to?.products,
              prices: (coupon.applies_to as any)?.prices
            })
            
            // Enhanced validation with both product AND price restrictions
            if (coupon.applies_to) {
              // 1. Check product restrictions first
              if (coupon.applies_to.products && coupon.applies_to.products.length > 0) {
                // Get the product ID from our price
                const price = await stripe.prices.retrieve(priceId)
                const productId = price.product as string
                
                console.log(`🏷️ Checking product restriction. Required: ${coupon.applies_to.products}, Current: ${productId}`)
                
                // Check if our product is in the allowed list
                const isProductAllowed = coupon.applies_to.products.includes(productId)
                
                if (!isProductAllowed) {
                  console.log(`❌ Product not allowed`)
                  return NextResponse.json({ 
                    message: 'This promo code is not valid for the selected plan' 
                  }, { status: 400 })
                }
                console.log(`✅ Product restriction passed`)
              }
              
              // 2. Check price restrictions (specific billing cycles)
              const appliesToWithPrices = coupon.applies_to as any
              if (appliesToWithPrices.prices && appliesToWithPrices.prices.length > 0) {
                console.log(`💰 Checking price restriction. Required: ${appliesToWithPrices.prices}, Current: ${priceId}`)
                
                // Check if our specific price ID is in the allowed list
                const isPriceAllowed = appliesToWithPrices.prices.includes(priceId)
                
                if (!isPriceAllowed) {
                  console.log(`❌ Price/billing cycle not allowed`)
                  return NextResponse.json({ 
                    message: 'This promo code is not valid for the selected billing cycle' 
                  }, { status: 400 })
                }
                console.log(`✅ Price restriction passed`)
              }
              
              // 3. If no restrictions at all, allow everything
              if (!coupon.applies_to.products && !appliesToWithPrices.prices) {
                console.log(`🌟 No restrictions - promo code applies to everything`)
              }
            }
            
            // If we get here, the promo code is valid for this product and price
            couponId = coupon.id
            console.log(`✅ Promo code validation successful. Coupon ID: ${couponId}`)
          } else {
            console.log(`❌ Promo code expired or inactive`)
            return NextResponse.json({ message: 'Promo code has expired or is no longer active' }, { status: 400 })
          }
        } else {
          // If no promotion code found, try direct coupon lookup
          console.log(`🔄 Promotion code not found, trying direct coupon lookup`)
          try {
            const coupon = await stripe.coupons.retrieve(promoCode)
            if (coupon.valid) {
              console.log(`📋 Direct coupon found. Restrictions:`, {
                products: coupon.applies_to?.products,
                prices: (coupon.applies_to as any)?.prices
              })
              
              // Check restrictions for direct coupons too
              if (coupon.applies_to) {
                // Check product restrictions
                if (coupon.applies_to.products && coupon.applies_to.products.length > 0) {
                  const price = await stripe.prices.retrieve(priceId)
                  const productId = price.product as string
                  
                  console.log(`🏷️ Checking direct coupon product restriction. Required: ${coupon.applies_to.products}, Current: ${productId}`)
                  
                  const isProductAllowed = coupon.applies_to.products.includes(productId)
                  
                  if (!isProductAllowed) {
                    console.log(`❌ Direct coupon product not allowed`)
                    return NextResponse.json({ 
                      message: 'This promo code is not valid for the selected plan' 
                    }, { status: 400 })
                  }
                  console.log(`✅ Direct coupon product restriction passed`)
                }
                
                // Check price restrictions for direct coupons
                const appliesToWithPrices = coupon.applies_to as any
                if (appliesToWithPrices.prices && appliesToWithPrices.prices.length > 0) {
                  console.log(`💰 Checking direct coupon price restriction. Required: ${appliesToWithPrices.prices}, Current: ${priceId}`)
                  
                  const isPriceAllowed = appliesToWithPrices.prices.includes(priceId)
                  
                  if (!isPriceAllowed) {
                    console.log(`❌ Direct coupon price/billing cycle not allowed`)
                    return NextResponse.json({ 
                      message: 'This promo code is not valid for the selected billing cycle' 
                    }, { status: 400 })
                  }
                  console.log(`✅ Direct coupon price restriction passed`)
                }
              }
              
              couponId = coupon.id
              console.log(`✅ Direct coupon validation successful. Coupon ID: ${couponId}`)
            }
          } catch (couponError) {
            console.log(`❌ Invalid promo code:`, couponError)
            return NextResponse.json({ message: 'Invalid promo code' }, { status: 400 })
          }
        }
      } catch (error) {
        console.error(`❌ Error validating promo code:`, error)
        return NextResponse.json({ message: 'Error validating promo code' }, { status: 400 })
      }
    }

    // Create only a setup intent for payment method collection
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

    console.log(`🎯 Setup intent created successfully:`, {
      setupIntentId: setupIntent.id,
      customerId,
      planName,
      interval,
      priceId,
      discountApplied: !!couponId
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
    console.error(`❌ Stripe error:`, errorMessage)
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
```