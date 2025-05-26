"use client"
import { motion } from "framer-motion"
import { agents } from "./FnT"
import { Badge } from "@/components/ui/badge"
import { CheckCircle } from "lucide-react"

export default function AgentsSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Four Specialized AI Agents
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Unlike ChatGPT's general-purpose approach, Auto-Analyst uses four specialized agents that work together to handle complex data science workflows with precision and reliability.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {agents.map((agent, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              <div className="relative p-8">
                {/* Agent Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${agent.color} text-white`}>
                    <agent.icon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{agent.name}</h3>
                    <p className="text-gray-600">{agent.description}</p>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Key Capabilities:</h4>
                  {agent.capabilities.map((capability, capIndex) => (
                    <motion.div
                      key={capIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: (index * 0.1) + (capIndex * 0.05) }}
                      viewport={{ once: true }}
                      className="flex items-center gap-3"
                    >
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{capability}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Agent Usage Indicator */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <Badge variant="outline" className="text-xs">
                    @{agent.name.toLowerCase().replace(/\s+/g, '_')}
                  </Badge>
                  <p className="text-sm text-gray-500 mt-2">
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
          className="text-center mt-16"
        >
          <div className="bg-white rounded-2xl p-8 shadow-lg max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Intelligent Agent Orchestration
            </h3>
            <p className="text-gray-600 mb-6">
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