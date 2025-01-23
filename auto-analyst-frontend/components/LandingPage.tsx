"use client"
import React from "react"
import { motion } from "framer-motion"

// Custom icon components to replace react-icons
const RobotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
)

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const DatabaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
)

const LaptopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17c.75-2.25 2-3 4-3h6c2 0 3.25 1.75 4 3" />
  </svg>
)

const RocketIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

const FeatureCard = ({ icon: Icon, title, description }) => (
  <motion.div 
    whileHover={{ scale: 1.05 }}
    className="bg-white/10 p-6 rounded-xl border border-white/20 hover:border-blue-500 transition-all duration-300"
  >
    <Icon />
    <h3 className="text-xl font-semibold mb-2 mt-4">{title}</h3>
    <p className="text-gray-300">{description}</p>
  </motion.div>
)

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-black text-white overflow-hidden relative">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 z-0 opacity-50">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 0, 
              y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : 0 
            }}
            animate={{ 
              x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 0, 
              y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : 0,
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{ 
              duration: Math.random() * 10 + 5, 
              repeat: Infinity, 
              repeatType: "reverse" 
            }}
            className="absolute w-2 h-2 bg-white/30 rounded-full"
          />
        ))}
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <header className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-6xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600"
          >
            Auto-Analyst
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl mb-8 text-gray-300"
          >
            Transforming Data into Actionable Insights
          </motion.p>
        </header>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <h2 className="text-3xl font-semibold mb-8 text-blue-300">
              Unleash the Power of AI-Driven Analytics
            </h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <FeatureCard 
                icon={RobotIcon}
                title="AI-Powered"
                description="Advanced machine learning algorithms"
              />
              <FeatureCard 
                icon={ChartIcon}
                title="Smart Insights"
                description="Predictive analytics and trends"
              />
              <FeatureCard 
                icon={DatabaseIcon}
                title="Data Processing"
                description="Seamless data integration"
              />
              <FeatureCard 
                icon={LaptopIcon}
                title="Flexible"
                description="Adaptable to your workflow"
              />
            </div>
            <button
              onClick={() => {
                // Replace with your navigation logic
                window.location.href = "/chat"
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition duration-300 ease-in-out flex items-center gap-2"
            >
              <RocketIcon /> Launch Auto-Analyst
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex justify-center items-center"
          >
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.05, 0.95, 1]
              }}
              transition={{ 
                duration: 5, 
                repeat: Infinity, 
                repeatType: "reverse" 
              }}
              className="w-96 h-96 bg-blue-600/20 rounded-full flex justify-center items-center"
            >
              <div className="w-80 h-80 bg-blue-600/30 rounded-full animate-pulse"></div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage