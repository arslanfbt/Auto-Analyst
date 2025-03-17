import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Layout from '@/components/layout'
import { CheckCircle, ChevronRight, Loader } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'

interface PaymentDetails {
  plan: string;
  amount: number;
  interval: string;
  status: string;
}

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const { session_id } = router.query
    
    if (!session_id) return
    
    const fetchPaymentDetails = async () => {
      try {
        // Fetch payment details
        const response = await fetch(`/api/payment-details?session_id=${session_id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch payment details')
        }
        
        const data = await response.json()
        setPaymentDetails(data)
        
        // Update user credits to reflect the new plan
        await fetch('/api/update-credits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_id }),
        })
        
        toast({
          title: "Subscription activated",
          description: `Your ${data.plan} has been activated successfully.`,
          variant: "default",
        })
      } catch (err: any) {
        console.error('Error fetching payment details:', err)
        setError(err.message || 'An error occurred')
        
        toast({
          title: "Error processing subscription",
          description: err.message || "Please contact support if this persists.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchPaymentDetails()
  }, [router.query, toast])
  
  return (
    <Layout>
      <Head>
        <title>Checkout Successful | Auto-Analyst</title>
      </Head>
      
      <div className="max-w-3xl mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-12">
            <Loader className="w-12 h-12 mx-auto mb-4 animate-spin text-[#FF7F7F]" />
            <h2 className="text-2xl font-bold mb-2">Processing your subscription...</h2>
            <p className="text-gray-600">Just a moment while we activate your plan.</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-red-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Oops! Something went wrong</h2>
            <p className="text-gray-700 mb-6">{error}</p>
            <Link 
              href="/account" 
              className="inline-flex items-center px-4 py-2 bg-[#FF7F7F] text-white rounded-md hover:bg-[#FF6666]"
            >
              Go to my account <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You for Your Order!</h1>
            <p className="text-xl text-gray-700 mb-8">
              Your subscription has been processed successfully.
            </p>
            
            {paymentDetails && (
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Details</h3>
                <div className="space-y-2 text-left">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Plan:</span>
                    <span className="font-medium">{paymentDetails.plan}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Billing:</span>
                    <span className="font-medium">
                      ${paymentDetails.amount}/{paymentDetails.interval}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-green-600 capitalize">
                      {paymentDetails.status}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/chat" 
                className="px-6 py-3 bg-[#FF7F7F] text-white font-medium rounded-md hover:bg-[#FF6666] transition-colors"
              >
                Start Analyzing
              </Link>
              <Link 
                href="/account" 
                className="px-6 py-3 bg-white text-gray-700 font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                View My Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
} 