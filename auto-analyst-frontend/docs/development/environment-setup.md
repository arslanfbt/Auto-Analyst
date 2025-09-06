# Environment Setup Guide

This guide covers all environment variables required for the Auto-Analyst frontend application.

## Required Environment Files

Create these files in the frontend root directory:

- `.env.local` - Local development (not committed to git)
- `.env.example` - Template file (committed to git)

## Environment Variables Reference

### **🔧 Core Configuration**

```bash
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000    # Backend FastAPI URL

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000           # Frontend URL
NEXTAUTH_SECRET=your-nextauth-secret-key     # Session encryption key (generate with openssl rand -base64 32)
```

### **🔐 Authentication & OAuth**

```bash
# Google OAuth (Primary authentication)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Admin Authentication
NEXT_PUBLIC_ANALYTICS_ADMIN_PASSWORD=your-admin-password  # Temporary admin access
```

### **💳 Payment & Billing**

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...           # Stripe public key
STRIPE_SECRET_KEY=sk_test_...                            # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...                          # Webhook verification secret
```

### **📧 Email Configuration**

```bash
# SMTP Settings
SMTP_HOST=smtp.gmail.com                     # Email server host
SMTP_PORT=587                                # Email server port
SMTP_USER=your-email@domain.com              # SMTP username
SMTP_PASS=your-app-password                  # SMTP password (use app password for Gmail)
SMTP_FROM=noreply@your-domain.com            # From email address
SALES_EMAIL=sales@your-domain.com            # Sales contact email
```

### **🗄️ Database & Caching**

```bash
# Redis Configuration (Upstash or self-hosted)
UPSTASH_REDIS_REST_URL=https://your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### **🤖 AI Model Defaults**

```bash
# Model Configuration Defaults
DEFAULT_MODEL_PROVIDER=openai                # Default AI provider
DEFAULT_PUBLIC_MODEL=gpt-4o-mini            # Default model
DEFAULT_TEMPERATURE=1                     # Default temperature
PUBLIC_DEFAULT_MAX_TOKENS=2500              # Default token limit
NEXT_PUBLIC_OPENAI_API_KEY=                 # Optional: Public OpenAI key (not recommended)
```

### **📊 Trial & Credits**

```bash
# Trial Configuration
NEXT_PUBLIC_FREE_TRIAL_LIMIT=0              # Free queries for non-authenticated users (0 in production)
TRIAL_DURATION=2                            # Trial duration (days)
TRIAL_CREDITS=500                           # Credits given during trial
```

### **🌍 Deployment & Environment**

```bash
# Environment Settings
NODE_ENV=development                        # development | production
FRONTEND_URL=https://your-domain.com        # Production frontend URL
```

## Environment-Specific Configuration

### **Development (.env.local)**

```bash
# Development configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret-key-change-in-production
GOOGLE_CLIENT_ID=your-dev-google-client-id
GOOGLE_CLIENT_SECRET=your-dev-google-client-secret
NEXT_PUBLIC_ANALYTICS_ADMIN_PASSWORD=admin123
NEXT_PUBLIC_FREE_TRIAL_LIMIT=20000
NODE_ENV=development

# Email (optional in development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-dev-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=dev@your-domain.com
SALES_EMAIL=dev@your-domain.com

# Redis (required)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### **Production (.env.production)**

```bash
# Production configuration
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=secure-production-secret-key
GOOGLE_CLIENT_ID=your-prod-google-client-id
GOOGLE_CLIENT_SECRET=your-prod-google-client-secret
NEXT_PUBLIC_ANALYTICS_ADMIN_PASSWORD=secure-admin-password
NEXT_PUBLIC_FREE_TRIAL_LIMIT=0
NODE_ENV=production

# Stripe (production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (production)
SMTP_HOST=smtp.your-email-provider.com
SMTP_PORT=587
SMTP_USER=noreply@your-domain.com
SMTP_PASS=secure-email-password
SMTP_FROM=noreply@your-domain.com
SALES_EMAIL=sales@your-domain.com

# Redis (production)
UPSTASH_REDIS_REST_URL=https://prod-redis-url
UPSTASH_REDIS_REST_TOKEN=prod-redis-token
```

## Security Best Practices

### **Secret Generation**

```bash
# Generate secure secrets
openssl rand -base64 32  # For NEXTAUTH_SECRET
openssl rand -hex 32     # Alternative format
```

### **Environment File Security**

1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Use different keys** for development and production
3. **Rotate secrets** regularly in production
4. **Use environment variables** in deployment platforms

### **Key Security Guidelines**

- **NEXTAUTH_SECRET**: Must be unique and secure (32+ characters)
- **API Keys**: Never expose secret keys in client-side code
- **SMTP Passwords**: Use app passwords, not account passwords
- **Admin Passwords**: Use strong, unique passwords

## Setup Instructions

### **1. Copy Template**

```bash
cp .env.example .env.local
```

### **2. Configure Google OAuth**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret to `.env.local`

### **3. Configure Stripe (if using billing)**

1. Create [Stripe Account](https://stripe.com/)
2. Get publishable and secret keys from dashboard
3. Set up webhook endpoint (see [Webhook Setup Guide](../system/webhooks.md))
4. Add keys to `.env.local`

### **4. Configure Redis**

**Option A: Upstash (Recommended)**
1. Create [Upstash Account](https://upstash.com/)
2. Create Redis database
3. Copy REST URL and token

**Option B: Self-hosted Redis**
```bash
# Install Redis locally
brew install redis  # macOS
# or use Docker
docker run -d -p 6379:6379 redis:alpine
```

### **5. Configure Email (Optional)**

**Gmail Setup:**
1. Enable 2-factor authentication
2. Generate app password
3. Use app password in `SMTP_PASS`

**Other Providers:**
- AWS SES
- SendGrid
- Mailgun
- Custom SMTP server

## Validation

### **Check Configuration**

```bash
# Verify environment variables are loaded
npm run dev

# Check in browser console
console.log(process.env.NEXT_PUBLIC_API_URL)
```

### **Test Services**

1. **Authentication**: Try Google login
2. **Email**: Test contact form submission
3. **Redis**: Check session persistence
4. **API**: Verify backend communication

## Troubleshooting

### **Common Issues**

1. **NextAuth Error**: Check `NEXTAUTH_SECRET` and `NEXTAUTH_URL`
2. **Google OAuth Failed**: Verify redirect URI configuration
3. **API Connection Failed**: Check `NEXT_PUBLIC_API_URL`
4. **Email Not Sending**: Verify SMTP credentials and app password
5. **Redis Connection**: Check URL format and token

### **Debug Commands**

```bash
# Check environment variables
echo $NEXT_PUBLIC_API_URL

# Verify NextAuth configuration
curl http://localhost:3000/api/auth/providers

# Test Redis connection
# (Check browser network tab for Redis calls)
```

### **Environment Validation Script**

```typescript
// scripts/validate-env.ts
const requiredVars = [
  'NEXT_PUBLIC_API_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN'
]

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`)
  } else {
    console.log(`✅ ${varName} is set`)
  }
})
```

## Deployment Considerations

### **Vercel Deployment**

Add environment variables in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add all production variables
3. Set different variables for preview/development branches

### **Docker Deployment**

```dockerfile
# Pass environment variables to container
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
# ... other variables
```

### **CI/CD Pipeline**

```yaml
# Example GitHub Actions
env:
  NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
  NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
  # ... other secrets
```

This comprehensive environment setup ensures your Auto-Analyst frontend works correctly across all environments and features. 