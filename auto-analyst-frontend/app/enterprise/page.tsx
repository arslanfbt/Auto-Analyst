"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { 
  Database, 
  Bot, 
  Network, 
  Server, 
  MessageSquare, 
  ArrowRight,
  Facebook,
  Linkedin,
  LineChart,
  Chrome
} from "lucide-react"

const features = [
  {
    icon: Network,
    title: "Custom API Integration",
    description: "Seamlessly connect with your marketing platforms",
    examples: [
      { icon: Facebook, name: "Meta Ads" },
      { icon: Linkedin, name: "LinkedIn Analytics" },
      { icon: Chrome, name: "Google Ads" }
    ]
  },
  {
    icon: Database,
    title: "SQL Database Integration",
    description: "On-premise deployment with direct database connections",
    subFeatures: ["Secure data handling", "Real-time sync", "Custom schema support"]
  },
  {
    icon: Bot,
    title: "Custom Analysis Agents",
    description: "Tailored AI agents that match your analysis workflow",
    subFeatures: ["Industry-specific analysis", "Custom metrics", "Automated reporting"]
  },
  {
    icon: MessageSquare,
    title: "LLM API Support",
    description: "Integration with all major language models",
    subFeatures: ["OpenAI", "Anthropic", "Custom deployment"]
  }
]

export default function EnterprisePage() {
  const router = useRouter()

  const handleContact = () => {
    router.push('/contact')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Hero Section */}
      <section className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Enterprise-Grade Analytics Solution
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Customize Auto-Analyst to your organization's specific needs with our enterprise solutions
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleContact}
              className="bg-[#FF7F7F] text-white px-8 py-4 rounded-full font-semibold inline-flex items-center gap-2 hover:bg-[#FF6666] transition-colors"
            >
              Schedule a Demo <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-8 rounded-2xl bg-gray-50 hover:shadow-xl transition-all duration-300"
              >
                <feature.icon className="w-12 h-12 text-[#FF7F7F] mb-4" />
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 mb-6">{feature.description}</p>
                
                {feature.examples && (
                  <div className="flex gap-4 mt-4">
                    {feature.examples.map((example, i) => (
                      <div key={i} className="flex items-center gap-2 text-gray-700">
                        <example.icon className="w-5 h-5" />
                        <span>{example.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {feature.subFeatures && (
                  <ul className="space-y-2 mt-4">
                    {feature.subFeatures.map((subFeature, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF7F7F]" />
                        {subFeature}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Ready to Transform Your Data Analytics?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Let's discuss how Auto-Analyst can be customized for your organization's needs
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleContact}
              className="bg-[#FF7F7F] text-white px-8 py-4 rounded-full font-semibold inline-flex items-center gap-2 hover:bg-[#FF6666] transition-colors"
            >
              Contact Sales Team <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </section>
    </div>
  )
} 