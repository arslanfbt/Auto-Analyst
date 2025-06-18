"use client"
import { motion } from "framer-motion"
import { templateCategories } from "./FnT"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Plus } from "lucide-react"

export default function AgentsSection() {
  return (
    <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
            Three Categories of AI Agents
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-2">
            Auto-Analyst organizes specialized AI agents into three powerful categories, each designed to handle specific aspects of your data science workflow with precision and expertise.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto">
          {templateCategories.map((category, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${category.bgGradient} opacity-0 group-hover:opacity-30 transition-opacity duration-300`} />
              
              <div className="relative p-5 sm:p-6 md:p-8">
                {/* Category Header */}
                <div className="flex flex-col items-center text-center mb-4 sm:mb-6">
                  <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${category.color} text-white mb-4 shadow-lg`}>
                    <category.icon className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{category.name}</h3>
                    <p className="text-sm sm:text-base text-gray-600">{category.description}</p>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="space-y-2 sm:space-y-3 mb-6">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 text-center">Key Capabilities:</h4>
                  {category.capabilities.map((capability, capIndex) => (
                    <motion.div
                      key={capIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: (index * 0.1) + (capIndex * 0.05) }}
                      viewport={{ once: true }}
                      className="flex items-start gap-2 sm:gap-3"
                    >
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm sm:text-base text-gray-700">{capability}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Examples */}
                <div className="pt-4 sm:pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Plus className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Example Agents:</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 italic">
                    {category.examples}
                  </p>
                </div>
              </div>
              
              {/* Hover Effect Border */}
              <div className={`absolute inset-0 border-2 border-transparent group-hover:border-red-200 rounded-xl sm:rounded-2xl transition-colors duration-300`} />
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-10 sm:mt-16"
        >
          <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-lg max-w-3xl mx-auto border border-gray-100">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
              Intelligent Agent Orchestration
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Our intelligent planner automatically selects and coordinates the right agents from these categories for your specific query. 
              You can also direct questions to specific agents using @mentions for precise control over your analysis workflow.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {templateCategories.map((category, index) => (
                <Badge key={index} variant="secondary" className={`text-xs px-3 py-1 bg-gradient-to-r ${category.color} text-white border-0`}>
                  {category.name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              We are continuously adding new templates for you.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
} 