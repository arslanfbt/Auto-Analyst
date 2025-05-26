"use client"
import { motion } from "framer-motion"
import { features } from "./FnT";

export default function FeaturesSection() {
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
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">Powerful Features</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 px-2">Everything you need to analyze and understand your data</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all duration-300"
            >
              <feature.icon className="w-10 h-10 sm:w-12 sm:h-12 text-[#FF7F7F] mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">{feature.title}</h3>
              <p className="text-sm sm:text-base text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
