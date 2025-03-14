import { useState } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { CheckCircle, X, Check } from 'lucide-react';
import Link from 'next/link';
import getStripe from '../utils/get-stripejs';
import { Infinity as InfinityIcon } from 'lucide-react';

// Define pricing tiers with both monthly and yearly options
const pricingTiers = [
  {
    name: 'Free',
    monthly: {
      price: 0,
      priceId: null, // No price ID for free tier
    },
    yearly: {
      price: 0,
      priceId: null, // No price ID for free tier
    },
    credits: {
      monthly: 100,
      yearly: 100,
    },
    features: [
      'Basic data analysis',
      'Standard models only',
      'Community support',
      'Limited token usage',
    ],
    highlight: false,
  },
  {
    name: 'Standard',
    monthly: {
      price: 15,
      priceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID,
    },
    yearly: {
      price: 126, // $15 * 12 months = $180, with 30% discount = $126
      priceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID,
      savings: 54, // $180 - $126 = $54 savings
    },
    credits: {
      monthly: 500,
      yearly: 500,
    },
    features: [
      'Advanced data analysis',
      'Access to all models',
      'Priority support',
      'Unlimited CSV uploads',
      'API access',
    ],
    highlight: true,
  },
  {
    name: 'Pro',
    monthly: {
      price: 8,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    },
    yearly: {
      price: 67.20, // $8 * 12 months = $96, with 30% discount = $67.20
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
      savings: 28.80, // $96 - $67.20 = $28.80 savings
    },
    credits: {
      monthly: 'Unlimited',
      yearly: 'Unlimited',
    },
    features: [
      'Everything in Standard',
      'Unlimited tokens',
      'Dedicated support',
      'Bring your own API key',
    ],
    highlight: false,
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  
  // Handle subscription checkout
  const handleCheckout = async (priceId: string | null | undefined, tierName: string) => {
    if (!priceId) {
      if (tierName === 'Free') {
        // Redirect free users to the chat page
        window.location.href = '/chat';
        return;
      }
      return;
    }
    
    setSelectedTier(tierName);
    setIsLoading(true);
    
    try {
      // Call backend API to create Checkout session
      const response = await fetch('/api/checkout-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: session?.user?.email || undefined,
        }),
      });
      
      const { sessionId } = await response.json();
      
      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      await stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Error during checkout:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-24">
      <Head>
        <title>Pricing - Auto-Analyst</title>
        <meta name="description" content="Choose a plan that works for you" />
      </Head>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Choose the plan that works best for your needs.
          </p>
        </div>
        
        {/* Billing cycle toggle */}
        <div className="mt-12 flex justify-center">
          <div className="relative bg-white p-0.5 rounded-lg shadow-sm flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`relative px-6 py-2 text-sm font-medium rounded-md focus:outline-none ${
                billingCycle === 'monthly'
                  ? 'bg-[#FF7F7F] text-white'
                  : 'text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`relative px-6 py-2 text-sm font-medium rounded-md focus:outline-none flex items-center ${
                billingCycle === 'yearly'
                  ? 'bg-[#FF7F7F] text-white'
                  : 'text-gray-700'
              }`}
            >
              Yearly
              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                billingCycle === 'yearly'
                  ? 'bg-white text-[#FF7F7F]'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                Save 30%
              </span>
            </button>
          </div>
        </div>
        
        {/* Pricing cards */}
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {pricingTiers.map((tier) => (
            <motion.div
              key={tier.name}
              className={`flex flex-col h-full bg-white rounded-lg shadow-md ${tier.highlight ? 'border-2 border-[#FF7F7F] shadow-lg relative' : 'border border-gray-200'}`}
              whileHover={{ translateY: -5 }}
              transition={{ duration: 0.3 }}
            >
              {tier.highlight && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#FF7F7F] text-white py-1 px-4 rounded-full text-sm font-medium">
                  Most Popular
                </div>
              )}
              
              <div className="p-6 flex-1">
                <h3 className="text-2xl font-bold text-gray-900">{tier.name}</h3>
                
                <div className="mt-4 flex items-baseline">
                  <span className="text-5xl font-extrabold tracking-tight text-gray-900">
                    ${billingCycle === 'monthly' 
                      ? tier.monthly.price
                      : tier.yearly.price}
                  </span>
                  <span className="ml-1 text-xl font-medium text-gray-500">
                    {tier.monthly.price === 0 ? '' : `/${billingCycle === 'monthly' ? 'mo' : 'yr'}`}
                  </span>
                </div>
                
                {billingCycle === 'yearly' && tier.yearly.savings && (
                  <p className="mt-2 text-sm text-green-600">
                    Save ${tier.yearly.savings.toFixed(2)} per year
                  </p>
                )}
                
                <p className="mt-4 text-lg text-gray-500">
                  {typeof tier.credits[billingCycle] === 'string' 
                    ? tier.credits[billingCycle] 
                    : <>{tier.credits[billingCycle].toLocaleString()} tokens</>}
                </p>
                
                <ul className="mt-6 space-y-4">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <CheckCircle className="flex-shrink-0 h-5 w-5 text-green-500" />
                      <span className="ml-3 text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={() => handleCheckout(
                    billingCycle === 'monthly' 
                      ? tier.monthly.priceId
                      : tier.yearly.priceId, 
                    tier.name
                  )}
                  disabled={isLoading && selectedTier === tier.name || (!session && tier.name !== 'Free')}
                  className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-md transition-colors ${
                    tier.monthly.price === 0
                      ? 'bg-gray-800 hover:bg-gray-700'
                      : tier.highlight
                        ? 'bg-[#FF7F7F] hover:bg-[#FF6666]'
                        : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {isLoading && selectedTier === tier.name
                    ? 'Processing...'
                    : tier.monthly.price === 0
                    ? 'Get Started Free'
                    : session
                    ? 'Subscribe Now'
                    : 'Sign In to Subscribe'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Feature comparison table */}
        <div className="mt-24">
          <h2 className="text-2xl font-bold text-center mb-12">Compare Plans</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-lg">
              <thead>
                <tr>
                  <th className="py-4 px-6 bg-gray-50 text-left font-medium text-gray-500 uppercase tracking-wider border-b">Features</th>
                  {pricingTiers.map((tier) => (
                    <th key={tier.name} className="py-4 px-6 bg-gray-50 text-center font-medium text-gray-900 border-b">
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-4 px-6 border-b text-gray-700 font-medium">Tokens</td>
                  {pricingTiers.map((tier) => (
                    <td key={`${tier.name}-credits`} className="py-4 px-6 border-b text-center">
                      {typeof tier.credits[billingCycle] === 'string' 
                        ? <InfinityIcon className="h-5 w-5 text-[#FF7F7F] mx-auto" />
                        : tier.credits[billingCycle].toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-6 border-b text-gray-700 font-medium">Custom API Integration</td>
                  <td className="py-4 px-6 border-b text-center">
                    <X className="h-5 w-5 text-red-500 mx-auto" />
                  </td>
                  <td className="py-4 px-6 border-b text-center">
                    <X className="h-5 w-5 text-red-500 mx-auto" />
                  </td>
                  <td className="py-4 px-6 border-b text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 border-b text-gray-700 font-medium">Bring Your Own API Key</td>
                  <td className="py-4 px-6 border-b text-center">
                    <X className="h-5 w-5 text-red-500 mx-auto" />
                  </td>
                  <td className="py-4 px-6 border-b text-center">
                    <X className="h-5 w-5 text-red-500 mx-auto" />
                  </td>
                  <td className="py-4 px-6 border-b text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 border-b text-gray-700 font-medium">Team Collaboration</td>
                  <td className="py-4 px-6 border-b text-center">
                    <X className="h-5 w-5 text-red-500 mx-auto" />
                  </td>
                  <td className="py-4 px-6 border-b text-center">
                    <X className="h-5 w-5 text-red-500 mx-auto" />
                  </td>
                  <td className="py-4 px-6 border-b text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 border-b text-gray-700 font-medium">Support Level</td>
                  <td className="py-4 px-6 border-b text-center">Community</td>
                  <td className="py-4 px-6 border-b text-center">Priority</td>
                  <td className="py-4 px-6 border-b text-center">Dedicated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Need a custom plan?</h2>
          <p className="text-lg text-gray-700 mb-6">
            Contact us for enterprise pricing and custom solutions.
          </p>
          <Link href="/contact" passHref>
            <button className="bg-white border-2 border-[#FF7F7F] text-[#FF7F7F] font-medium py-2 px-6 rounded-md hover:bg-[#FF7F7F] hover:text-white transition-colors">
              Contact Sales
            </button>
          </Link>
        </div>
        
        {/* FAQ Section */}
        <div className="mt-24">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto divide-y divide-gray-200">
            <div className="py-6">
              <h3 className="text-lg font-medium text-gray-900">What are tokens?</h3>
              <p className="mt-2 text-gray-600">Tokens are used to process your requests. Each request consumes a certain number of tokens based on complexity and model used.</p>
            </div>
            <div className="py-6">
              <h3 className="text-lg font-medium text-gray-900">How does the Pro plan's unlimited tokens work?</h3>
              <p className="mt-2 text-gray-600">With the Pro plan, you can use as many tokens as you need without worrying about limits. This is ideal for high-volume users or teams.</p>
            </div>
            <div className="py-6">
              <h3 className="text-lg font-medium text-gray-900">Can I upgrade or downgrade my plan?</h3>
              <p className="mt-2 text-gray-600">Yes, you can change your plan at any time. Changes will be reflected in your next billing cycle.</p>
            </div>
            <div className="py-6">
              <h3 className="text-lg font-medium text-gray-900">What does "bring your own API key" mean?</h3>
              <p className="mt-2 text-gray-600">Pro plan users can use their own API keys from supported LLM providers, potentially reducing costs and providing more control over the models used.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 