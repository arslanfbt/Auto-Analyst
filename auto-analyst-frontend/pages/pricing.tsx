import { useState } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { CheckCircle, X, Check } from 'lucide-react';
import Link from 'next/link';
import getStripe from '../utils/get-stripejs';

// Define pricing tiers with both monthly and yearly options
const pricingTiers = [
  {
    name: 'Basic',
    monthly: {
      price: 19.99,
      priceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID,
    },
    yearly: {
      price: 199.99,
      priceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_YEARLY_PRICE_ID,
      savings: 39.89, // ($19.99 * 12) - $199.99
    },
    credits: {
      monthly: 500,
      yearly: 6500, // 500 * 12 + 500 bonus
    },
    features: [
      'Access to Basic tier models',
      'CSV data analysis',
      'Standard support',
      'Single user access',
    ],
    highlight: false,
  },
  {
    name: 'Standard',
    monthly: {
      price: 49.99,
      priceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID,
    },
    yearly: {
      price: 499.99,
      priceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID,
      savings: 99.89, // ($49.99 * 12) - $499.99
    },
    credits: {
      monthly: 2000,
      yearly: 26000, // 2000 * 12 + 2000 bonus
    },
    features: [
      'Everything in Basic',
      'Access to Standard tier models',
      'Priority support',
      'Advanced data visualizations',
      'API access',
      'Data export capabilities',
    ],
    highlight: true,
  },
  {
    name: 'Premium',
    monthly: {
      price: 99.99,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
    },
    yearly: {
      price: 999.99,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID,
      savings: 199.89, // ($99.99 * 12) - $999.99
    },
    credits: {
      monthly: 5000,
      yearly: 65000, // 5000 * 12 + 5000 bonus
    },
    features: [
      'Everything in Standard',
      'Access to Premium tier models',
      'Dedicated support',
      'Unlimited CSV uploads',
      'Team collaboration features',
      'Custom model fine-tuning',
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
  const handleCheckout = async (priceId: string | undefined, tierName: string) => {
    if (!priceId) return;
    
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
    } finally {
      setIsLoading(false);
      setSelectedTier(null);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Head>
        <title>Pricing | Auto-Analyst</title>
        <meta name="description" content="Choose the plan that fits your data analysis needs" />
      </Head>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get access to powerful AI data analysis tools with flexible pricing options
          </p>
          
          {/* Billing cycle toggle */}
          <div className="mt-8 inline-flex items-center p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly <span className="text-green-600 font-semibold">Save up to 17%</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingTiers.map((tier) => (
            <motion.div
              key={tier.name}
              whileHover={{ y: -5 }}
              className={`rounded-lg overflow-hidden shadow-lg bg-white transition-all h-full flex flex-col ${
                tier.highlight ? 'ring-2 ring-[#FF7F7F] relative' : ''
              }`}
            >
              {tier.highlight && (
                <div className="absolute top-0 inset-x-0 bg-[#FF7F7F] text-white text-center py-1 text-sm font-medium">
                  Most Popular
                </div>
              )}
              
              <div className={`px-6 py-8 ${tier.highlight ? 'pt-10' : ''} flex-1 flex flex-col`}>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{tier.name}</h3>
                <div className="flex items-baseline mb-2">
                  <span className="text-5xl font-extrabold text-gray-900">
                    ${billingCycle === 'monthly' ? tier.monthly.price : tier.yearly.price}
                  </span>
                  <span className="text-gray-600 ml-1">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                
                {billingCycle === 'yearly' && (
                  <p className="text-green-600 font-medium mb-4">
                    Save ${tier.yearly.savings.toFixed(2)} per year
                  </p>
                )}
                
                <p className="text-lg text-gray-700 mb-6">
                  {billingCycle === 'monthly' 
                    ? `${tier.credits.monthly.toLocaleString()} credits per month`
                    : `${tier.credits.yearly.toLocaleString()} credits per year`}
                  {billingCycle === 'yearly' && <span className="text-sm text-green-600 ml-1">(1 month free)</span>}
                </p>
                
                <ul className="space-y-4 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handleCheckout(
                    billingCycle === 'monthly' ? tier.monthly.priceId : tier.yearly.priceId,
                    tier.name
                  )}
                  disabled={isLoading && selectedTier === tier.name}
                  className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-md transition-colors ${
                    tier.highlight
                      ? 'bg-[#FF7F7F] hover:bg-[#FF6666]'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {isLoading && selectedTier === tier.name
                    ? 'Processing...'
                    : session
                    ? `Subscribe ${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}`
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
                  <td className="py-4 px-6 border-b text-gray-700 font-medium">Credits</td>
                  {pricingTiers.map((tier) => (
                    <td key={`${tier.name}-credits`} className="py-4 px-6 border-b text-center">
                      {billingCycle === 'monthly' 
                        ? tier.credits.monthly.toLocaleString() 
                        : tier.credits.yearly.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-6 border-b text-gray-700 font-medium">Access to all models</td>
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
                  <td className="py-4 px-6 border-b text-gray-700 font-medium">API Access</td>
                  <td className="py-4 px-6 border-b text-center">
                    <X className="h-5 w-5 text-red-500 mx-auto" />
                  </td>
                  <td className="py-4 px-6 border-b text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
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
                  <td className="py-4 px-6 border-b text-center">Standard</td>
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
              <h3 className="text-lg font-medium text-gray-900">What are credits?</h3>
              <p className="mt-2 text-gray-600">Credits are used to process your requests. Each request consumes a certain number of credits based on complexity and model used.</p>
            </div>
            <div className="py-6">
              <h3 className="text-lg font-medium text-gray-900">Can I upgrade or downgrade my plan?</h3>
              <p className="mt-2 text-gray-600">Yes, you can change your plan at any time. Changes will be reflected in your next billing cycle.</p>
            </div>
            <div className="py-6">
              <h3 className="text-lg font-medium text-gray-900">What happens if I run out of credits?</h3>
              <p className="mt-2 text-gray-600">You can purchase additional credits or upgrade to a higher tier plan with more credits.</p>
            </div>
            <div className="py-6">
              <h3 className="text-lg font-medium text-gray-900">Do unused credits roll over?</h3>
              <p className="mt-2 text-gray-600">No, credits reset at the beginning of each billing cycle.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 