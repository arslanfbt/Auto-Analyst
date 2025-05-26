"use client"
import { motion, useTransform, useScroll } from "framer-motion"
import Image from "next/image"
import { useRef, useState, useEffect } from "react"
import { ArrowRight, Github, Play, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
    router.push('/enterprise')
  }

  const supportedLLMs = [
    { name: "OpenAI", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/openai/openai-original.svg" },
    { name: "Anthropic", logo: "https://anthropic.com/images/logos/anthropic-logo.svg" },
    { name: "Google", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" },
    { name: "Groq", logo: "https://groq.com/wp-content/uploads/2024/03/PBG-mark1-color.svg" },
    { name: "DeepSeek", logo: "https://deepseek.com/favicon.ico" },
  ]

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center overflow-hidden pt-20">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-[#FEFEFE] via-[#FFFBFF] to-white opacity-10"
        style={{ y }}
      />
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-4 mb-8"
          >
            <Image
              src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/Auto-analysts%20icon%20small-S682Oi8nbFhOADUHXJSD9d0KtSWKCe.png"
              alt="Auto-Analyst Logo"
              width={70}
              height={70}
              className="object-contain"
            />
            <h1 className="text-4xl font-bold text-gray-900">
              Auto-Analyst
            </h1>
            <Badge variant="secondary" className="ml-2">
              <Github className="w-3 h-3 mr-1" />
              Open Source
            </Badge>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-6xl font-bold text-gray-800 mb-6"
          >
            Your Open-Source 
            <span className="text-[#FF7F7F]"> AI Data Scientist</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-gray-600 mb-8 max-w-3xl"
          >
            Upload your CSV/Excel data and get complete analytics workflows — from data cleaning and statistical analysis to machine learning and visualizations. Unlike ChatGPT, Auto-Analyst uses specialized multi-agent orchestration designed specifically for data science.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-3 mb-8"
          >
            <Badge variant="outline" className="px-3 py-1">
              <Upload className="w-4 h-4 mr-2" />
              CSV/Excel Support
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              Multi-Agent Orchestration
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              LLM Agnostic
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              On-Premise Deployment
            </Badge>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-8"
          >
            <p className="text-sm text-gray-500 mb-3">Works with any LLM provider:</p>
            <div className="flex flex-wrap justify-center items-center gap-6">
              {supportedLLMs.map((llm, index) => (
                <div key={index} className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                  <Image
                    src={llm.logo}
                    alt={`${llm.name} logo`}
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                  <span className="text-sm text-gray-600">{llm.name}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {mounted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 mb-8"
            >
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="bg-[#FF7F7F] text-white px-8 py-4 rounded-full font-semibold hover:bg-[#FF6666] transition-colors"
              >
                <Play className="w-5 h-5 mr-2" />
                Try Free Demo
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.open('https://github.com/FireBird-Technologies/Auto-Analyst', '_blank')}
                className="border-2 border-[#FF7F7F] text-[#FF7F7F] px-8 py-4 rounded-full font-semibold hover:bg-[#FF7F7F] hover:text-white transition-colors"
              >
                <Github className="w-5 h-5 mr-2" />
                View on GitHub
              </Button>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-sm text-gray-500"
          >
            <p>✅ No vendor lock-in • ✅ Use your own API keys • ✅ MIT Licensed • ✅ Self-hostable</p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
