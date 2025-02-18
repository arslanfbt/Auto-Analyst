"use client"
import { motion, useTransform, useScroll } from "framer-motion"
import Image from "next/image"
import { useRef, useState, useEffect } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function HeroSection() {
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])

  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleGetStarted = () => {
    router.push('/chat')
  }

  const handleCustomSolution = () => {
    router.push('/enterprise') // You'll need to create this route
  }

  return (
    <section ref={containerRef} className="relative h-screen flex items-center overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-[#FEFEFE] via-[#FFFBFF] to-white opacity-10"
        style={{ y }}
      />
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1"
          >
            <div className="flex items-center gap-4 mb-8">
              <Image
                src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/Auto-analysts%20icon%20small-S682Oi8nbFhOADUHXJSD9d0KtSWKCe.png"
                alt="Auto-Analyst Logo"
                width={70}
                height={70}
                className="object-contain "
              />
              <h1 className="text-4xl font-bold text-gray-900 font-weight-normal">
                Auto-Analyst
              </h1>
            </div>
            
            <h2 className="text-6xl font-bold text-gray-800 mb-6">
              Transform Your Data Into Insights
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Harness the power of AI to analyze, predict, and optimize your business decisions
            </p>
            
            {mounted && (
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGetStarted}
                  className="bg-[#FF7F7F] text-white px-8 py-4 rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-[#FF6666] transition-colors"
                >
                  Get Started <ArrowRight className="w-5 h-5" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCustomSolution}
                  className="border-2 border-[#FF7F7F] text-[#FF7F7F] px-8 py-4 rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-[#FF7F7F] hover:text-white transition-colors"
                >
                  Enterprise Solutions
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FF7F7F] text-white">
                    Custom API
                  </span>
                </motion.button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
