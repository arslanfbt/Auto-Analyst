import type React from "react"
import { motion } from "framer-motion"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <motion.div
      initial={{ x: "-100%" }}
      animate={{ x: isOpen ? 0 : "-100%" }}
      transition={{ duration: 0.3 }}
      className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50"
    >
      <div className="p-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 focus:outline-none"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold mb-4">Options</h2>
        <ul className="space-y-2">
          <li>
            <button className="w-full text-left py-2 px-4 rounded hover:bg-gray-100 transition duration-200">
              Upload Dataset
            </button>
          </li>
          <li>
            <button className="w-full text-left py-2 px-4 rounded hover:bg-gray-100 transition duration-200">
              Preprocessing
            </button>
          </li>
          <li>
            <button className="w-full text-left py-2 px-4 rounded hover:bg-gray-100 transition duration-200">
              Statistical Analysis
            </button>
          </li>
          <li>
            <button className="w-full text-left py-2 px-4 rounded hover:bg-gray-100 transition duration-200">
              Machine Learning
            </button>
          </li>
          <li>
            <button className="w-full text-left py-2 px-4 rounded hover:bg-gray-100 transition duration-200">
              View Visualizations
            </button>
          </li>
        </ul>
      </div>
    </motion.div>
  )
}

export default Sidebar

