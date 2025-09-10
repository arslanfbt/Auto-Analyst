# Google OAuth Setup Guide

This project uses Google OAuth 2.0 for authentication. Follow these steps to set it up on your own Google Cloud account.

---

## Prerequisites

- A Google Account
- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Local environment or deployed domain (e.g., `localhost:3000`, `yourdomain.com`)

---

## Setup Instructions

### 1. Create a Google Cloud Project

- Visit [Google Cloud Console](https://console.cloud.google.com/)
- Click "Select a project" → "New Project"
- Name your project and click **Create**

---

### 2. Configure OAuth Consent Screen

- Go to `APIs & Services → OAuth consent screen`
- Choose **"External"** → Continue
- Fill in app details (name, email, etc.)
- Add test users for development use

---

### 3. Create OAuth Credentials

- Go to `APIs & Services → Credentials`
- Click `+ CREATE CREDENTIALS → OAuth client ID`
- Select:
  - **Application type**: `Web Application`
- Add **authorized redirect URIs**, e.g.:

```bash
http://localhost:3000/api/auth/callback/google
http://localhost:3000/auth/signin
```

```bash
https://yourdomain.com/api/auth/callback/google
https://yourdomain.com/auth/signin
```
- Click **Create**

---

### 4. Set Environment Variables

Create a `.env.local` file in your project root and add:

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```