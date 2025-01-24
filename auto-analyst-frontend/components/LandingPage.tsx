"use client";
import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

// Updated color scheme: Neutral, elegant tones with subtle accents
const AIIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-16 h-16">
    <defs>
      <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6B7280" stopOpacity="0.8"/>
        <stop offset="100%" stopColor="#374151" stopOpacity="1"/>
      </linearGradient>
    </defs>
    <path 
      d="M32 10c-4.4 0-8 3.6-8 8v4H16c-4.4 0-8 3.6-8 8v16c0 4.4 3.6 8 8 8h32c4.4 0 8-3.6 8-8V30c0-4.4-3.6-8-8-8h-8v-4c0-4.4-3.6-8-8-8zm0 4c2.2 0 4 1.8 4 4v4h-8v-4c0-2.2 1.8-4 4-4zm-12 16h24c2.2 0 4 1.8 4 4v12c0 2.2-1.8 4-4 4H20c-2.2 0-4-1.8-4-4V34c0-2.2 1.8-4 4-4z" 
      fill="url(#aiGradient)"
    />
    <path 
      d="M22 38a2 2 0 100-4 2 2 0 000 4zm20-2a2 2 0 11-4 0 2 2 0 014 0z" 
      fill="#FFFFFF"
    />
  </svg>
);

const InsightsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-16 h-16">
    <defs>
      <linearGradient id="insightsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4B5563" stopOpacity="0.8"/>
        <stop offset="100%" stopColor="#1F2937" stopOpacity="1"/>
      </linearGradient>
    </defs>
    <path 
      d="M10 54h44V10H10v44zm4-4V38h12v12H14zm16 0V38h20v12H30zm-16-16V22h12v12H14zm16 0V22h20v12H30zm16-16V14h12v12H46z" 
      fill="url(#insightsGradient)"
    />
  </svg>
);

const DataIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-16 h-16">
    <defs>
      <linearGradient id="dataGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.6"/>
        <stop offset="100%" stopColor="#4338CA" stopOpacity="0.8"/>
      </linearGradient>
    </defs>
    <path 
      d="M32 10c-12.15 0-22 9.85-22 22s9.85 22 22 22 22-9.85 22-22S44.15 10 32 10zm0 36c-7.72 0-14-6.28-14-14s6.28-14 14-14 14 6.28 14 14-6.28 14-14 14z" 
      fill="url(#dataGradient)"
    />
    <circle cx="32" cy="32" r="8" fill="#FFFFFF" opacity="0.7"/>
  </svg>
);

interface FeatureCardProps {
  icon: React.ComponentType;
  title: string;
  description: string;
}   

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => (
  <motion.div
    whileHover={{ 
      scale: 1.05,
      boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)"
    }}
    className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/30 hover:border-gray-600 transition-all duration-300 transform"
  >
    <Icon />
    <h3 className="text-xl font-semibold mb-2 mt-4 text-gray-100">{title}</h3>
    <p className="text-gray-400">{description}</p>
  </motion.div>
);

const ParticleBackground = () => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {[...Array(100)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * dimensions.width,
            y: Math.random() * dimensions.height,
            opacity: 0,
          }}
          animate={{
            x: [
              Math.random() * dimensions.width, 
              Math.random() * dimensions.width,
              Math.random() * dimensions.width
            ],
            y: [
              Math.random() * dimensions.height,
              Math.random() * dimensions.height,
              Math.random() * dimensions.height
            ],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{
            duration: Math.random() * 15 + 10,
            repeat: Infinity,
            repeatType: "mirror"
          }}
          className="absolute w-1 h-1 bg-gray-500/20 rounded-full blur-sm"
        />
      ))}
    </div>
  );
};



const LandingPage = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "150%"]);

  return (
    <div 
      ref={ref}
      className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden relative"
    >
      <ParticleBackground />
      
      <motion.div 
        style={{ y: backgroundY }}
        className="absolute inset-0 z-0 bg-gradient-to-br from-gray-900/50 via-gray-800/50 to-black/50"
      />

      <div className="container mx-auto px-4 py-16 relative z-10">
        <motion.header 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, type: "spring", stiffness: 50 }}
          style={{ y: textY }}
          className="text-center mb-16"
        >
          <h1 className="text-7xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-gray-300 to-gray-500 drop-shadow-2xl">
            AutoAnalyst
          </h1>
          <p className="text-2xl mb-8 text-gray-400 tracking-wide">
            Intelligent Data Transformation & Predictive Insights
          </p>
        </motion.header>

        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.4, type: "spring", stiffness: 50 }}
          >
            <h2 className="text-4xl font-semibold mb-10 text-gray-200 leading-tight">
              Revolutionize Your Data Strategy
            </h2>
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <FeatureCard
                icon={AIIcon}
                title="AI-Powered"
                description="Advanced machine learning algorithms"
              />
              <FeatureCard
                icon={InsightsIcon}
                title="Smart Insights"
                description="Predictive analytics and trends"
              />
              <FeatureCard
                icon={DataIcon}
                title="Data Processing"
                description="Seamless data integration"
              />
              <FeatureCard
                icon={AIIcon}
                title="Adaptive Learning"
                description="Continuous improvement"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = "/chat"}
              className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-4 px-10 rounded-full transition duration-300 ease-in-out flex items-center gap-3 shadow-2xl"
            >
              <span>Launch Auto-Analyst</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.6, type: "spring", stiffness: 50 }}
            className="flex justify-center items-center"
          >
            <div className="relative w-[500px] h-[500px]">
              {/* Glowing core */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.4, 0.6, 0.4]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-24 bg-gradient-radial from-gray-600/20 via-gray-800/10 to-transparent rounded-full backdrop-blur-sm"
              />

              {/* Orbital rings */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    rotate: [0, 360],
                    opacity: [0.2, 0.6, 0.2]
                  }}
                  transition={{
                    duration: (i + 1) * 4,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className={`absolute inset-${16 + i * 10} border border-gray-600/50 rounded-full`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
