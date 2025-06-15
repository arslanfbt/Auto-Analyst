"use client"
import { Brain, LineChart, Database, BarChart2, Lock, Zap, FileText, TrendingUp, Cog, BarChart3, Github, Server, Cpu, Globe, Sparkles, Palette } from "lucide-react"

export const features = [
  { 
    icon: Sparkles, 
    title: "Specialized Agent Templates", 
    description: "Choose from expert-crafted templates for visualization, data processing, feature engineering, and more specialized tasks" 
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
    title: "Expert-Level Analytics", 
    description: "Access professional-grade data science capabilities through carefully designed template workflows" 
  },
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