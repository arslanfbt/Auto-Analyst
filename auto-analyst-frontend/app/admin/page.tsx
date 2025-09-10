"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdminLogin() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Simple admin bypass
    if (password === process.env.NEXT_PUBLIC_ANALYTICS_ADMIN_PASSWORD) {
      // Store admin status in localStorage
      localStorage.setItem('isAdmin', 'true')
      router.push("/chat")
    } else {
      setError("Invalid temporary code")
    }
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
            Temporary Login
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-100 text-red-600 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
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
  )
}