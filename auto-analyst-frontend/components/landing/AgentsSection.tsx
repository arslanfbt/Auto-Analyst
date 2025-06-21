"use client"
import { motion } from "framer-motion"
import { templateCategories } from "./FnT"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Plus } from "lucide-react"
import Image from "next/image"

export default function AgentsSection() {
  // Library showcase for each category
  const libraryShowcase = {
    "Data Manipulation": [
      { name: "Pandas", icon: "/icons/templates/preprocessing_agent.svg" },
      { name: "NumPy", icon: "/icons/templates/numpy.svg" },
      { name: "Polars", icon: "/icons/templates/polars.svg" }
    ],
    "Data Modelling": [
      { name: "Scikit-Learn", icon: "/icons/templates/sk_learn_agent.svg" },
      { name: "XGBoost", icon: "/icons/templates/xgboost.png" },
      { name: "Statistical Models", icon: "/icons/templates/statsmodel.svg" }
    ],
    "Data Visualization": [
      { name: "Plotly", icon: "/icons/templates/plotly.svg" },
      { name: "Matplotlib", icon: "/icons/templates/matplotlib.svg" },
      { name: "Seaborn", icon: "/icons/templates/seaborn.svg" }
    ]
  }

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
            Powered by Industry-Leading Libraries
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-2">
            Auto-Analyst harnesses the power of the most trusted data science libraries, organized into three specialized categories for maximum efficiency.
          </p>
        </motion.div>

        {/* Library Icons Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-12 border border-gray-100"
        >
          <h3 className="text-xl font-bold text-center text-gray-900 mb-6">Major Libraries Integrated</h3>
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12">
            {Object.values(libraryShowcase).flat().map((library, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 relative group-hover:scale-110 transition-transform duration-200">
                  <Image
                    src={library.icon}
                    alt={library.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-600">{library.name}</span>
              </motion.div>
            ))}
          </div>
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
                <div className="flex flex-col items-center text-center mb-6">
                  <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${category.color} text-white mb-4 shadow-lg`}>
                    <category.icon className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{category.name}</h3>
                    <p className="text-sm sm:text-base text-gray-600">{category.description}</p>
                  </div>
                </div>

                {/* Featured Libraries for this Category */}
                <div className="mb-6">
                  <h4 className="text-base font-semibold text-gray-800 mb-4 text-center">Featured Libraries:</h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {libraryShowcase[category.name as keyof typeof libraryShowcase]?.map((library, libIndex) => (
                      <motion.div
                        key={libIndex}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: (index * 0.1) + (libIndex * 0.1) }}
                        viewport={{ once: true }}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <div className="w-8 h-8 sm:w-10 sm:h-10 relative">
                          <Image
                            src={library.icon}
                            alt={library.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 text-center">{library.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Capabilities */}
                <div className="space-y-2 sm:space-y-3">
                  <h4 className="text-base font-semibold text-gray-800 mb-3 text-center">What You Can Do:</h4>
                  {category.capabilities.slice(0, 3).map((capability, capIndex) => (
                    <motion.div
                      key={capIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: (index * 0.1) + (capIndex * 0.05) }}
                      viewport={{ once: true }}
                      className="flex items-start gap-2 sm:gap-3"
                    >
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{capability}</span>
                    </motion.div>
                  ))}
                  {category.capabilities.length > 3 && (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      + {category.capabilities.length - 3} more capabilities
                  </p>
                  )}
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
              Smart Agent Selection
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Our AI planner automatically chooses the best libraries and agents for your task. 
              Use @mentions to call specific agents directly.
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