"use client"

import { signOut } from "next-auth/react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export default function SignOut() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
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
          
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
            Sign Out
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Are you sure you want to sign out?
          </p>
          
          <div className="space-y-4">
            <Button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full bg-red-500 text-white hover:bg-red-600"
            >
              Yes, Sign Out
            </Button>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="w-full text-black"

            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 