![Auto Analyst Logo](/auto-analyst-backend/images/auto-analyst%20logo.png)

## 📌 Overview  
Auto-Analyst is an analytics platform featuring a **FastAPI backend** and a **Next.js frontend**. The system provides **AI-driven data analytics**, **interactive visualizations**, and an **admin dashboard** for monitoring key usage metrics. The platform leverages **WebSockets** for real-time updates and integrates enterprise-grade functionalities.  

### **Tech Stack**  
- **Frontend:** Next.js / React  (Learn more about the frontend architecture [here](/docs/frontend.md))
- **Backend:** Python / FastAPI  (Learn more about the api breakdown [here](/docs/backend.md))
- **Infrastructure:** Vercel and Hugging Face Spaces (To be deployed on AWS Amplify via Terraform)  
- **CI/CD:** GitHub Actions  

---

## ✅ Implemented Features  
The following core functionalities have been developed and integrated into the system:  

- **Chat Interface** – Interactive AI-powered chat system.  
- **Chat History** – Chat history is stored in the database and displayed in the chat interface.
- **Session Management** – Persistent user sessions with state tracking.  
- **Code Execution** – Code execution is supported for Python.
- **Google OAuth** – Google OAuth is supported for authentication.
- **Analytics Dashboard** – A comprehensive admin panel displaying usage statistics, model performance metrics, and cost analysis.  
- **Cost Analytics** – Tracks detailed cost breakdowns, daily spending trends, and cost projections.  
- **User Analytics** – Monitors user activity, session statistics, and new user acquisition rates.  
- **Model Performance Tracking** – Evaluates model usage, response times, and token consumption patterns.  
- **Admin Authentication** – Secure, API key-based authentication for administrative access.  
- **Real-time Updates** – WebSocket-based real-time updates for dashboard and analytics views.  
---

## 🚧 In-Progress Features  
Key features under active development or require further refinement:  

- **Real-time Analytics Enhancements** – WebSocket handling is functional but requires additional robustness improvements.  
- **Enterprise Deployment Options** – On-premise deployment is planned to integrate APIs such as LinkedIn, Google, Meta or custom APIs.  
- **Documentation** – Documentation is planned to be added to the project to improve the developer experience and maintainability.  
- **Model Credits Tracking** – Model credits tracking is planned to be added to the project to divide the usage between the users.  
- **Pricing plans and Stripe Integration** – Pricing plans and Stripe integration are planned to be added to the project for the users to purchase more credits.  
---

## 🛠️ Issues & Fixes Needed  
The following areas require attention to improve system stability and performance:  

- **WebSocket Connection Handling** – Improved error handling is needed for `active_dashboard_connections` and `active_user_connections` management.  
- **Error Handling** – Certain API endpoints require more robust exception handling to improve fault tolerance.  
- **Cost Calculation Precision** – The floating-point precision in cost calculations may need adjustments, particularly for projected estimates.  
- **Query Performance** – Some database queries could be optimized for efficiency when handling large volumes of data.  
- **Static Query** - Change the Data Viz query to be more around the static dataset of Housing.
- **User Icon** - Add a user sign up icon in the chat interface.
- **Code Execution Hover UI** - Fix the hover UI of the code execution.
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
- **Anthropic API Key** – Required for the chat interface.  

### **Monitoring Considerations:**  
- Implement **logging** for critical application paths.  
- Track **WebSocket connection stability** to prevent data loss.  
- Validate **cost projections against actual spending trends** to detect anomalies.  

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
  - Test 6: Test the Admin Dashboard
    - Test 6.1: Test the Admin Dashboard Statistics
    - Test 6.2: Test the Admin Dashboard Cost Analytics
    - Test 6.3: Test the Admin Dashboard User Analytics
    - Test 6.4: Test the Admin Dashboard Model Performance
    - Test 6.5: Test the Admin Dashboard Real-time Updates

### **Deployment Testing:**  
- Run `verify_session_state.py` to ensure **session management consistency**.  
- Verify **WebSocket connections remain stable** during high traffic.  
- Check the **admin dashboard** for expected functionality using test data.  
- Validate **cost projections against real-time values**.  


---

## 📄 Additional Notes  
- The project is structured with a clear separation of concerns across services.  
- **Chat Interface** is a core feature requiring requiring thorough manual testing.  
- **Real-time analytics** is a core feature requiring rigorous testing and monitoring.  
- **Admin API key security** is crucial to prevent unauthorized access in production.  
- **Cost calculation accuracy** should be regularly validated against actual expenditures.  
- **Session management stability** requires further validation to ensure data consistency.  

### **Next Steps:**  
- Define **Pricing Plans** for the users.
- Implement **Redis** for caching the model credits for the users.
- Integrate **Stripe** for payment processing.
- Strengthen **real-time capabilities** through enhanced WebSocket handling.  
- Expand **test coverage** to mitigate regressions.  
- Improve **documentation** to support development and maintainability.  
- Deploy the **Database** to be on cloud and persist the data. 