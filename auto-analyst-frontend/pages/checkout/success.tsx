import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSession } from 'next-auth/react'

interface PaymentDetails {
  plan: string;
  amount: number;
  interval: string;
  status?: string;
}

interface CreditUpdate {
  success: boolean;
  credits: number;
  added: number;
  plan: string;
}

export default function SuccessPage() {
  const router = useRouter()
  const { session_id } = router.query
  const { data: session } = useSession()
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [creditUpdate, setCreditUpdate] = useState<CreditUpdate | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingCredits, setUpdatingCredits] = useState(false)
  
  useEffect(() => {
    if (!session_id) return
    
    // Fetch the payment details to display plan information
    fetch(`/api/payment-details?session_id=${session_id}`)
      .then(res => res.json())
      .then(data => {
        setPaymentDetails(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching payment details:', err)
        setLoading(false)
      })
  }, [session_id])
  
  // Update credits when payment is successful and user is authenticated
  useEffect(() => {
    if (!session_id || !session || !paymentDetails || updatingCredits) return
    
    setUpdatingCredits(true)
    
    // Call the update-credits endpoint
    fetch('/api/update-credits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCreditUpdate(data)
        }
        setUpdatingCredits(false)
      })
      .catch(err => {
        console.error('Error updating credits:', err)
        setUpdatingCredits(false)
      })
  }, [session_id, session, paymentDetails, updatingCredits])
  
  return (
    <>
      <Head>
        <title>Payment Successful | Auto-Analyst</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"
              >
                <CheckCircle size={40} className="text-green-500" />
              </motion.div>
            </div>
            
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
              Payment Successful!
            </h1>
            
            <p className="text-gray-600 text-center mb-6">
              Thank you for your subscription. Your account has been upgraded.
            </p>
            
            {loading || updatingCredits ? (
              <div className="flex justify-center my-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 rounded-full border-t-2 border-[#FF7F7F]"
                />
              </div>
            ) : (
              <>
                {paymentDetails && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Plan:</span>
                      <span className="font-medium">{paymentDetails.plan}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">${paymentDetails.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Billing Period:</span>
                      <span className="font-medium">{paymentDetails.interval}</span>
                    </div>
                  </div>
                )}
                
                {creditUpdate && (
                  <div className="bg-green-50 p-4 rounded-lg mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-green-700">Credits Added:</span>
                      <span className="font-medium text-green-700">{creditUpdate.added.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Total Credits:</span>
                      <span className="font-medium text-green-700">{creditUpdate.credits.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </>
            )}
            
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => router.push('/chat')}
                className="w-full bg-[#FF7F7F] hover:bg-[#FF6666] text-white"
              >
                <span>Start analyzing data</span>
                <ArrowRight size={16} className="ml-2" />
              </Button>
              
              <Link href="/account" passHref>
                <Button
                  variant="outline"
                  className="w-full"
                >
                  View your subscription
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
} 