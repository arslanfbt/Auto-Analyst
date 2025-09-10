"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const [adminPassword, setAdminPassword] = useState("")
  const [error, setError] = useState("")
  const [redirectUrl, setRedirectUrl] = useState("/chat")
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Get the redirect URL from the query parameters if it exists
    const redirect = searchParams?.get('redirect')
    if (redirect) {
      setRedirectUrl(redirect)
    }
  }, [searchParams])

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (adminPassword === process.env.NEXT_PUBLIC_ANALYTICS_ADMIN_PASSWORD) {
      localStorage.setItem('isAdmin', 'true')
      // Set a flag for first-time login to show onboarding tooltips
      if (!localStorage.getItem('hasSeenOnboarding')) {
        localStorage.setItem('showOnboarding', 'true')
      }
      router.push(redirectUrl)
    } else {
      setError("Invalid temporary code")
    }
  }

  const handleGoogleSignIn = () => {
    // Set a flag for first-time login to show onboarding tooltips
    if (!localStorage.getItem('hasSeenOnboarding')) {
      localStorage.setItem('showOnboarding', 'true')
    }
    signIn("google", { callbackUrl: redirectUrl })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
      </div>

      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <div className="p-8 bg-white rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Sign In
          </h2>

          <div className="space-y-6">
            {/* Google Sign In */}
            <div>
              <Button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            {/* Admin Access */}
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-100 text-red-600 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <div>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter temporary code"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7F7F] focus:border-transparent text-black"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full bg-[#FF7F7F] text-white hover:bg-[#FF6666]"
              >
                Temporary Login
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 