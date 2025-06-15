"use client"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Palette, Database, Sparkles, Zap } from "lucide-react"

// Template categories and their agents based on populate_agent_templates.py
const templateCategories = [
  {
    category: "Visualization",
    icon: Palette,
    color: "from-purple-500 to-purple-600",
    description: "Professional data visualization and statistical plotting",
    templates: [
      {
        name: "Matplotlib Visualization Agent",
        description: "Publication-quality static plots with matplotlib and seaborn",
        capabilities: [
          "High-quality static visualizations",
          "Professional styling and themes",
          "Statistical plot annotations",
          "Publication-ready outputs"
        ]
      },
      {
        name: "Seaborn Statistical Plots Agent", 
        description: "Statistical visualizations and exploratory data analysis",
        capabilities: [
          "Distribution analysis plots",
          "Correlation and relationship visualization",
          "Categorical data plotting",
          "Statistical significance testing"
        ]
      }
    ]
  },
  {
    category: "Data Manipulation",
    icon: Database,
    color: "from-blue-500 to-blue-600", 
    description: "High-performance data processing and feature engineering",
    templates: [
      {
        name: "Polars Data Processing Agent",
        description: "Lightning-fast data manipulation with memory efficiency",
        capabilities: [
          "High-performance data processing",
          "Lazy evaluation optimization",
          "Complex data transformations",
          "Memory-efficient operations"
        ]
      },
      {
        name: "Data Cleaning Specialist Agent",
        description: "Comprehensive data quality assessment and cleaning",
        capabilities: [
          "Missing value detection & handling",
          "Data quality assessment reports", 
          "Outlier detection & treatment",
          "Inconsistency resolution"
        ]
      },
      {
        name: "Feature Engineering Agent",
        description: "Advanced feature creation for machine learning",
        capabilities: [
          "Intelligent feature creation",
          "Categorical encoding strategies",
          "Feature selection methods",
          "Cross-validation techniques"
        ]
      }
    ]
  }
]

export default function AgentsSection() {
  const totalTemplates = templateCategories.reduce((sum, cat) => sum + cat.templates.length, 0)

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
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-[#FF7F7F]" />
            <Badge variant="outline" className="text-sm px-3 py-1">
              Template Library
            </Badge>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
            Specialized AI Agent Templates
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-2">
            Choose from our growing library of specialized agent templates, each expertly crafted for specific data science tasks. More templates are continuously being added to expand your analytical capabilities.
          </p>
          <div className="flex items-center justify-center gap-4 mt-6 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-[#FF7F7F]" />
              <span>{totalTemplates}+ Expert Templates</span>
            </div>
            <div className="flex items-center gap-1">
              <Database className="w-4 h-4 text-[#FF7F7F]" />
              <span>{templateCategories.length} Categories</span>
            </div>
          </div>
        </motion.div>

        <div className="space-y-8 sm:space-y-12 max-w-7xl mx-auto">
          {templateCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: categoryIndex * 0.2 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              {/* Category Header */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${category.color} text-white`}>
                    <category.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{category.category}</h3>
                </div>
                <p className="text-gray-600 max-w-2xl mx-auto">{category.description}</p>
              </div>

              {/* Templates Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {category.templates.map((template, templateIndex) => (
                  <motion.div
                    key={template.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: templateIndex * 0.1 }}
                    viewport={{ once: true }}
                    className="group relative overflow-hidden rounded-xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
                  >
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    
                    <div className="relative p-6">
                      {/* Template Header */}
                      <div className="mb-4">
                        <h4 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                          {template.name}
                        </h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>

                      {/* Capabilities */}
                      <div className="space-y-2">
                        <h5 className="text-sm font-semibold text-gray-800 mb-3">Key Features:</h5>
                        {template.capabilities.map((capability, capIndex) => (
                          <motion.div
                            key={capIndex}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: (templateIndex * 0.1) + (capIndex * 0.05) }}
                            viewport={{ once: true }}
                            className="flex items-start gap-2"
                          >
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700 leading-relaxed">{capability}</span>
                          </motion.div>
                        ))}
                      </div>

                      {/* Premium Badge */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <Badge variant="outline" className="text-xs bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                          Premium Template
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-12 sm:mt-16"
        >
          <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg max-w-3xl mx-auto border border-gray-100">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#FF7F7F]" />
              <Badge variant="outline" className="text-xs">
                Growing Library
              </Badge>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
              More Templates Coming Soon
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Our expert team continuously develops new specialized agent templates for advanced analytics, 
              machine learning, statistical modeling, and domain-specific use cases. Each template is crafted 
              with best practices and proven methodologies.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary" className="text-xs">Machine Learning</Badge>
              <Badge variant="secondary" className="text-xs">Time Series</Badge>
              <Badge variant="secondary" className="text-xs">NLP Analysis</Badge>
              <Badge variant="secondary" className="text-xs">Statistical Modeling</Badge>
              <Badge variant="secondary" className="text-xs">Business Intelligence</Badge>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
} 