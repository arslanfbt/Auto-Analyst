"use client"
import { motion, useTransform, useScroll } from "framer-motion"
import Image from "next/image"
import { useRef } from "react"
import { ArrowRight } from "lucide-react"

export default function HeroSection() {
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])

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
            <Image
              src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/auto-analyst-logo-R9wBx0kWOUA96KxwKBtl1onOHp6o02.png"
              alt="Auto-Analyst Logo"
              width={300}
              height={80}
              className="mb-8"
            />
            <h1 className="text-6xl font-bold text-gray-900 mb-6">Transform Your Data Into Insights</h1>
            <p className="text-xl text-gray-600 mb-8">
              Harness the power of AI to analyze, predict, and optimize your business decisions
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = "/chat"}
              className="bg-[#FF7F7F] text-white px-8 py-4 rounded-full font-semibold flex items-center gap-2 hover:bg-[#FF6666] transition-colors"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
