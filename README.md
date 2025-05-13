![Auto Analyst Logo](/auto-analyst-backend/images/auto-analyst%20logo.png)

## 📌 Overview  
Auto-Analyst is an analytics platform featuring a **FastAPI backend** and a **Next.js frontend**. The system provides **AI-driven data analytics**, **interactive visualizations**, and an **admin dashboard** for monitoring key usage metrics. The platform leverages **WebSockets** for real-time updates and integrates enterprise-grade functionalities.  

### **Tech Stack**  
- **Frontend:** Next.js / React  (Learn more about the frontend architecture [here](/docs/frontend.md))
- **Backend:** Python / FastAPI  (Learn more about the api breakdown [here](/docs/backend.md))
- **Database:** SQLite for data storage and Redis Upstash for rate limiting and credits management
- **Infrastructure:** Vercel and Hugging Face Spaces (To be deployed on AWS Amplify via Terraform)  
- **CI/CD:** GitHub Actions  
- **Payment Processing:** Stripe Integration
- **Security:** API Key Management System

---

## 🚀 Development & Contributing

### Quick Start
1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/Auto-Analyst-CS.git
   cd Auto-Analyst-CS
   ```

2. **Setup Backend**
   ```bash
   cd auto-analyst-backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Setup Frontend**
   ```bash
   cd auto-analyst-frontend
   npm install
   ```

4. **Configure Environment**
   Create `.env` files with required variables (see [Environment Variables](#environment-variables) section)

### Development Guidelines
- Follow our [Code Style Guidelines](CONTRIBUTING.md#code-style-guidelines)
- Write tests for new features
- Update documentation
- Follow the [Git Workflow](CONTRIBUTING.md#git-workflow)

### Contributing
We welcome contributions! Please:
1. Read our [Contributing Guidelines](CONTRIBUTING.md)
2. Fork the repository
3. Create a feature branch
4. Submit a Pull Request

For detailed information about:
- Code style and standards
- Testing requirements
- Documentation guidelines
- Security practices
- Pull request process

Please refer to our [Contributing Guide](CONTRIBUTING.md).

---

## ✅ Implemented Features  
The following core functionalities have been developed and integrated into the system:  

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
- **Enterprise Deployment Options** – On-premise deployment contact support  for custom API integrations.
- **Documentation** – Comprehensive documentation for developers and maintainers.
- **Model Credits System** – Redis Upstash-based credits tracking and management.
- **Stripe Integration** – Secure payment processing for credit purchases and subscription management.

### AI & Code Features
- **AI Code Editing** – Intelligent code editing with code highlight.
- **Code Error Fixing** – Automated code error detection and fixing capabilities.
- **Canvas Implementation** – Interactive data visualization canvas for custom analytics.
- **Multi-Model Support** – Integration with multiple AI models (OpenAI, Groq, Anthropic, Gemini).

---

## 🛠️ Issues & Fixes Needed  
The following areas require attention to improve system stability and performance:  

- **Error Handling** – Certain API endpoints require more robust exception handling to improve fault tolerance.  
- **Cost Calculation Precision** – The floating-point precision in cost calculations may need adjustments, particularly for projected estimates.  
- **Query Performance** – Optimize agents to be more efficient and reduce hallucinated results.
  - Ideally we want the agents to run even on low tier models.
- **Redis Connection Stability** – Improve Redis connection handling and implement better fallback mechanisms.
- **API Key Rotation** – Implement automated API key rotation for enhanced security.
- **User Guest Creation in DB** - Excessive amounts of guest users are created in DB (for when user first logs in).
- **Add automated Testing** 
- **Improve CI/CD For automated deployment via terraform**
---

## 🔄 Development Workflow  
### **Current Workflow:**  
- The project is deployed on Hugging Face Spaces and Vercel.
  - Huging Face Spaces URL: https://ashad001-auto-analyst-backend.hf.space
  - Vercel URL: https://auto-analyst-frontend.vercel.app
- The project follows a **main-branch deployment model** with **CI/CD automation**.  
- **Environment variables** control API endpoints and authentication mechanisms.  
- The codebase is structured with a **clear separation between frontend and backend components**.  

### **Recommended Improvements:**  
- **Terraform** should be used for managing infrastructure as code.  
- **GitHub Actions** should be used for automating the deployment pipeline for AWS.  
- Adopt a **feature branching strategy** to improve collaboration and code isolation.  
- Establish formal **code review guidelines** to ensure maintainability.  
- Document the **contribution workflow** to streamline development efforts.  

---

## 🚀 Production Changes  
### **Deployment Process:**  
- Changes to the **main branch** trigger **automatic deployment** via GitHub Actions.  
- **Terraform** should be used for managing infrastructure as code.  
- AWS resources (**Amplify**) are updated accordingly.  

### **Environment Variables:**  
- `ADMIN_API_KEY` – Critical for securing admin access.  
- `NEXT_PUBLIC_API_URL` – Backend API endpoint reference.  
- **AWS credentials** – Required for infrastructure provisioning and deployment.  
- **SMTP credentials** – Required for sending emails.  
- **OpenAI API Key** – Required for the chat interface.  
- **Groq API Key** – Required for the chat interface.  
- **Gemini API Key** - Reqiured for Chat interface.
- **Anthropic API Key** – Required for the chat interface.  
- **Redis URL** – Required for rate limiting and credits management.
- **Stripe Keys** – Required for payment processing.

### **Monitoring Considerations:**  
- Implement **logging** for critical application paths.  
- Track **WebSocket connection stability** to prevent data loss.  
- Validate **cost projections against actual spending trends** to detect anomalies.  
- Monitor **Redis connection health** and implement alerts.
- Track **Stripe webhook success rates** and payment processing metrics.

---

## 🧪 QA & Testing Strategy  
### **Automated Testing:**  
- Develop **unit tests** for core backend functions.  
- Introduce **integration tests** for API endpoints.  
- Implement **frontend component tests** for UI elements.  

### **Manual Testing Checklist:**  
- Verify **dashboard statistics** for accuracy.  
- Test **real-time updates** via WebSockets.  
- Validate **cost analytics calculations**.  
- Confirm **admin authentication** flow security.  
- Test **chat interface** against diverse query scenarios.  
  - Test 1: Test the chat interface with a complex query including 'Chat with all' and 'Chat with Agents'
    - Query 1: "List top 10 Houses by area"
    - Query 2: "@statistical_analyst_agent What is the average price of houses in the dataset?"
  - Test 2: Preview Default Dataset and User Uploaded Dataset
    - Test 2.1: Preview Default Dataset
    - Test 2.2: Preview User Uploaded Dataset
    - Test 2.3: User can edit the name and description of the dataset.
  - Test 3: Test the Chat Interface on User Uploaded Dataset
    - Test 3.1: User can upload a dataset from the file system.
  - Test 4: Test the Chat History
    - Chats should be stored in the database and displayed in the chat interface.
    - New chats should be added to the top of the chat history.
    - The chat history should be paginated.
    - The chat history should be sorted by the date of the chat.
    - Chats should be displayed in the chat interface via chat history.
    - Name of the chat history should be a short description of the first query in the chat.
  - Test 5: Run the Code Snippets
    - Code snippets should be runnable and should return the expected results.
    - AI code editing should work correctly.
    - Code error fixing should handle common errors.
  - Test 6: Test the Admin Dashboard
    - Test 6.1: Test the Admin Dashboard Statistics
    - Test 6.2: Test the Admin Dashboard Cost Analytics
    - Test 6.3: Test the Admin Dashboard User Analytics
    - Test 6.4: Test the Admin Dashboard Model Performance
    - Test 6.5: Test the Admin Dashboard Real-time Updates
  - Test 7: Test Payment Processing
    - Test 7.1: Verify Stripe payment flow
    - Test 7.2: Check credit purchase process
    - Test 7.3: Validate webhook handling
  - Test 8: Test Redis Integration
    - Test 8.1: Verify rate limiting
    - Test 8.2: Check credits management
    - Test 8.3: Validate connection stability

### **Deployment Testing:**  
- Run `verify_session_state.py` to ensure **session management consistency**.  
- Verify **WebSocket connections remain stable** during high traffic.  
- Check the **admin dashboard** for expected functionality using test data.  
- Validate **cost projections against real-time values**.  
- Test **Redis connection** under load.
- Verify **Stripe webhook** handling.

---

## 📄 Additional Notes  
- The project is structured with a clear separation of concerns across services.  
- **Chat Interface** is a core feature requiring thorough manual testing.  
- **Real-time analytics** is a core feature requiring rigorous testing and monitoring.  
- **Admin API key security** is crucial to prevent unauthorized access in production.  
- **Cost calculation accuracy** should be regularly validated against actual expenditures.  
- **Session management stability** requires further validation to ensure data consistency.  
- **User Accounts Page** needs some work to be done such as change email, update plans, etc.
- **Redis integration** requires monitoring for connection stability.
- **Stripe integration** needs regular testing of webhook handling.

### **Next Steps:**  
- Improve **documentation** to support development and maintainability.  
- Deploy the **Database** to be on cloud and persist the data.
- Implement **automated API key rotation**.
- Enhance **Redis connection resilience**.
- Improve **Stripe webhook reliability**. 

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
- Open an [issue](https://github.com/ArslanS1997/Auto-Analyst-CS/issues) for bugs
- Use [discussions](https://github.com/ArslanS1997/Auto-Analyst-CS/discussions) for questions
- Contact maintainers for enterprise support 