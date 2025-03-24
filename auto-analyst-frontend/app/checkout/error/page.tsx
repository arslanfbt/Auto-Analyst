"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import Layout from '@/components/layout'

export default function CheckoutError() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorMessage, setErrorMessage] = useState<string>("An error occurred during checkout")

  useEffect(() => {
    // Get error message from query parameters if available
    const error = searchParams?.get('error')
    if (error) {
      setErrorMessage(decodeURIComponent(error))
    }
  }, [searchParams])

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500" />
            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              Checkout Failed
            </h1>
            <p className="mt-2 text-gray-600">
              {errorMessage}
            </p>
            <div className="mt-6 flex justify-center space-x-4">
              <button
                onClick={() => router.push('/pricing')}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Back to Pricing
              </button>
              <button
                onClick={() => router.push('/account')}
                className="px-4 py-2 bg-[#FF7F7F] text-white rounded hover:bg-[#FF6666]"
              >
                Go to Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 