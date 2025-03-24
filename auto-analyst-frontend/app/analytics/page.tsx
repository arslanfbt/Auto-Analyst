"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AnalyticsIndexPage() {
  const router = useRouter()
  
  // Redirect to dashboard by default
  useEffect(() => {
    router.push('/analytics/dashboard')
  }, [router])
  
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF7F7F]"></div>
    </div>
  )
} 