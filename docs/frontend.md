# Auto-Analyst Frontend Architecture Documentation

## 1. Overall Architecture
The Auto-Analyst frontend is built using **Next.js** with a combination of **App Router** and **Pages Router** patterns. The application follows a component-based architecture with a clear separation of concerns:

- **App Directory**: Utilizes Next.js 13+ App Router for newer features.
- **Pages Directory**: Uses traditional Next.js Pages Router for some analytics features.
- **Components**: Reusable UI elements organized by feature and functionality.
- **State Management**: Combination of local state and custom stores.
- **UI Framework**: Tailwind CSS with custom components.

---

## 2. Directory Structure
```
auto-analyst-frontend/
├── app/                    # Next.js App Router pages & layouts
│   ├── admin/              # Admin-related pages
│   ├── analytics/          # Analytics pages (App Router version)
│   ├── api/                # API routes for server-side operations
│   ├── chat/               # Chat interface pages
│   ├── contact/            # Contact form pages
│   ├── enterprise/         # Enterprise features pages
│   ├── login/              # Authentication pages
│   └── layout.tsx          # Root layout for App Router
├── components/             # Reusable components
│   ├── admin/              # Admin dashboard components
│   ├── analytics/          # Analytics visualization components
│   ├── chat/               # Chat-related components
│   ├── ui/                 # General UI components (shadcn/ui based)
│   └── [feature].tsx       # Feature-specific components
├── config/                 # Configuration files
├── lib/                    # Utility functions and libraries
│   ├── api/                # API client functions
│   ├── store/              # State management stores
│   └── utils/              # Utility functions
├── pages/                  # Traditional Next.js Pages Router
│   └── analytics/          # Analytics dashboard pages
├── public/                 # Static assets
├── styles/                 # Global styles
└── types/                  # TypeScript type definitions
```

---

## 3. Key Component Breakdown

### 3.1 Core Components

#### Chat Interface Components
| Component          | Purpose                                    | Location |
|-------------------|---------------------------------|------------|
| `ChatInterface.tsx` | Main container for chat functionality | [View File](/auto-analyst-frontend/components/ChatInterface.tsx) |
| `ChatInput.tsx`  | User input area for chat          | [View File](/auto-analyst-frontend/components/ChatInput.tsx) |
| `ChatWindow.tsx` | Display area for chat messages   | [View File](/auto-analyst-frontend/components/ChatWindow.tsx) |
| `MessageContent.tsx` | Renders individual messages   | [View File](/auto-analyst-frontend/components/chat/MessageContent.tsx) |
| `CodeBlocker.tsx` | Syntax highlighting for code blocks | [View File](/auto-analyst-frontend/components/chat/CodeBlocker.tsx) |
| `LoadingIndicator.tsx` | Loading state visualization | [View File](/auto-analyst-frontend/components/chat/LoadingIndicator.tsx) |
| `AgentHint.tsx` | Agent hint component | [View File](/auto-analyst-frontend/components/chat/AgentHint.tsx) |
| `FreeTrialOverlay.tsx` | Free trial overlay component | [View File](/auto-analyst-frontend/components/chat/FreeTrialOverlay.tsx) |
| `WelcomeSection.tsx` | Welcome section for landing page | [View File](/auto-analyst-frontend/components/WelcomeSection.tsx) |
| `Sidebar.tsx` | Sidebar component | [View File](/auto-analyst-frontend/components/Sidebar.tsx) |
| `PlotlyChart.tsx` | Plotly chart component | [View File](/auto-analyst-frontend/components/PlotlyChart.tsx) |

#### Analytics Dashboard Components
| Component          | Purpose                                | Location |
|-------------------|--------------------------------|------------|
| `AnalyticsLayout.tsx` | Layout wrapper for analytics pages | [View File](/auto-analyst-frontend/components/analytics/AnalyticsLayout.tsx) |
| `Charts.tsx` | Visualization components  | [View File](/auto-analyst-frontend/components/admin/Charts.tsx) |
| `UsageTable.tsx` | Tabular data presentation | [View File](/auto-analyst-frontend/components/admin/UsageTable.tsx) |
| `DateRangePicker.tsx` | Date range selection for filtering | [View File](/auto-analyst-frontend/components/admin/DateRangePicker.tsx) |

#### UI Components
| Component | Purpose | Location |
|-----------|---------|----------|
| `alert.tsx` | Alert component | [View File](/auto-analyst-frontend/components/ui/alert.tsx) |
| `button.tsx` | Reusable button component | [View File](/auto-analyst-frontend/components/ui/button.tsx) |
| `calendar.tsx` | Calendar component | [View File](/auto-analyst-frontend/components/ui/calendar.tsx) |
| `card.tsx` | Card container component | [View File](/auto-analyst-frontend/components/ui/card.tsx) |
| `CopyButton.tsx` | Copy button component | [View File](/auto-analyst-frontend/components/ui/CopyButton.tsx) |
| `dialog.tsx` | Modal dialog component | [View File](/auto-analyst-frontend/components/ui/dialog.tsx) |
| `input.tsx` | Input component | [View File](/auto-analyst-frontend/components/ui/input.tsx) |
| `popover.tsx` | Popover component | [View File](/auto-analyst-frontend/components/ui/popover.tsx) |
| `scroll-area.tsx` | Scrollable area component | [View File](/auto-analyst-frontend/components/ui/scroll-area.tsx) |
| `table.tsx` | Data table component | [View File](/auto-analyst-frontend/components/ui/table.tsx) |
| `tabs.tsx` | Tab navigation component | [View File](/auto-analyst-frontend/components/ui/tabs.tsx) |
| `textarea.tsx` | Textarea component | [View File](/auto-analyst-frontend/components/ui/textarea.tsx) |
| `tooltip.tsx` | Tooltip component | [View File](/auto-analyst-frontend/components/ui/tooltip.tsx) |

#### Landing Page Components
| Component | Purpose | Location |
|-----------|---------|----------|
| `LandingPage.tsx` | Main landing page layout | [View File](/auto-analyst-frontend/components/LandingPage.tsx) |
| `HeroSection.tsx` | Hero section for landing page | [View File](/auto-analyst-frontend/components/HeroSection.tsx) |
| `FeatureSection.tsx` | Features showcase section | [View File](/auto-analyst-frontend/components/FeatureSection.tsx) |
| `TestimonialsSection.tsx` | Customer testimonials | [View File](/auto-analyst-frontend/components/TestimonialsSection.tsx) |

---

### 3.2 Pages Structure

#### App Router Pages (New Architecture)
```
app/
├── page.tsx              # Landing page
├── chat/                 # Chat application
│   └── page.tsx          # Main chat interface
├── analytics/            # Analytics overview
│   └── page.tsx          # Analytics summary page
├── admin/                # Admin section
│   └── page.tsx          # Admin dashboard
├── enterprise/           # Enterprise features
│   └── page.tsx          # Enterprise page
└── layout.tsx            # Root layout with navigation
```

#### Pages Router (Legacy)
```
pages/
├── _app.tsx              # App wrapper for Pages Router
└── analytics/            # Detailed analytics pages
    ├── costs.tsx         # Cost analysis page
    ├── dashboard.tsx     # Main analytics dashboard
    ├── models.tsx        # Model performance analysis
    └── users.tsx         # User activity analysis
```

---

## 4. State Management

### 4.1 Local Component State
- Uses React's `useState` and `useEffect` for local UI state.

### 4.2 Custom Stores
Custom state management is implemented in `/lib/store/`:
| Store | Purpose |
|-------|---------|
| `chatHistoryStore.ts` | Manages chat history |
| `cookieConsentStore.ts` | Manages cookie consent |
| `freeTrialStore.ts` | Tracks trial usage |
| `sessionStore.ts` | Manages user authentication state |

---

## 5. Key Features Implementation

### 5.1 Chat Interface
- **Handles:** message history, API communication, streaming response, and error handling.
- **Features:** syntax highlighting, loading indicators, Markdown rendering.

### 5.2 Analytics Dashboard
- **Dashboard Features:**
  - Summary statistics, usage trends, real-time updates.
- **Model Analysis:**
  - Model performance, cost tracking, user insights.

### 5.3 Authentication
- **Components:**
  - `AuthProvider.tsx`: Authentication context.
  - `lib/api/auth.ts`: API integrations.
  - `sessionStore.ts`: Session persistence.

---

## 6. UI Design Patterns

### 6.1 Component Library
- Built on `shadcn/ui` components.
- **Ensures:** consistency, accessibility, responsiveness.

### 6.2 Layouts
| Layout File | Purpose |
|-------------|---------|
| `app/layout.tsx` | Root layout (App Router) |
| `components/layout.tsx` | Main layout |
| `components/analytics/AnalyticsLayout.tsx` | Analytics layout |
| `components/admin/AdminLayout.tsx` | Admin layout |

---

## 7. API Integration
API clients are located in `/lib/api/`:
| Module | Purpose |
|--------|---------|
| `analytics.ts` | Fetch analytics data |
| `auth.ts` | Handle authentication |

Configuration in `/config/api.ts` manages:
- Base URL
- Environment variables
- API versioning

---

## 8. Development and Build Process
| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the development server |
| `npm run build` | Build the production app |
| `npm start` | Start the production server |

Build artifacts are stored in `.next/` (ignored in `.gitignore`).

---

## 9. Environment Configuration
Environment variables are stored in `.env.local`:
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API endpoint |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | Admin password |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Admin email |
| `NEXT_PUBLIC_FREE_TRIAL_LIMIT` | Free trial limit (Production: 2, Development: 20000)|
| `AUTH_SECRET` | Authentication secret |
| `ANALYTICS_CONFIG` | Analytics settings |
| `NEXTAUTH_URL` | Authentication URL (http://localhost:3000) |
| `NEXTAUTH_SECRET` | Authentication secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP server username |
| `SMTP_PASS` | SMTP server password |
| `ADMIN_API_KEY` | Admin API key |

For security, `.env.local` is not committed to Git.

---

## 10. Conclusion
This documentation provides an in-depth overview of the Auto-Analyst frontend architecture, covering components, state management, API integration, and development workflows. 🚀