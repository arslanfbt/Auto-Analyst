# Authentication

This document covers the authentication system in Auto-Analyst, including NextAuth.js configuration, session management, and API protection.

## Overview

Auto-Analyst uses **NextAuth.js** for authentication with support for multiple providers and JWT-based sessions. Authentication is required for all core features including trials, subscriptions, and chat functionality.

## Authentication Providers

### Google OAuth
Primary authentication method for user sign-in.

```typescript
// lib/auth.ts
import GoogleProvider from "next-auth/providers/google"

const providers = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    authorization: {
      params: {
        prompt: "consent",
        access_type: "offline",
        response_type: "code"
      }
    }
  })
]
```

### Required Environment Variables
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000  # or your production URL
```

## NextAuth Configuration

### Main Configuration
**File**: `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { NextAuthOptions } from "next-auth"

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60     // 24 hours
  },
  
  jwt: {
    maxAge: 30 * 24 * 60 * 60   // 30 days
  },
  
  callbacks: {
    async jwt({ token, user, account }) {
      // Store user info in JWT token
      if (user) {
        token.sub = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      return token
    },
    
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.sub
        session.user.email = token.email
        session.user.name = token.name
        session.user.image = token.picture
      }
      return session
    },
    
    async signIn({ user, account, profile }) {
      // Always allow sign in for valid Google accounts
      return true
    },
    
    async redirect({ url, baseUrl }) {
      // Redirect to chat page after successful login
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/chat`
    }
  },
  
  pages: {
    signIn: "/login",
    signOut: "/signout",
    error: "/login"
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

## Session Management

### Client-Side Session Access

```typescript
'use client'
import { useSession, signIn, signOut } from "next-auth/react"

function SessionComponent() {
  const { data: session, status } = useSession()
  
  if (status === "loading") return <p>Loading...</p>
  
  if (status === "unauthenticated") {
    return (
      <button onClick={() => signIn('google')}>
        Sign in with Google
      </button>
    )
  }
  
  return (
    <div>
      <p>Signed in as {session.user?.email}</p>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  )
}
```

### Server-Side Session Access

```typescript
// API Routes
import { getToken } from "next-auth/jwt"

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request })
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const userId = token.sub
  const userEmail = token.email
  
  // Use user data...
}
```

```typescript
// Server Components
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export default async function ServerComponent() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }
  
  return <div>Welcome {session.user?.name}</div>
}
```

## Session Provider Setup

### Root Layout Configuration
**File**: `app/layout.tsx`

```typescript
import { SessionProvider } from "next-auth/react"
import { AuthProvider } from "@/components/AuthProvider"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### Auth Provider Component
**File**: `components/AuthProvider.tsx`

```typescript
'use client'
import { SessionProvider } from "next-auth/react"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

## API Route Protection

### Standard Protection Pattern

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function GET(request: NextRequest) {
  // Authenticate user
  const token = await getToken({ req: request })
  
  if (!token?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const userId = token.sub
  const userEmail = token.email
  
  try {
    // Your API logic here
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Reusable Auth Middleware

```typescript
// lib/auth-middleware.ts
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function requireAuth(request: NextRequest) {
  const token = await getToken({ req: request })
  
  if (!token?.sub) {
    throw new Error('Unauthorized')
  }
  
  return {
    userId: token.sub,
    userEmail: token.email,
    userName: token.name,
    userImage: token.picture
  }
}

// Usage in API routes
export async function GET(request: NextRequest) {
  try {
    const { userId, userEmail } = await requireAuth(request)
    // Your protected logic here
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

## Frontend Authentication Components

### Login Page
**File**: `app/login/page.tsx`

```typescript
'use client'
import { signIn, getSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect if already authenticated
    getSession().then((session) => {
      if (session) {
        router.push('/chat')
      }
    })
  }, [router])
  
  const handleSignIn = () => {
    signIn('google', { callbackUrl: '/chat' })
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Sign in to Auto-Analyst</h2>
          <p className="mt-2 text-gray-600">
            Access your AI-powered analytics platform
          </p>
        </div>
        
        <Button
          onClick={handleSignIn}
          className="w-full flex items-center justify-center gap-3"
          size="lg"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            {/* Google icon SVG */}
          </svg>
          Continue with Google
        </Button>
      </div>
    </div>
  )
}
```

### Sign Out Page
**File**: `app/signout/page.tsx`

```typescript
'use client'
import { signOut, useSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SignOutPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  useEffect(() => {
    if (session) {
      signOut({ callbackUrl: '/' })
    } else {
      router.push('/')
    }
  }, [session, router])
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Signing you out...</h2>
        <p className="text-gray-600">Thank you for using Auto-Analyst</p>
      </div>
    </div>
  )
}
```

### Navigation Auth State
**File**: `components/layout.tsx`

```typescript
'use client'
import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function AuthButton() {
  const { data: session, status } = useSession()
  
  if (status === "loading") {
    return <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
  }
  
  if (status === "unauthenticated") {
    return (
      <Button onClick={() => signIn('google')} variant="outline">
        Sign In
      </Button>
    )
  }
  
  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage src={session.user?.image || ''} />
        <AvatarFallback>
          {session.user?.name?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>
      
      <Button onClick={() => signOut()} variant="outline">
        Sign Out
      </Button>
    </div>
  )
}
```

## Route Protection

### Page-Level Protection

```typescript
// app/chat/page.tsx
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"

export default async function ChatPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }
  
  return (
    <div>
      <h1>Welcome to Chat, {session.user?.name}</h1>
      {/* Chat interface */}
    </div>
  )
}
```

### Middleware Protection

```typescript
// middleware.ts
import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Additional middleware logic if needed
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = {
  matcher: [
    '/chat/:path*',
    '/account/:path*',
    '/analytics/:path*',
    '/api/user/:path*',
    '/api/trial/:path*',
    '/api/checkout-sessions/:path*'
  ]
}
```

## User Profile Management

### Storing User Data

```typescript
// When user signs in, store profile in Redis
export async function storeUserProfile(userId: string, userData: any) {
  await redis.hset(KEYS.USER_PROFILE(userId), {
    email: userData.email,
    name: userData.name || 'User',
    image: userData.image || '',
    joinedDate: new Date().toISOString().split('T')[0],
    lastLogin: new Date().toISOString()
  })
}
```

### Accessing User Profile

```typescript
// lib/redis.ts - profileUtils
export const profileUtils = {
  async getUserProfile(userId: string) {
    const profile = await redis.hgetall(KEYS.USER_PROFILE(userId))
    return profile || {}
  },
  
  async updateUserProfile(userId: string, updates: any) {
    await redis.hset(KEYS.USER_PROFILE(userId), {
      ...updates,
      lastUpdated: new Date().toISOString()
    })
  }
}
```

## Session Security

### JWT Configuration

```typescript
// Secure JWT settings
const jwtOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  encryption: true,
  maxAge: 30 * 24 * 60 * 60, // 30 days
  algorithm: 'HS256'
}
```

### Session Validation

```typescript
// Enhanced token validation
export async function validateSession(request: NextRequest) {
  const token = await getToken({ req: request })
  
  if (!token) {
    throw new Error('No session token')
  }
  
  // Check token expiration
  if (Date.now() >= token.exp * 1000) {
    throw new Error('Token expired')
  }
  
  // Validate user still exists
  const userExists = await redis.exists(KEYS.USER_PROFILE(token.sub))
  if (!userExists) {
    throw new Error('User not found')
  }
  
  return token
}
```

## Error Handling

### Authentication Errors

```typescript
// Common authentication error patterns
export function handleAuthError(error: any) {
  switch (error.type) {
    case 'OAuthAccountNotLinked':
      return 'Account already exists with different provider'
    case 'EmailCreateAccount':
      return 'Account creation failed'
    case 'Callback':
      return 'Authentication callback failed'
    case 'OAuthCallback':
      return 'OAuth provider callback failed'
    case 'OAuthCreateAccount':
      return 'Failed to create OAuth account'
    case 'SessionRequired':
      return 'Please sign in to continue'
    default:
      return 'Authentication failed'
  }
}
```

### Error Pages

```typescript
// app/login/error/page.tsx
'use client'
import { useSearchParams } from 'next/navigation'

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  
  const errorMessage = handleAuthError({ type: error })
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          Authentication Error
        </h2>
        <p className="text-gray-600 mb-6">{errorMessage}</p>
        <Button onClick={() => signIn('google')}>
          Try Again
        </Button>
      </div>
    </div>
  )
}
```

## Testing Authentication

### Local Development

```bash
# Set up Google OAuth for localhost
# In Google Cloud Console:
# - Create OAuth 2.0 credentials
# - Add http://localhost:3000 to authorized origins
# - Add http://localhost:3000/api/auth/callback/google to redirect URIs
```

### Test User Flows

1. **Sign In Flow**
   ```typescript
   // Test successful sign in
   await signIn('google')
   // Should redirect to /chat
   ```

2. **Protected Route Access**
   ```typescript
   // Access protected route without auth
   // Should redirect to /login
   ```

3. **Session Persistence**
   ```typescript
   // Refresh page after sign in
   // Should maintain session
   ```

4. **Sign Out Flow**
   ```typescript
   // Test sign out
   await signOut()
   // Should clear session and redirect
   ```

## Best Practices

### Security
1. **Always validate sessions** server-side
2. **Use HTTPS** in production
3. **Secure environment variables** properly
4. **Implement CSRF protection** (built into NextAuth)
5. **Monitor authentication events**

### Performance
1. **Cache session data** appropriately
2. **Minimize token size** 
3. **Use efficient session storage**
4. **Implement session refresh** logic

### User Experience
1. **Clear error messages** for auth failures
2. **Smooth redirect flows** after sign in
3. **Loading states** during authentication
4. **Remember user preferences** across sessions

### Development
1. **Consistent auth patterns** across the app
2. **Centralized auth logic** in utilities
3. **Comprehensive error handling**
4. **Authentication testing** in CI/CD 