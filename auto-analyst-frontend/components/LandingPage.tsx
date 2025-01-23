"use client"

import type React from "react"
import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import Link from "next/link"
import { motion } from "framer-motion"
// import AnimatedSphere from "./AnimatedSphere"

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-black text-white">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-6xl font-bold mb-4"
          >
            Auto-Analyst
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl mb-8"
          >
            AI-driven data analytics at your fingertips
          </motion.p>
        </header>

        <div className="flex flex-col md:flex-row items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="md:w-1/2 mb-8 md:mb-0"
          >
            <h2 className="text-3xl font-semibold mb-4">Features</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>AI-driven data analytics</li>
              <li>Streamlined data preprocessing</li>
              <li>Advanced statistical analysis</li>
              <li>Machine learning integration</li>
              <li>Interactive visualizations</li>
              <li>User-friendly interface</li>
            </ul>
            <Link href="/chat">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-8 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg"
              >
                Get Started
              </motion.button>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="md:w-1/2 h-96"
          >
            <Canvas>
              <Suspense fallback={null}>
                <OrbitControls enableZoom={false} />
                <ambientLight intensity={0.5} />
                <directionalLight position={[-2, 5, 2]} intensity={1} />
                {/* <AnimatedSphere /> */}
              </Suspense>
            </Canvas>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage

