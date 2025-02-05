"use client"

import { signIn } from "next-auth/react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export default function Login() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrl = searchParams.get("callbackUrl") || "/chat"

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
          <div className="flex justify-center mb-8">
            <Image
              src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/auto-analyst-logo-R9wBx0kWOUA96KxwKBtl1onOHp6o02.png"
              alt="Auto-Analyst Logo"
              width={200}
              height={50}
              priority
            />
          </div>
          
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Welcome to Auto-Analyst
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Sign in to access the AI-powered analytics platform
          </p>
          
          <Button
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          >
            <Image
              src="https://authjs.dev/img/providers/google.svg"
              alt="Google"
              width={20}
              height={20}
            />
            Continue with Google
          </Button>
          
          <p className="mt-4 text-center text-sm text-gray-500">
            By signing in, you agree to our{" "}
            <a href="#" className="text-[#FF7F7F] hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-[#FF7F7F] hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
} 