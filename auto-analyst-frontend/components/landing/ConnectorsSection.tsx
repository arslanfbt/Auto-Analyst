"use client"
import { motion } from "framer-motion"
import { supportedConnectors } from "./FnT"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Database, FileSpreadsheet, Globe, Mail } from "lucide-react"

const categoryIcons = {
  "Ad Platforms": Globe,
  "CRM Systems": Mail,
  "Databases": Database,
  "File Formats": FileSpreadsheet,
}

export default function ConnectorsSection() {
  return (
    <section className="py-16 sm:py-20 md:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
            Connect Your Data Sources
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-2">
            Start with CSV/Excel uploads or connect to marketing APIs, CRMs, and databases. 
            Custom connectors available for enterprise clients.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
          {supportedConnectors.map((connector, index) => {
            const IconComponent = categoryIcons[connector.category as keyof typeof categoryIcons]
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:bg-white hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-[#FF7F7F] text-white">
                    <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    {connector.category}
                  </h3>
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {connector.items.map((item, itemIndex) => (
                    <Badge key={itemIndex} variant="outline" className="text-xs sm:text-sm mb-1.5 mr-1.5">
                      {item}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-10 sm:mt-16"
        >
          <div className="bg-gradient-to-r from-[#FF7F7F] to-[#FF6666] rounded-xl sm:rounded-2xl p-5 sm:p-8 text-white max-w-4xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
              Need a Custom Connector?
            </h3>
            <p className="text-base sm:text-lg mb-4 sm:mb-6 opacity-90">
              We can build custom connectors to your proprietary data sources. 
              Perfect for enterprise deployments and specialized workflows.
            </p>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => window.open('https://www.autoanalyst.ai/contact', '_blank')}
              className="bg-white text-[#FF7F7F] hover:bg-gray-100 w-full sm:w-auto"
            >
              Contact Us for Custom Solutions
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
} 