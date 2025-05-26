"use client"
import { motion } from "framer-motion"
import { ShieldCheck, Users, Zap, Server, GitBranch } from "lucide-react"

const reasons = [
  {
    icon: Zap,
    title: "Purpose-Built for Analytics",
    desc: "Not just chat—AutoAnalyst is designed for real data science workflows."
  },
  {
    icon: Users,
    title: "Multi-Agent Intelligence",
    desc: "Specialized agents for cleaning, stats, ML, and visualization."
  },
  {
    icon: ShieldCheck,
    title: "No Vendor Lock-In",
    desc: "Bring your own API key. Use any LLM. Host anywhere."
  },
  {
    icon: GitBranch,
    title: "Open-Source & Self-Hostable",
    desc: "MIT licensed. Run on your own infra, customize, and extend."
  }
]

export default function WhyAutoAnalystSection() {
  return (
    <section className="py-12 sm:py-16 bg-gradient-to-br from-[#fff6f6] to-white">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Why use AutoAnalyst?</h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {reasons.map((reason, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="flex flex-col items-center bg-white rounded-xl shadow p-6 hover:shadow-lg transition-all duration-300"
            >
              <reason.icon className="w-8 h-8 text-[#FF7F7F] mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{reason.title}</h3>
              <p className="text-sm text-gray-600">{reason.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
} 