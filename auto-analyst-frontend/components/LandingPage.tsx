"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import HeroSection from "./HeroSection"
import FeaturesSection from "./FeatureSection"
import TestimonialsSection from "./TestimoniaslSections"
import Footer from "./Footer"
import { Button } from "./ui/button"

export default function LandingPage() {
  const router = useRouter()
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <nav className="fixed top-0 right-0 w-full z-50 p-6">
        <div className="max-w-7xl mx-auto flex justify-end">
          {session ? (
            <Button
              onClick={() => router.push('/chat')}
              className="bg-[#FF7F7F] text-white hover:bg-[#FF6666] shadow-md"
            >
              Go to Chat
            </Button>
          ) : (
            <Button
              onClick={() => router.push('/login')}
              className="bg-[#FF7F7F] text-white hover:bg-[#FF6666] shadow-md"
            >
              Sign in
            </Button>
          )}
        </div>
      </nav>
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <Footer />
    </div>
  )
}
