import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import CheckoutForm from '@/components/CheckoutForm';
import { Loader2 } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Load the stripe promise outside the component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const pricingTiers = [
  {
    name: 'free',
    displayName: 'Free',
    monthly: { price: 0 },
    yearly: { price: 0 }
  },
  {
    name: 'standard',
    displayName: 'Standard',
    monthly: { 
      price: 15, 
      priceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID 
    },
    yearly: { 
      price: 126, 
      priceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID 
    }
  },
  {
    name: 'pro',
    displayName: 'Pro',
    monthly: { 
      price: 29, 
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID 
    },
    yearly: { 
      price: 243.60, 
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID 
    }
  }
];

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { plan = '', cycle = 'monthly' } = router.query;

  // Get tier info based on URL parameters
  const tier = pricingTiers.find(t => t.name === plan);
  const interval = cycle === 'yearly' ? 'year' : 'month';
  const amount = tier ? tier[cycle as 'monthly' | 'yearly'].price : 0;
  const priceId = tier ? tier[cycle as 'monthly' | 'yearly'].priceId : null;
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/pricing');
      return;
    }
    
    // Redirect to pricing if no plan selected or loading
    if (status === 'loading' || !plan || !tier) {
      return;
    }
    
    // Create payment intent when component mounts
    const createPaymentIntent = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priceId,
            planName: tier?.displayName,
            interval,
            email: session?.user?.email
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create payment intent');
        }
        
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err: any) {
        console.error('Error creating payment intent:', err);
        setError(err.message || 'An error occurred while setting up the payment');
      } finally {
        setLoading(false);
      }
    };
    
    createPaymentIntent();
  }, [plan, cycle, router, session, status, tier, interval, priceId]);
  
  // Create stripe options with client secret
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#FF7F7F',
      },
    },
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#FF7F7F]" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <Head>
        <title>Checkout - Auto-Analyst</title>
      </Head>
      
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/pricing" passHref>
            <button className="flex items-center text-gray-700 hover:text-[#FF7F7F] transition-colors">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Pricing
            </button>
          </Link>
        </div>
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Purchase</h1>
          <p className="mt-2 text-gray-600">
            {tier?.displayName} Plan - ${amount}/{interval}
          </p>
        </div>
        
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-center">
            <p>{error}</p>
            <button 
              onClick={() => router.push('/pricing')}
              className="mt-4 text-[#FF7F7F] hover:underline"
            >
              Return to pricing
            </button>
          </div>
        ) : clientSecret ? (
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm 
              planName={tier?.displayName || ''} 
              amount={amount} 
              interval={interval as 'month' | 'year'} 
              clientSecret={clientSecret}
            />
          </Elements>
        ) : null}
      </div>
    </div>
  );
} 