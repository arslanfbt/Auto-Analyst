import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import Layout from '@/components/layout'
import { motion } from 'framer-motion'
import { 
  User, Settings, CreditCard, BarChart3, 
  LogOut, AlertCircle, CheckCircle, Loader2,
  Calendar, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { signOut } from 'next-auth/react'
import Link from 'next/link'

interface UserProfile {
  name: string;
  email: string;
  image?: string;
  joinedDate: string;
  role: string;
}

interface Subscription {
  plan: string;
  status: string;
  renewalDate?: string;
  amount: number;
  interval: string;
}

interface CreditUsage {
  used: number;
  total: number;
  resetDate: string;
  lastUpdate: string;
}

interface UserDataResponse {
  profile: UserProfile;
  subscription: Subscription | null;
  credits: CreditUsage;
}

export default function AccountPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [credits, setCredits] = useState<CreditUsage | null>(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Main heading styles
  const mainHeadingStyle = "text-2xl font-bold text-gray-900 mb-2"
  const sectionHeadingStyle = "text-lg font-medium text-gray-900 mb-2 flex items-center gap-2"
  const cardBgStyle = "bg-white border border-gray-200 rounded-lg" 
  const cardHeaderStyle = "border-b border-gray-100 bg-white text-gray-900"
  const cardContentStyle = "bg-white text-gray-800"

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user/data')
      if (!response.ok) {
        throw new Error('Failed to fetch user data')
      }
      
      const data: UserDataResponse = await response.json()
      setProfile(data.profile)
      setSubscription(data.subscription)
      setCredits(data.credits)
      setLoading(false)
      
    } catch (err: any) {
      console.error('Error fetching user data:', err)
      setError(err.message || 'Failed to load user data')
      setLoading(false)
    }
  }

  const refreshUsageData = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/user/credits')
      if (!response.ok) {
        throw new Error('Failed to refresh usage data')
      }
      
      const data = await response.json()
      setCredits(data)
      
    } catch (err: any) {
      console.error('Error refreshing credit data:', err)
      setError(err.message || 'Failed to refresh credit data')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }

    if (status === 'authenticated' && session) {
      fetchUserData()
    }
  }, [status, session, router])

  useEffect(() => {
    // Add CSS for custom toggle switches
    const style = document.createElement('style');
    style.textContent = `
      input[type="checkbox"]:checked + label {
        background-color: #FF7F7F;
      }
      input[type="checkbox"]:checked + label .dot {
        transform: translateX(100%);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (status === 'loading' || loading) {
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
        <title>My Account | Auto-Analyst</title>
      </Head>

      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-6">
            <h1 className={mainHeadingStyle}>My Account</h1>
            <p className="text-gray-600">Manage your account settings and view your usage</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-3">
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="text-center pb-2 bg-white border-b border-gray-100">
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4 overflow-hidden">
                      {profile?.image ? (
                        <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={40} className="text-gray-600" />
                      )}
                    </div>
                    <CardTitle className="text-gray-900">{profile?.name || 'User'}</CardTitle>
                    <CardDescription className="text-sm text-gray-600">{profile?.email || 'user@example.com'}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 bg-white">
                  <div className="text-sm text-gray-600 mb-6">
                    <div className="flex justify-between py-1">
                      <span>Member since:</span>
                      <span>{profile?.joinedDate || '2023-01-01'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Status:</span>
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle size={12} />
                        Active
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Button 
                      variant="outline"
                      className={`w-full justify-start text-left ${
                        activeTab === 'overview' ? "bg-[#FF7F7F] text-white" : "bg-white text-gray-700 hover:bg-[#FFB3B3] hover:text-gray-900"
                      }`}
                      onClick={() => setActiveTab('overview')}
                    >
                      <BarChart3 size={16} className="mr-2" />
                      Overview
                    </Button>
                    <Button 
                      variant="outline"
                      className={`w-full justify-start text-left ${
                        activeTab === 'subscription' ? "bg-[#FF7F7F] text-white" : "bg-white text-gray-700 hover:bg-[#FFB3B3] hover:text-gray-900"
                      }`}
                      onClick={() => setActiveTab('subscription')}
                    >
                      <CreditCard size={16} className="mr-2" />
                      Subscription
                    </Button>
                    <Button 
                      variant="outline"
                      className={`w-full justify-start text-left ${
                        activeTab === 'settings' ? "bg-[#FF7F7F] text-white" : "bg-white text-gray-700 hover:bg-[#FFB3B3] hover:text-gray-900"
                      }`}
                      onClick={() => setActiveTab('settings')}
                    >
                      <Settings size={16} className="mr-2" />
                      Settings
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full justify-start text-left text-red-500 hover:text-red-600 hover:bg-red-100"
                      onClick={() => signOut({ callbackUrl: '/' })}
                    >
                      <LogOut size={16} className="mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-9">
              {activeTab === 'overview' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className={`mb-6 ${cardBgStyle}`}>
                    <CardHeader className={cardHeaderStyle}>
                      <CardTitle className="text-gray-900">Subscription Summary</CardTitle>
                      <CardDescription className="text-gray-600">Your current plan and usage</CardDescription>
                    </CardHeader>
                    <CardContent className={cardContentStyle}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className={sectionHeadingStyle}>
                            <CreditCard size={20} className="text-[#FF7F7F]" />
                            Current Plan
                          </h3>
                          <div className="bg-gray-50 p-4 rounded-lg text-gray-800">
                            <div className="flex justify-between mb-2">
                              <span className="text-gray-600">Plan:</span>
                              <span className="font-medium text-gray-900">{subscription?.plan || 'Free'}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                              <span className="text-gray-600">Status:</span>
                              <span className={`font-medium flex items-center gap-1 ${subscription?.status === 'active' ? 'text-green-600' : 'text-amber-600'}`}>
                                {subscription?.status === 'active' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                {subscription?.status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className="flex justify-between mb-2">
                              <span className="text-gray-600">Price:</span>
                              <span className="font-medium text-gray-900">
                                ${subscription?.amount || '0.00'}/{subscription?.interval || 'month'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Next billing:</span>
                              <span className="font-medium text-gray-900">{subscription?.renewalDate || 'N/A'}</span>
                            </div>
                          </div>
                          <Button
                            className="mt-4 w-full bg-[#FF7F7F] hover:bg-[#FF6666] text-white"
                            onClick={() => router.push('/pricing')}
                          >
                            {subscription?.status === 'active' ? 'Change Plan' : 'Upgrade Now'}
                          </Button>
                        </div>

                        <div>
                          <h3 className={sectionHeadingStyle}>
                            <BarChart3 size={20} className="text-[#FF7F7F]" />
                            Credits Usage
                          </h3>
                          <div className="bg-gray-50 p-4 rounded-lg text-gray-800">
                            <div className="mb-2">
                              <div className="flex justify-between mb-1">
                                <span className="text-gray-600">Used:</span>
                                <span className="font-medium text-gray-900">{credits?.used || 0} / {credits?.total || 0}</span>
                              </div>
                              <Progress 
                                value={credits ? (credits.used / credits.total) * 100 : 0} 
                                className="h-2 bg-gray-200"
                              />
                            </div>
                            <div className="flex justify-between mb-2">
                              <span className="text-gray-600">Reset date:</span>
                              <span className="font-medium flex items-center gap-1 text-gray-900">
                                <Calendar size={14} className="text-gray-500" />
                                {credits?.resetDate || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Last updated:</span>
                              <span className="text-sm text-gray-500">
                                {credits?.lastUpdate ? new Date(credits.lastUpdate).toLocaleString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            className="mt-4 w-full flex items-center justify-center gap-2 text-gray-700 bg-white hover:bg-[#FFB3B3] hover:text-gray-900"
                            onClick={refreshUsageData}
                            disabled={refreshing}
                          >
                            {refreshing ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <RefreshCw size={14} />
                            )}
                            {refreshing ? 'Refreshing...' : 'Refresh Usage Data'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={cardBgStyle}>
                    <CardHeader className={cardHeaderStyle}>
                      <CardTitle className="text-gray-900">Recent Activity</CardTitle>
                      <CardDescription className="text-gray-600">Your recent interactions with Auto-Analyst</CardDescription>
                    </CardHeader>
                    <CardContent className={cardContentStyle}>
                      <div className="text-center py-8 text-gray-500">
                        <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>Your activity history will appear here</p>
                        <p className="text-sm">Start analyzing data to see your recent activity</p>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-center bg-white border-t border-gray-100">
                      <Button 
                        className="bg-[#FF7F7F] hover:bg-[#FF6666] text-white"
                        onClick={() => router.push('/chat')}
                      >
                        Start Analyzing
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'subscription' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className={`mb-6 ${cardBgStyle}`}>
                    <CardHeader className={cardHeaderStyle}>
                      <CardTitle className="text-gray-900">Your Subscription</CardTitle>
                      <CardDescription className="text-gray-600">Manage your subscription details and billing</CardDescription>
                    </CardHeader>
                    <CardContent className={cardContentStyle}>
                      <div className="space-y-6">
                        <div className="bg-gray-50 p-5 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-xl font-medium text-gray-900">{subscription?.plan || 'Free Plan'}</h3>
                              <p className="text-gray-600 mt-1">
                                ${subscription?.amount || '0.00'}/{subscription?.interval || 'month'}
                              </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              subscription?.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {subscription?.status === 'active' ? 'Active' : 'Inactive'}
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex justify-between mb-2">
                              <span className="text-gray-600">Billing period:</span>
                              <span className="text-gray-900">Monthly</span>
                            </div>
                            <div className="flex justify-between mb-2">
                              <span className="text-gray-600">Next billing date:</span>
                              <span className="text-gray-900">{subscription?.renewalDate || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                              <span className="text-gray-600">Payment method:</span>
                              <span className="text-gray-900">Credit Card •••• 4242</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-3">
                          <Button
                            className="bg-[#FF7F7F] hover:bg-[#FF6666] text-white"
                            onClick={() => router.push('/pricing')}
                          >
                            Change Plan
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-white text-gray-700 border-gray-300 hover:bg-[#FFB3B3] hover:text-gray-900"
                          >
                            Update Payment Method
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-white text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200"
                          >
                            Cancel Subscription
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={cardBgStyle}>
                    <CardHeader className={cardHeaderStyle}>
                      <CardTitle className="text-gray-900">Billing History</CardTitle>
                      <CardDescription className="text-gray-600">Your past invoices and payments</CardDescription>
                    </CardHeader>
                    <CardContent className={cardContentStyle}>
                      <div className="text-center py-8 text-gray-500">
                        <CreditCard size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>No billing history available</p>
                        <p className="text-sm">Your billing history will appear here once you have made payments</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className={cardBgStyle}>
                    <CardHeader className={cardHeaderStyle}>
                      <CardTitle className="text-gray-900">Account Settings</CardTitle>
                      <CardDescription className="text-gray-600">Manage your profile and preferences</CardDescription>
                    </CardHeader>
                    <CardContent className={cardContentStyle}>
                      <div className="space-y-6">
                        <div>
                          <h3 className={sectionHeadingStyle}>Profile Information</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name
                              </label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                                defaultValue={profile?.name}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                              </label>
                              <input
                                type="email"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                                defaultValue={profile?.email}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                          <h3 className={sectionHeadingStyle}>Notification Settings</h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">Email Notifications</p>
                                <p className="text-sm text-gray-600">Receive updates about your account</p>
                              </div>
                              <div className="relative inline-block w-10 mr-2 align-middle">
                                <input 
                                  type="checkbox" 
                                  id="email-notifications" 
                                  defaultChecked 
                                  className="sr-only"
                                />
                                <label
                                  htmlFor="email-notifications"
                                  className="block overflow-hidden h-6 w-12 rounded-full bg-gray-300 cursor-pointer"
                                >
                                  <span className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out" />
                                </label>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">Usage Alerts</p>
                                <p className="text-sm text-gray-600">Get notified when you're close to your credit limit</p>
                              </div>
                              <div className="relative inline-block w-10 mr-2 align-middle">
                                <input 
                                  type="checkbox" 
                                  id="usage-alerts" 
                                  defaultChecked 
                                  className="sr-only"
                                />
                                <label
                                  htmlFor="usage-alerts"
                                  className="block overflow-hidden h-6 w-12 rounded-full bg-gray-300 cursor-pointer"
                                >
                                  <span className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out" />
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                          <h3 className={sectionHeadingStyle}>Security</h3>
                          <div className="flex flex-wrap gap-3">
                            <Button
                              variant="outline"
                              className="bg-white text-gray-700 border-gray-300"
                            >
                              Change Password
                            </Button>
                            <Button
                              variant="outline"
                              className="bg-white text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200"
                            >
                              Delete Account
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end bg-white border-t border-gray-100">
                      <Button
                        className="bg-[#FF7F7F] hover:bg-[#FF6666] text-white"
                      >
                        Save Changes
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </>
  )
} 