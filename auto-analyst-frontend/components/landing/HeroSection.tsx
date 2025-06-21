"use client"
import { motion, useTransform, useScroll } from "framer-motion"
import Image from "next/image"
import { useRef, useState, useEffect } from "react"
import { ArrowRight, Github, Play, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

const screenshots = [
  {
    src: "/images/screenshots/autoanalyst-chat.png",
    alt: "Chat interface screenshot",
    title: "Intelligent Data Analysis",
    description: "Ask questions in natural language and get instant insights from your data. Our AI understands context and provides relevant visualizations."
  },
  {
    src: "/images/screenshots/autoanalyst-visualisation.png",
    alt: "Visualization dashboard screenshot",
    title: "Beautiful Visualizations",
    description: "Automatically generate interactive charts and graphs that tell your data's story. Export and share insights with your team."
  },
  {
    src: "/images/screenshots/autoanalyst-code.png",
    alt: "Code canvas screenshot",
    title: "Advanced Analytics",
    description: "Auto-Analyst provides advanced analytics capabilities, including time series analysis, trend identification, and predictive modeling."
  },
  {
    src: "/images/screenshots/autoanalyst-deepanalysis.gif",
    alt: "Deep analysis screenshot",
    title: "Introducing Deep Analysis",
    description: "A 5-step process for critical insight: ask deeper questions, craft an in-depth plan, execute with agents, synthesize findings, and deliver a final recommendation."
  }  
  // {
  //   src: "/images/screenshots/autoanalyst-code-edit.png",
  //   alt: "Code editor screenshot",
  //   title: "Code Editor",
  //   description: "Select code, click edit, and let AI make it better. Simple as that."
  // },
  // {
  //   src: "/images/screenshots/autoanalyst-code-fixes.png",
  //   alt: "Code fixes screenshot",
  //   title: "Code Fixes",
  //   description: "Buggy code? No problem. Our AI will fix it for you."
  // }
]

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
    if (session) {
      router.push('/chat')
    } else {
      router.push('/login?callbackUrl=/chat')
    }
  }

  const handleCustomSolution = () => {
    router.push('/enterprise')
  }

  const supportedLLMs = [
    { 
      name: "OpenAI", 
      logo: "/images/llm-providers/openai-logo.svg",
      alt: "OpenAI logo"
    },
    { 
      name: "Anthropic", 
      logo: "/images/llm-providers/anthropic-logo.svg",
      alt: "Anthropic logo"
    },
    { 
      name: "Google", 
      logo: "/images/llm-providers/google-logo.svg",
      alt: "Google logo"
    },
    { 
      name: "Groq", 
      logo: "/images/llm-providers/groq-logo.svg",
      alt: "Groq logo"
    },
    { 
      name: "DeepSeek", 
      logo: "/images/llm-providers/deepseek-logo.svg",
      alt: "DeepSeek logo"
    },
  ]

  return (
    <section ref={containerRef} className="relative min-h-[70vh] flex items-center overflow-hidden pt-10 pb-8 sm:pt-14 sm:pb-12 px-4 sm:px-6 bg-gradient-to-br from-white via-[#fff6f6] to-[#fff]">
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
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-4 sm:mb-6"
          >
            <Image
              src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/Auto-analysts%20icon%20small-S682Oi8nbFhOADUHXJSD9d0KtSWKCe.png"
              alt="Auto-Analyst Logo"
              width={60}
              height={60}
              className="object-contain"
            />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Auto-Analyst
            </h1>
            <Badge variant="secondary" className="ml-0 sm:ml-2">
              <Github className="w-3 h-3 mr-1" />
              Open Source
            </Badge>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-2 sm:mb-3 px-2"
          >
            Your AI <span className="text-[#FF7F7F]">Data Scientist</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-lg sm:text-xl text-gray-600 mb-4 sm:mb-6 max-w-2xl px-4 font-medium"
          >
            Vibe Analytics, Real Insights
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative w-full max-w-4xl mb-12 sm:mb-16"
          >
            <div className="rounded-2xl shadow-xl overflow-hidden bg-white border border-gray-100">
              <Image
                src={screenshots[0].src}
                alt={screenshots[0].alt}
                width={1200}
                height={675}
                className="w-full h-auto object-cover"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-6 sm:mb-8 w-full px-4 mt-16 sm:mt-24"
          >
            <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">Works with any LLM provider:</p>
            <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6">
              {supportedLLMs.map((llm, index) => (
                <div key={index} className="flex items-center gap-1 sm:gap-2 opacity-70 hover:opacity-100 transition-opacity">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 relative">
                    <Image
                      src={llm.logo}
                      alt={llm.alt}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">{llm.name}</span>
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
                className="bg-[#FF7F7F] text-white px-4 sm:px-8 py-3 sm:py-4 rounded-full font-semibold hover:bg-[#FF6666] transition-colors w-full sm:w-auto shadow-lg shadow-[#ff7f7f]/10"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Get Started
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.open('https://github.com/FireBird-Technologies/Auto-Analyst', '_blank')}
                className="border-2 border-[#FF7F7F] text-[#FF7F7F] px-4 sm:px-8 py-3 sm:py-4 rounded-full font-semibold hover:bg-[#FF7F7F] hover:text-white transition-colors w-full sm:w-auto"
              >
                <Github className="w-5 h-5 mr-2" />
                View on GitHub
              </Button>
            </motion.div>
          )}


          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12 sm:mb-16 px-2"
          >
            <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              CSV/Excel Support
            </Badge>
            <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
              Multi-Agent Orchestration
            </Badge>
            <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
              LLM Agnostic
            </Badge>
            <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
              On-Premise Deployment
            </Badge>
          </motion.div>

          <div className="w-full max-w-6xl mx-auto space-y-16 sm:space-y-24">
            {screenshots.slice(1).map((shot, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className={`flex flex-col ${idx % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'} gap-8 sm:gap-12 items-center`}
              >
                <div className="w-full sm:w-1/2">
                  <div className={`rounded-2xl shadow-xl overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 ${shot.src.includes('.gif') ? 'bg-transparent border-0 shadow-none' : 'bg-white border border-gray-100'}`}>
                    <Image
                      src={shot.src}
                      alt={shot.alt}
                      width={600}
                      height={400}
                      className={`w-full h-auto ${shot.src.includes('.gif') ? 'object-contain bg-transparent rounded-2xl' : 'object-cover'}`}
                      unoptimized={shot.src.includes('.gif')}
                      style={shot.src.includes('.gif') ? { filter: 'none', background: 'transparent' } : {}}
                    />
                  </div>
                </div>
                <div className="w-full sm:w-1/2 text-left">
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                    {shot.title}
                  </h3>
                  <p className="text-base sm:text-lg text-gray-600">
                    {shot.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

        
        </div>
      </div>
    </section>
  )
}
