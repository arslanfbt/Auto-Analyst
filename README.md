![Auto Analyst Logo](/auto-analyst-backend/images/auto-analyst%20logo.png)

# Auto-Analyst
An AI-powered data analytics platform with interactive visualizations and real-time insights.

![Auto-Analyst Platform](/auto-analyst-backend/images/Auto-analyst-poster.png)

## 📌 Overview  
Auto-Analyst is an analytics platform featuring a **FastAPI backend** and a **Next.js frontend**. The system provides **AI-driven data analytics**, **interactive visualizations**, and an **admin dashboard** for monitoring key usage metrics. The platform leverages **WebSockets** for real-time updates and integrates enterprise-grade functionalities.

![Chat Interface](/auto-analyst-backend/images/AI%20snapshot-chat.png)  


### **Tech Stack**  
- **Frontend:** Next.js / React  (Learn more about the frontend architecture [here](/docs/frontend.md))
- **Backend:** Python / FastAPI  (Learn more about the api breakdown [here](/docs/backend.md))
- **Database:** SQLite for data storage and Redis Upstash for rate limiting and credits management
- **CI/CD:** GitHub Actions  
- **Payment Processing:** Stripe Integration
- **Security:** API Key Management System

---

## 🚀 Development & Contributing
For detailed setup instructions, development guidelines, and information about contributing to this project, please refer to our [Contributing Guide](CONTRIBUTING.md).

---

## ✅ Implemented Features  

### Core Features
- **Chat Interface** – Interactive AI-powered chat system with multi-agent support.  
- **Chat History** – Chat history is stored in the database and displayed in the chat interface.
- **Session Management** – Persistent user sessions with state tracking.  
- **Code Execution** – Python code execution with AI-powered editing and fixing capabilities.
- **Google OAuth** – Google OAuth is supported for authentication.

### Analytics & Monitoring
- **Analytics Dashboard** – A comprehensive admin panel displaying usage statistics, model performance metrics, and cost analysis.  
- **Cost Analytics** – Tracks detailed cost breakdowns, daily spending trends, and cost projections.  
- **User Analytics** – Monitors user activity, session statistics, and new user acquisition rates.  
- **Model Performance Tracking** – Evaluates model usage, response times, and token consumption patterns.  

### Security & Authentication
- **Admin Authentication** – Secure, API key-based authentication for administrative access.  
- **API Key Management** – Reading API KEYS via code canvas is blocked.

### Real-time Features
- **Real-time Updates** – WebSocket-based real-time updates for dashboard and analytics views.  
- **Real-time Analytics Enhancements** – WebSocket handling with improved robustness and error recovery.

### Enterprise Features
- **Enterprise Deployment Options** – On-premise deployment contact support for custom API integrations.
- **Documentation** – Comprehensive documentation for developers and maintainers.
- **Model Credits System** – Redis Upstash-based credits tracking and management.
- **Stripe Integration** – Secure payment processing for credit purchases and subscription management.

### AI & Code Features
- **AI Code Editing** – Intelligent code editing with code highlight.
- **Code Error Fixing** – Automated code error detection and fixing capabilities.
- **Canvas Implementation** – Interactive data visualization canvas for custom analytics.
- **Multi-Model Support** – Integration with multiple AI models (OpenAI, Groq, Anthropic, Gemini).

---

## 🛠️ Roadmap  
The following areas are part of our development roadmap to improve system stability, performance and feature set:

### Short-term Goals
- **Error Handling** – Implement more robust exception handling for API endpoints.
- **Cost Calculation Precision** – Improve floating-point precision in cost calculations.
- **Redis Connection Stability** – Enhance connection handling with better fallback mechanisms.
- **User Accounts Page** – Implement email change functionality, plan updates, and other account management features.

### Mid-term Goals  
- **Query Performance** – Optimize agents to be more efficient and reduce hallucinated results on low tier models.
- **API Key Rotation** – Implement automated API key rotation for enhanced security.
- **User Guest Creation in DB** - Fix excessive creation of guest users when users first log in.

### Long-term Goals
Our long-term vision is explained in three principles we would like to follow while developing the latest versions of the product. It is hard to define them in specifics.

- **Usability**: We want the product to be as usable as possible, which can only be achieved through constant experimentation. The optimal UX for such a project is yet to be discovered.
- **Community-driven**: We want input from data analysts and scientists from around the world to guide us in our future development efforts. Please stay in touch on our socials (LinkedIn, Medium, Substack).
- **Openness**: We would like to not only open-source the source code but also, through blogs and other forms of communication, share with the world all advancements in the product openly.

---

## ⚙️ Configuration

### **Environment Variables:**  
- `ADMIN_API_KEY` – Critical for securing admin access.  
- `NEXT_PUBLIC_API_URL` – Backend API endpoint reference.  
- **AWS credentials** – Required for infrastructure provisioning and deployment.  
- **SMTP credentials** – Required for sending emails.  
- **OpenAI API Key** – Required for the chat interface.  
- **Groq API Key** – Required for the chat interface.  
- **Gemini API Key** - Required for Chat interface.
- **Anthropic API Key** – Required for the chat interface.  
- **Redis URL** – Required for rate limiting and credits management.
- **Stripe Keys** – Required for payment processing.

---

## 🔗 Useful Links
- [Contributing Guide](CONTRIBUTING.md)
- [Frontend Documentation](/docs/frontend.md)
- [Backend Documentation](/docs/backend.md)
- [API Documentation](/docs/api)
- [Database Schema](/docs/db_schema.md)
- [Redis Setup](/docs/redis-setup)

---

## 📞 Support
- Open an [issue](https://github.com/FireBird-Technologies/Auto-Analyst/issues) for bugs
- Use [discussions](https://github.com/FireBird-Technologies/Auto-Analyst/discussions) for questions
- Contact maintainers for enterprise support 