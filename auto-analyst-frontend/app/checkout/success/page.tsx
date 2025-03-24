"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const paymentIntentId = searchParams ? searchParams.get('payment_intent') : null;
  const sessionId = searchParams ? searchParams.get('session_id') : null;
  const router = useRouter();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');

  async function verifyPayment() {
    if ((!paymentIntentId && !sessionId) || !session?.user?.email) {
      setStatus('error');
      setErrorMessage('Missing payment information or user session');
      return;
    }

    try {
      console.log(`Verifying payment: ${paymentIntentId || sessionId}`);
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent: paymentIntentId,
          session_id: sessionId
        }),
      });

      const data = await response.json();
      console.log('Verification response:', data);

      if (response.ok && (data === true || data.success === true || data.alreadyProcessed === true)) {
        setStatus('success');
        
        // After a short delay, redirect to account page with refresh param
        setTimeout(() => {
          router.push('/account?refresh=true&from=checkout');
        }, 2000); // 2 second delay to show success message
      } else {
        // If we haven't reached max retries, try again
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          setTimeout(verifyPayment, 3000); // Retry after 3 seconds
        } else {
          setStatus('error');
          setErrorMessage(data.error || data.message || 'Failed to verify payment');
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(verifyPayment, 3000);
      } else {
        setStatus('error');
        setErrorMessage('Network error during payment verification');
      }
    }
  }

  useEffect(() => {
    verifyPayment();
  }, [paymentIntentId, sessionId, session]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6 space-y-6">
        {status === 'loading' && (
          <>
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className="relative h-16 w-16">
                <RefreshCw className="h-16 w-16 text-[#FF7F7F] animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-center">Activating Your Subscription</h1>
              <p className="text-gray-600 text-center">Please wait while we set up your new plan...</p>
              <p className="text-[#FF7F7F] font-medium">Retry attempt {retryCount}/3</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className="relative h-16 w-16">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-center text-green-700">Payment Successful!</h1>
              <p className="text-gray-600 text-center">
                Your subscription has been activated and your account has been credited.
              </p>
            </div>
            <Button asChild className="w-full bg-[#FF7F7F] hover:bg-[#FF6666] text-white">
              <Link href="/chat">Continue to Dashboard</Link>
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className="relative h-16 w-16">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-center text-red-700">Payment Verification Failed</h1>
              <p className="text-gray-600 text-center">
                {errorMessage || "We couldn't verify your payment. Please contact support for assistance."}
              </p>
            </div>
            <div className="flex flex-col space-y-3">
              <Button asChild className="w-full bg-[#FF7F7F] hover:bg-[#FF6666] text-white">
                <Link href="/pricing">Return to Pricing</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/contact">Contact Support</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}