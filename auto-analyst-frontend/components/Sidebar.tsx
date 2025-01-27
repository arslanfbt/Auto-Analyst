"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

// Sidebar Component
const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "tween" }}
          className="fixed inset-y-0 left-0 w-64 bg-gray-800 shadow-2xl z-50 p-6"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-gray-200 mb-6 mt-10">Auto-Analyst</h2>
          <nav className="space-y-4">
            <a href="#" className="block text-gray-300 hover:text-white transition-colors">New Chat</a>
            <a href="#" className="block text-gray-300 hover:text-white transition-colors">History</a>
            <a href="#" className="block text-gray-300 hover:text-white transition-colors">Settings</a>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Sidebar;
