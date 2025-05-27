"use client"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Users, Heart, BookOpen, ExternalLink } from "lucide-react"

const missionPrinciples = [
  {
    icon: Users,
    title: "Usability",
    description: "We prioritize user experience through constant experimentation and feedback. The optimal UX for AI-powered data analytics is still being discovered, and we're committed to finding it.",
    color: "from-blue-500 to-blue-600"
  },
  {
    icon: Heart,
    title: "Community-driven",
    description: "Input from data analysts and scientists worldwide guides our development. We believe the best products come from listening to those who use them daily.",
    color: "from-green-500 to-green-600"
  },
  {
    icon: BookOpen,
    title: "Openness",
    description: "Beyond open-source code, we share our learnings, research, and development insights openly through blogs and technical communications.",
    color: "from-purple-500 to-purple-600"
  }
]

export default function MissionSection() {
  return (
    <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 px-2">
            Our Mission & Principles
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto px-2">
            Auto-Analyst is built on three core principles that guide every decision we make. 
            These aren't just values—they're our roadmap to democratizing data science.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto mb-10 sm:mb-16">
          {missionPrinciples.map((principle, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-sm p-5 sm:p-8 hover:bg-white/15 transition-all duration-300"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${principle.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              
              <div className="relative">
                <div className={`inline-flex p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br ${principle.color} mb-4 sm:mb-6`}>
                  <principle.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                
                <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{principle.title}</h3>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{principle.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-5 sm:p-8 max-w-2xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
              Stay Updated with Our Journey
            </h3>
            <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6">
              Follow our development progress, technical insights, and community updates. 
              Learn about the latest advancements in AI-powered data analytics.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => window.open('https://www.firebird-technologies.com', '_blank')}
                className="bg-white text-gray-900 hover:bg-gray-200 w-full sm:w-auto"
              >
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Read Our Substack
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.open('https://medium.com/firebird-technologies/auto-analyst-3-0-ai-data-scientist-new-web-ui-and-more-reliable-system-c194cced2e93', '_blank')}
                className="border-white text-gray-900 hover:bg-gray-200 w-full sm:w-auto"
              >
                Technical Blog
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
} 