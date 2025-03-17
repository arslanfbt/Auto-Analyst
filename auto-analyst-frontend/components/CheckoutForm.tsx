"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'

interface CheckoutFormProps {
  planName: string
  amount: number
  interval: 'month' | 'year'
  priceId: string
}

export default function CheckoutForm({ planName, amount, interval, priceId }: CheckoutFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const stripe = useStripe()
  const elements = useElements()
  
  const [error, setError] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [succeeded, setSucceeded] = useState(false)
  const [clientSecret, setClientSecret] = useState('')
  
  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    if (!priceId) return
    
    fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        priceId,
        userId: session?.user?.id || 'guest',
        email: session?.user?.email,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
          return
        }
        setClientSecret(data.clientSecret)
      })
      .catch((err) => {
        setError('Something went wrong with the payment setup. Please try again.')
        console.error(err)
      })
  }, [priceId, session])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet
      return
    }

    if (error) {
      elements.getElement(CardElement)!.focus()
      return
    }

    if (!cardComplete) {
      setError('Please complete your card details')
      return
    }

    setProcessing(true)

    const payload = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
        billing_details: {
          name: session?.user?.name || 'Guest User',
          email: session?.user?.email,
        },
      },
    })

    setProcessing(false)

    if (payload.error) {
      setError(`Payment failed: ${payload.error.message}`)
    } else {
      setError(null)
      setSucceeded(true)
      
      // Show success animation for a second before redirecting
      setTimeout(() => {
        router.push('/checkout/success?session_id=' + payload.paymentIntent.id)
      }, 1500)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
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
            Card Details
          </label>
          <div className="p-4 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-[#FF7F7F] focus-within:border-[#FF7F7F] transition-all">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
              onChange={(e) => {
                setError(e.error ? e.error.message : null)
                setCardComplete(e.complete)
              }}
            />
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
            `Pay $${amount}`
          )}
        </Button>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          Your payment is secure and encrypted. We use Stripe for secure payment processing.
        </p>
      </div>
    </form>
  )
} 