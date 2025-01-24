"use client"
import HeroSection from "./HeroSection"
import FeaturesSection from "./FeatureSection"
import TestimonialsSection from "./TestimoniaslSections"
import Footer from "./Footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <Footer />
    </div>
  )
}
