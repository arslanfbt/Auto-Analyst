"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Head from 'next/head'
import Link from 'next/link'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import { motion } from 'framer-motion'
import { ArrowLeft, CreditCard, ShieldCheck, Lock, CheckCircle } from 'lucide-react'
import CheckoutForm from '@/components/CheckoutForm'
import { useSession } from 'next-auth/react'

// Load stripe outside of component to avoid recreating it on each render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [loadingPlan, setLoadingPlan] = useState(true)
  
  const plan = searchParams?.get('plan')
  const cycle = searchParams?.get('cycle')
  
  const [planDetails, setPlanDetails] = useState({
    name: '',
    amount: 0,
    cycle: 'month',
    priceId: '',
  })
  
  const [clientSecret, setClientSecret] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [promoError, setPromoError] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [discountApplied, setDiscountApplied] = useState(false)
  const [discountInfo, setDiscountInfo] = useState<{type: string, value: number} | null>(null)

  // Create or recreate payment intent
  const createPaymentIntent = async (planData: any, promoCodeValue: string = '') => {
    if (!planData.priceId || !session) return

    setPaymentLoading(true)

    try {
      const response = await fetch('/api/checkout-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: planData.priceId,
          userId: session.user?.email,
          planName: planData.name,
          interval: planData.cycle,
          promoCode: promoCodeValue.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (data.message) {
        if (promoCodeValue) {
          setPromoError(data.message)
          setDiscountApplied(false)
          setDiscountInfo(null)
        } else {
          setPaymentError(data.message)
          setClientSecret('')
        }
      } else {
        setClientSecret(data.clientSecret)
        setDiscountApplied(data.discountApplied || false)
        setPaymentError('')
        setPromoError('')
        
        if (data.discountApplied && data.couponId) {
          fetchCouponDetails(data.couponId, planData.amount)
        } else {
          setDiscountInfo(null)
        }
      }
    } catch (err) {
      if (promoCodeValue) {
        setPromoError('Failed to validate promo code. Please try again.')
        setDiscountApplied(false)
        setDiscountInfo(null)
      } else {
        setPaymentError('Failed to set up payment. Please try again.')
        setClientSecret('')
      }
    } finally {
      setPaymentLoading(false)
    }
  }

  // Fetch coupon details for discount calculation
  const fetchCouponDetails = async (couponId: string, originalAmount: number) => {
    try {
      const response = await fetch(`/api/coupon-details?couponId=${couponId}`)
      if (response.ok) {
        const coupon = await response.json()
        setDiscountInfo({
          type: coupon.percent_off ? 'percent' : 'amount',
          value: coupon.percent_off || (coupon.amount_off / 100)
        })
      }
    } catch (err) {
      // Silently fail - discount info is not critical
    }
  }

  // Handle promo code changes
  const handlePromoCodeChange = (newPromoCode: string) => {
    if (newPromoCode.trim() && planDetails.priceId) {
      createPaymentIntent(planDetails, newPromoCode)
    } else if (!newPromoCode.trim() && clientSecret) {
      setDiscountApplied(false)
      setDiscountInfo(null)
      setPromoError('')
      createPaymentIntent(planDetails, '')
    }
  }
  
  useEffect(() => {
    if (!plan || !cycle || status === 'loading') {
      return
    }
    
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/pricing')
      return
    }
    
    // Get plan details based on URL parameters
    const pricingTiers = [
      {
        name: 'Standard',
        monthly: {
          price: 15,
          priceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
        },
        yearly: {
          price: 126,
          priceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID,
        },
        daily: {
          price: 0.75,
          priceId: process.env.NEXT_PUBLIC_STRIPE_DAILY_PRICE_ID,
        },
      },
      {
        name: 'Pro',
        monthly: {
          price: 29,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
        },
        yearly: {
          price: 244,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
        },
      },
    ]
    
    const selectedPlan = pricingTiers.find(p => p.name.toLowerCase() === plan)
    
    if (selectedPlan) {
      const billing = cycle === 'yearly' ? 'yearly' : cycle === 'daily' ? 'daily' : 'monthly'
      const planData = {
        name: selectedPlan.name,
        amount: selectedPlan[billing]?.price || 0,
        cycle: billing === 'yearly' ? 'year' : billing === 'daily' ? 'day' : 'month',
        priceId: selectedPlan[billing]?.priceId || '',
      }
      
      setPlanDetails(planData)
      
      // Create initial payment intent without promo code
      createPaymentIntent(planData)
    } else {
      // Plan not found, redirect to pricing
      router.push('/pricing')
    }
    
    setLoadingPlan(false)
  }, [plan, cycle, router, status, session])
  
  if (status === 'loading' || loadingPlan || paymentLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 rounded-full border-t-2 border-[#FF7F7F]"
        />
      </div>
    )
  }
  
  return (
    <>
      <Head>
        <title>Checkout | Auto-Analyst</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <Link href="/pricing" className="flex items-center text-gray-700 hover:text-[#FF7F7F] transition-colors cursor-pointer">
              <ArrowLeft size={16} className="mr-1" />
              <span>Back to pricing</span>
            </Link>
            
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Lock size={14} />
              <span>Secure Checkout</span>
            </div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Complete your purchase</h1>
            <p className="text-gray-600 mb-10 text-center">
              You're subscribing to the {planDetails.name} plan
            </p>
            
            {paymentError && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md">
                {paymentError}
              </div>
            )}
            
            <div className="grid gap-6 lg:gap-10 md:grid-cols-1 lg:grid-cols-2">
              <div className="order-2 lg:order-1">
                {clientSecret && (
                  <Elements 
                    stripe={stripePromise} 
                    options={{ 
                      clientSecret,
                      appearance: {
                        theme: 'stripe' as const
                      }
                    } as StripeElementsOptions}
                  >
                    <CheckoutForm 
                      planName={planDetails.name}
                      amount={planDetails.amount}
                      interval={planDetails.cycle as 'month' | 'year' | 'day'}
                      clientSecret={clientSecret}
                    />
                  </Elements>
                )}
              </div>
              
              <div className="order-1 lg:order-2">
                {/* Promo Code Section */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Promo Code</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Enter promo code"
                        className="w-full h-12 px-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF7F7F] focus:border-[#FF7F7F] transition-all text-center sm:text-left"
                        disabled={paymentLoading}
                      />
                      {discountApplied && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                      )}
                    </div>
                    {!discountApplied ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (promoCode.trim()) {
                            handlePromoCodeChange(promoCode.trim())
                          }
                        }}
                        disabled={!promoCode.trim() || paymentLoading}
                        className="h-12 px-8 bg-[#FF7F7F] hover:bg-[#FF6666] text-white rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium whitespace-nowrap w-full sm:w-auto"
                      >
                        Apply
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setPromoCode('')
                          handlePromoCodeChange('')
                        }}
                        disabled={paymentLoading}
                        className="h-12 px-8 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium whitespace-nowrap w-full sm:w-auto"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {promoError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600 text-center sm:text-left">{promoError}</p>
                    </div>
                  )}
                  {discountApplied && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-600 text-center sm:text-left">✓ Promo code applied!</p>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
                  
                  <div className="border-t border-gray-200 py-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700">{planDetails.name} Plan</span>
                      <span className={`text-gray-900 ${discountApplied ? 'line-through text-gray-500' : ''}`}>
                        ${planDetails.amount}
                      </span>
                    </div>
                    {discountApplied && discountInfo && (
                      <div className="flex justify-between mb-2">
                        <span className="text-green-700 font-medium">
                          Discount ({discountInfo.type === 'percent' ? `${discountInfo.value}% off` : `$${discountInfo.value} off`})
                        </span>
                        <span className="text-green-700 font-medium">
                          {discountInfo.type === 'percent' 
                            ? `-$${((planDetails.amount * discountInfo.value) / 100).toFixed(2)}`
                            : `-$${discountInfo.value.toFixed(2)}`
                          }
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-gray-500">
                      Billed {planDetails.cycle === 'year' ? 'yearly' : planDetails.cycle === 'day' ? 'daily' : 'monthly'}
                    </p>
                    {discountApplied && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-700 font-medium">✓ Promo code applied!</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t border-gray-200 py-4">
                    <div className="flex justify-between font-medium text-gray-900">
                      <span>Total (USD)</span>
                      <span>
                        {discountApplied && discountInfo ? (
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              ${discountInfo.type === 'percent' 
                                ? (planDetails.amount - (planDetails.amount * discountInfo.value) / 100).toFixed(2)
                                : Math.max(0, planDetails.amount - discountInfo.value).toFixed(2)
                              }
                            </div>
                            <div className="text-xs text-gray-500">You save ${
                              discountInfo.type === 'percent' 
                                ? ((planDetails.amount * discountInfo.value) / 100).toFixed(2)
                                : discountInfo.value.toFixed(2)
                            }!</div>
                          </div>
                        ) : (
                          `$${planDetails.amount}`
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <ShieldCheck size={16} className="mr-2 text-green-500" />
                      <span>Your subscription is protected by our 30-day guarantee</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CreditCard size={16} className="mr-2 text-gray-400" />
                      <span>We accept all major credit cards</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  )
} 