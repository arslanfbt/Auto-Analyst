"use client"
import { motion } from "framer-motion"
import { agents } from "./FnT"
import { Badge } from "@/components/ui/badge"
import { CheckCircle } from "lucide-react"

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
            Four Specialized AI Agents
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-2">
            Unlike ChatGPT's general-purpose approach, Auto-Analyst uses four specialized agents that work together to handle complex data science workflows with precision and reliability.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {agents.map((agent, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              <div className="relative p-5 sm:p-6 md:p-8">
                {/* Agent Header */}
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 flex-wrap sm:flex-nowrap">
                  <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br ${agent.color} text-white`}>
                    <agent.icon className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{agent.name}</h3>
                    <p className="text-sm sm:text-base text-gray-600">{agent.description}</p>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="space-y-2 sm:space-y-3">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Key Capabilities:</h4>
                  {agent.capabilities.map((capability, capIndex) => (
                    <motion.div
                      key={capIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: (index * 0.1) + (capIndex * 0.05) }}
                      viewport={{ once: true }}
                      className="flex items-center gap-2 sm:gap-3"
                    >
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm sm:text-base text-gray-700">{capability}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Agent Usage Indicator */}
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
                  <Badge variant="outline" className="text-xs">
                    @{agent.name.toLowerCase().replace(/\s+/g, '_')}
                  </Badge>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">
                    Direct your queries to this agent using @mentions
                  </p>
                </div>
              </div>
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
          <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-lg max-w-2xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
              Intelligent Agent Orchestration
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Our planner automatically selects and coordinates the right agents for your specific query, 
              or you can direct questions to specific agents using @mentions for precise control.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {agents.map((agent, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  @{agent.name.toLowerCase().replace(/\s+/g, '_')}
                </Badge>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
} 