"use client"
import { Brain, LineChart, Database, BarChart2, Lock, Zap, FileText, TrendingUp, Cog, BarChart3, Github, Server, Cpu, Globe, Wrench, Target, ScatterChart, Table2 } from "lucide-react"

export const features = [
  { 
    icon: FileText, 
    title: "Multi-Agent Orchestration", 
    description: "Unlike ChatGPT's single model, Auto-Analyst uses specialized agents that work together for complex data science workflows" 
  },
  { 
    icon: Github, 
    title: "Open Source & Transparent", 
    description: "Fully open-source with MIT license. View, modify, and contribute to the codebase on GitHub" 
  },
  { 
    icon: Cpu, 
    title: "LLM Agnostic", 
    description: "Works with any LLM provider - OpenAI, Anthropic, Google, Groq, DeepSeek. Use your own API keys" 
  },
  { 
    icon: Server, 
    title: "On-Premise Deployment", 
    description: "Host on your own infrastructure for complete data privacy and security control" 
  },
  { 
    icon: Database, 
    title: "CSV/Excel + API Connectors", 
    description: "Upload CSV/Excel files or connect to marketing APIs, CRMs, and databases for comprehensive analysis" 
  },
  { 
    icon: Cog, 
    title: "Specialized for Analytics", 
    description: "Purpose-built for data science workflows with guardrails and reliability features ChatGPT lacks" 
  },
]

export const templateCategories = [
  {
    icon: Table2,
    name: "Data Manipulation",
    description: "Transform, clean, and prepare your data for analysis",
    capabilities: [
      "Clean and preprocess datasets with advanced techniques",
      "Handle missing values and data quality issues", 
      "Transform and reshape data structures",
    ],
    color: "from-red-300 to-red-400",
    bgGradient: "from-red-50 to-red-100",
    examples: "Pandas preprocessing, Polars optimization, data cleaning specialists"
  },
  {
    icon: Target,
    name: "Data Modelling", 
    description: "Build statistical models and machine learning algorithms",
    capabilities: [
      "Statistical analysis and hypothesis testing",
      "Predictive analytics and forecasting",
      "Sophisticated ML techniques for advanced modelling",
    ],
    color: "from-red-400 to-red-500",
    bgGradient: "from-red-100 to-red-200",
    examples: "Statistical analysis, ML algorithms, predictive modeling"
  },
  {
    icon: ScatterChart,
    name: "Data Visualization",
    description: "Create compelling charts and interactive visualizations",
    capabilities: [
      "Interactive and static chart creation",
      "Multi-dimensional data visualization",
      "Publication-ready visual outputs"
    ],
    color: "from-red-500 to-red-600",
    bgGradient: "from-red-200 to-red-300",
    examples: "Plotly interactives, Matplotlib static plots, Seaborn statistical charts"
  }
]

// Legacy agents array for backward compatibility
export const agents = [
  {
    icon: Database,
    name: "Preprocessing Agent",
    description: "Data cleaning specialist using pandas and numpy",
    capabilities: [
      "Clean and transform datasets",
      "Handle missing values intelligently", 
      "Convert data types automatically",
      "Create aggregates and summaries",
      "Detect and fix data quality issues"
    ],
    color: "from-blue-500 to-blue-600"
  },
  {
    icon: TrendingUp,
    name: "Statistical Analytics Agent", 
    description: "Advanced statistical analysis using statsmodels",
    capabilities: [
      "Correlation and regression analysis",
      "Hypothesis testing and A/B tests",
      "Time series analysis",
    ],
    color: "from-green-500 to-green-600"
  },
  {
    icon: Brain,
    name: "Scikit-Learn Agent",
    description: "Machine learning specialist for predictive modeling",
    capabilities: [
      "K-means clustering analysis", 
      "Classification and regression",
      "Feature selection and engineering",
    ],
    color: "from-purple-500 to-purple-600"
  },
  {
    icon: BarChart3,
    name: "Data Visualization Agent",
    description: "Interactive visualizations using Plotly",
    capabilities: [
      "Interactive charts and graphs",
      "Multi-dimensional visualizations",
      "Custom styling and formatting",
      "Export-ready visualizations"
    ],
    color: "from-orange-500 to-orange-600"
  }
]

export const majorLibraries = [
  { name: "Pandas", category: "Data Manipulation", icon: "/icons/templates/preprocessing_agent.svg", description: "Data cleaning & preprocessing" },
  { name: "NumPy", category: "Data Manipulation", icon: "/icons/templates/numpy.svg", description: "Numerical computing foundation" },
  { name: "Polars", category: "Data Manipulation", icon: "/icons/templates/polars.svg", description: "High-performance data processing" },
  { name: "Scikit-Learn", category: "Data Modelling", icon: "/icons/templates/sk_learn_agent.svg", description: "Machine learning algorithms" },
  { name: "XGBoost", category: "Data Modelling", icon: "/icons/templates/xgboost.svg", description: "Gradient boosting framework" },
  { name: "Statistical Models", category: "Data Modelling", icon: "/icons/templates/statsmodels.svg", description: "Statistical analysis tools" },
  { name: "Plotly", category: "Data Visualization", icon: "/icons/templates/data_viz_agent.svg", description: "Interactive visualizations" },
  { name: "Matplotlib", category: "Data Visualization", icon: "/icons/templates/matplotlib.svg", description: "Static publication plots" },
  { name: "Seaborn", category: "Data Visualization", icon: "/icons/templates/seaborn.svg", description: "Statistical visualizations" }
]

export const supportedConnectors = [
  {
    category: "File Formats",
    items: ["CSV", "Excel"]
  },
  {
    category: "Ad Platforms",
    items: ["LinkedIn Ads", "Google AdSense", "Meta Ads", "Sales Navigator API"]
  },
  {
    category: "CRM Systems", 
    items: ["HubSpot", "Salesforce"]
  },
  {
    category: "Databases",
    items: ["PostgreSQL", "MySQL", "Oracle", "DuckDB"]
  }
]

export const testimonials = [
  { quote: "Auto-Analyst transformed how we handle our data analysis. It's revolutionary.", author: "Sarah J.", role: "Data Scientist" },
  { quote: "The insights we get from Auto-Analyst have been game-changing for our business.", author: "Michael R.", role: "CEO" },
  { quote: "Incredibly powerful yet easy to use. Exactly what we needed.", author: "David L.", role: "Analytics Manager" },
]