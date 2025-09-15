"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'

interface CheckoutFormProps {
  planName: string
  amount: number
  interval: 'month' | 'year' | 'day'
  clientSecret: string
  isTrialSetup?: boolean
  setupIntentId?: string
}

export default function CheckoutForm({ planName, amount, interval, clientSecret, isTrialSetup, setupIntentId }: CheckoutFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const stripe = useStripe()
  const elements = useElements()
  
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [succeeded, setSucceeded] = useState(false)
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!stripe || !elements) {
      setError('Stripe.js has not loaded yet')
      return
    }

    setProcessing(true)
    
    // NEW FLOW: Always use confirmSetup for trial signups
    console.log('🔍 About to confirm setup with:', {
      clientSecret,
      elements: !!elements,
      stripe: !!stripe
    })
    const { error: submitError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
      redirect: 'if_required',
    })

    if (submitError) {
      setProcessing(false)
      setError(submitError.message || 'An error occurred when setting up your payment method')
      return
    }

    if (setupIntent && setupIntent.status === 'succeeded') {
      setError(null)
      
      // Now call our trial/start endpoint to create the subscription
      try {
        const response = await fetch('/api/trial/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setupIntentId: setupIntent.id,
            planName,
            interval,
            amount
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to start trial')
        }

      setSucceeded(true)
      
        // Show success animation before redirecting
      setTimeout(() => {
          router.push(`/checkout/success?subscription_id=${data.subscriptionId}`)
      }, 1500)

      } catch (trialError: any) {
        setProcessing(false)
        setError(trialError.message || 'Failed to start trial after payment setup')
      }
    } else {
      setProcessing(false)
      setError('Payment setup was not completed successfully')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">{planName} Plan</h3>
          <div className="text-gray-900 font-medium">
            ${amount}{' '}
            <span className="text-sm text-gray-500">
              / {interval}
            </span>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Details
          </label>
          <div className="p-4 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-[#FF7F7F] focus-within:border-[#FF7F7F] transition-all">
            <PaymentElement options={{
              layout: 'accordion',
              defaultValues: {
                billingDetails: {
                  email: ''
                }
              }
            }} />
          </div>
        </div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 mb-4 bg-red-50 text-red-500 rounded-md flex items-center gap-2"
          >
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}
        
        <Button
          type="submit"
          disabled={!stripe || processing || succeeded}
          className="w-full bg-[#FF7F7F] hover:bg-[#FF6666] text-white h-12 rounded-md transition-all disabled:opacity-70 disabled:cursor-not-allowed font-medium"
        >
          {processing ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              Processing...
            </div>
          ) : succeeded ? (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle size={16} />
              Payment Successful!
            </div>
          ) : (
            `Proceed to Payment`
          )}
        </Button>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          Your payment is secure and encrypted. We use Stripe for secure payment processing.
        </p>
      </div>
    </form>
  )
} 
