"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowRight, BarChart2, Brain, Database, LineChart, Lock, Zap } from "lucide-react"
import Image from "next/image"
import { useRef } from "react"

const features = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description: "Advanced algorithms that learn and adapt to your data patterns",
  },
  {
    icon: LineChart,
    title: "Real-time Insights",
    description: "Instant analytics and visualization of your data streams",
  },
  {
    icon: Database,
    title: "Secure Storage",
    description: "Enterprise-grade security for your sensitive information",
  },
  {
    icon: BarChart2,
    title: "Custom Reports",
    description: "Tailored reporting solutions for your business needs",
  },
  {
    icon: Lock,
    title: "Data Privacy",
    description: "Complete control over your data with advanced encryption",
  },
  {
    icon: Zap,
    title: "Fast Processing",
    description: "Lightning-fast data processing and analysis capabilities",
  },
]

const testimonials = [
  {
    quote: "Auto-Analyst transformed how we handle our data analysis. It's revolutionary.",
    author: "Sarah J.",
    role: "Data Scientist",
  },
  {
    quote: "The insights we get from Auto-Analyst have been game-changing for our business.",
    author: "Michael R.",
    role: "CEO",
  },
  {
    quote: "Incredibly powerful yet easy to use. Exactly what we needed.",
    author: "David L.",
    role: "Analytics Manager",
  },
]

export default function LandingPage() {
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center overflow-hidden">
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

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="flex-1"
            >
              <div className="relative w-full aspect-square">
                <div className="absolute inset-0 bg-gradient-to-r from-[#FF7F7F] to-[#FF9999] rounded-full opacity-20 blur-3xl" />
                <div className="relative z-10 w-full h-full flex items-center justify-center">
                  <div className="w-4/5 aspect-square relative">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          rotate: 360,
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 8 + i * 2,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "linear",
                        }}
                        className="absolute inset-0 border-2 border-[#FF7F7F] rounded-full"
                        style={{
                          opacity: 0.2 - i * 0.05,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600">Everything you need to analyze and understand your data</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all duration-300"
              >
                <feature.icon className="w-12 h-12 text-[#FF7F7F] mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-600">Join thousands of satisfied customers</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-8 rounded-2xl bg-white shadow-lg"
              >
                <p className="text-gray-600 mb-6 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-gray-500">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Image
                src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/auto-analyst-logo-R9wBx0kWOUA96KxwKBtl1onOHp6o02.png"
                alt="Auto-Analyst Logo"
                width={150}
                height={40}
                className="mb-4"
              />
              <p className="text-gray-400">Transforming data into actionable insights</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Features</li>
                <li>Pricing</li>
                <li>Documentation</li>
                <li>API</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>About</li>
                <li>Blog</li>
                <li>Careers</li>
                <li>Contact</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Privacy</li>
                <li>Terms</li>
                <li>Security</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Auto-Analyst. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

