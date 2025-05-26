"use client"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

export default function ConnectorsSection() {
  return (
    <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-[#fff6f6] to-white">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
            Custom AI Agents for Your Data
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-2">
            Need specialized AI agents optimized for your unique data and workflows? 
            We'll build custom solutions tailored to your specific needs.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-gradient-to-r from-[#FF7F7F] to-[#FF6666] rounded-2xl p-8 sm:p-12 text-white">
            <div className="flex flex-col items-center text-center">
              <div className="bg-white/10 rounded-full p-3 mb-6">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                Custom Agent Development
              </h3>
              <p className="text-lg sm:text-xl mb-8 opacity-90 max-w-2xl">
                From data preprocessing to advanced analytics, we create specialized AI agents 
                that understand your domain and deliver precise insights.
              </p>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => window.open('https://www.autoanalyst.ai/contact', '_blank')}
                className="bg-white text-[#FF7F7F] hover:bg-gray-100 px-8 py-6 text-lg font-semibold rounded-full shadow-lg"
              >
                Contact Us for Custom Solutions
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
} 