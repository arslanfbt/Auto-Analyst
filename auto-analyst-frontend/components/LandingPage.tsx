"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import HeroSection from "./HeroSection"
import FeaturesSection from "./FeatureSection"
import TestimonialsSection from "./TestimoniaslSections"
import Footer from "./Footer"
import { Button } from "./ui/button"
import CookieConsent from "./CookieConsent"
import { useState, useEffect } from "react"

export default function LandingPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Only check localStorage after component mounts on client
    setIsAdmin(localStorage.getItem('isAdmin') === 'true')
  }, [])

  // Prepare button content based on session state
  const renderAuthButton = () => {
    if (isAdmin) {
      return (
        <Button
          onClick={() => router.push('/chat')}
          className="bg-[#FF7F7F] text-white hover:bg-[#FF6666] shadow-md"
        >
          Go to Chat
        </Button>
      )
    }

    if (status === 'loading') {
      return (
        <Button
          className="bg-[#FF7F7F] text-white hover:bg-[#FF6666] shadow-md opacity-70"
          disabled
        >
          Loading...
        </Button>
      )
    }

    if (session) {
      return (
        <Button
          onClick={() => router.push('/chat')}
          className="bg-[#FF7F7F] text-white hover:bg-[#FF6666] shadow-md"
        >
          Go to Chat
        </Button>
      )
    }

    return (
      <Button
        onClick={() => router.push('/login')}
        className="bg-[#FF7F7F] text-white hover:bg-[#FF6666] shadow-md"
      >
        Sign in
      </Button>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <nav className="fixed top-0 right-0 w-full z-50 p-6">
        <div className="max-w-7xl mx-auto flex justify-end space-x-3">
          <Button
            onClick={() => router.push('/pricing')}
            className="bg-white text-[#FF7F7F] border border-[#FF7F7F] hover:bg-gray-50 shadow-sm"
          >
            Pricing
          </Button>
          
          {renderAuthButton()}
        </div>
      </nav>
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <Footer />
      {!isAdmin && <CookieConsent />}
    </div>
  )
}
