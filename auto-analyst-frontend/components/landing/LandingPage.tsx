"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import HeroSection from "./HeroSection"
import FeaturesSection from "./FeatureSection"
import AgentsSection from "./AgentsSection"
import ConnectorsSection from "./ConnectorsSection"
import MissionSection from "./MissionSection"
import Footer from "./Footer"
import StatsTicker from "./StatsTicker"
import { Button } from "../ui/button"
import CookieConsent from "./CookieConsent"
import { useState, useEffect } from "react"
import Image from "next/image"
import WhyAutoAnalystSection from "./WhyAutoAnalystSection"

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
      <nav className="sticky top-0 left-0 right-0 w-full z-50 bg-white/90 backdrop-blur-sm shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-row justify-between items-center">
          <div className="flex items-center gap-2">
            <Image
              src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/Auto-analysts%20icon%20small-S682Oi8nbFhOADUHXJSD9d0KtSWKCe.png"
              alt="Auto-Analyst Logo"
              width={36}
              height={36}
              className="object-contain"
            />
            <span className="text-lg font-semibold text-gray-900">Auto-Analyst</span>
          </div>
          <div className="flex flex-row gap-2">
            <Button
              onClick={() => router.push('/pricing')}
              className="bg-white text-[#FF7F7F] border border-[#FF7F7F] hover:bg-gray-50 shadow-sm"
            >
              Pricing
            </Button>
            {renderAuthButton()}
          </div>
        </div>
      </nav>
      
      <div className="pt-4 sm:pt-0"> {/* Add padding to account for fixed navbar on mobile */}
        <HeroSection />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <StatsTicker />
        </div>
        <AgentsSection />
        <WhyAutoAnalystSection />
        <FeaturesSection />
        <ConnectorsSection />
        <MissionSection />
        <Footer />
        {!isAdmin && <CookieConsent />}
      </div>
    </div>
  )
}
