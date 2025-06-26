# Authentication System Documentation

Auto-Analyst uses NextAuth.js for comprehensive authentication management.

## Authentication Overview

### Supported Providers
- **Google OAuth** - Primary authentication method
- **Credentials** - Admin temporary login
- **Guest Mode** - Limited trial access

### NextAuth Configuration
```typescript
// app/api/auth/[...nextauth]/route.ts
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Temporary Login",
      credentials: {
        password: { label: "Temporary Code", type: "password" },
      },
      async authorize(credentials) {
        if (credentials?.password === process.env.NEXT_PUBLIC_ANALYTICS_ADMIN_PASSWORD) {
          return {
            id: "admin",
            name: "Administrator",
            email: "admin@example.com",
          }
        }
        return null
      }
    })
  ],
  callbacks: {
    async signIn({ user }) {
      // Save user profile to Redis on first login
      await profileUtils.saveUserProfile(user.id, {
        email: user.email,
        name: user.name,
        image: user.image,
        joinedDate: new Date().toISOString(),
        role: 'Free'
      })
      return true
    }
  }
})
```

## Session Management

### Client-Side Sessions
```typescript
// Using useSession hook
const { data: session, status } = useSession()

if (status === "loading") return <Loading />
if (status === "unauthenticated") return <LoginPrompt />

// Authenticated user
return <Dashboard user={session.user} />
```

### Server-Side Sessions
```typescript
// API routes authentication
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request })
  
  if (!token?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Proceed with authenticated request
}
```

## User Profile Management

### Profile Storage (Redis)
```typescript
// lib/redis.ts
export const profileUtils = {
  async saveUserProfile(userId: string, profile: UserProfile) {
    await redis.hset(KEYS.USER_PROFILE(userId), {
      email: profile.email,
      name: profile.name || '',
      image: profile.image || '',
      joinedDate: profile.joinedDate || new Date().toISOString(),
      role: profile.role || 'Free'
    })
  },
  
  async getUserProfile(userId: string) {
    return await redis.hgetall(KEYS.USER_PROFILE(userId))
  }
}
```

### Profile Context
```typescript
// lib/contexts/user-context.tsx
const UserProvider = ({ children }) => {
  const { data: session } = useSession()
  const [userProfile, setUserProfile] = useState(null)
  
  useEffect(() => {
    if (session?.user) {
      fetchUserProfile(session.user.id)
    }
  }, [session])
  
  return (
    <UserContext.Provider value={{ userProfile, updateProfile }}>
      {children}
    </UserContext.Provider>
  )
}
```

## Authentication Flow

### 1. Login Process
```
User clicks "Sign in with Google"
  ↓
Google OAuth consent
  ↓
NextAuth callback processing
  ↓
Profile saved to Redis
  ↓
Session created
  ↓
User redirected to dashboard
```

### 2. Logout Process
```typescript
const handleLogout = async () => {
  // Clear local state
  clearMessages()
  clearCredits()
  
  // Sign out from NextAuth
  await signOut({ callbackUrl: '/' })
}
```

## Protected Routes

### Page Protection
```typescript
// app/admin/page.tsx
export default function AdminPage() {
  const { data: session, status } = useSession()
  
  if (status === "loading") return <Loading />
  
  if (!session?.user?.isAdmin) {
    redirect('/login')
  }
  
  return <AdminDashboard />
}
```

### API Protection
```typescript
// Middleware for protected API routes
export async function authMiddleware(request: NextRequest) {
  const token = await getToken({ req: request })
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Add user info to request
  request.userId = token.sub
}
```

## Security Features

### CSRF Protection
- Built-in NextAuth CSRF protection
- Secure cookie configuration
- SameSite cookie policies

### Session Security
```typescript
// nextauth configuration
export default NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
})
```

## Guest User Support

### Anonymous Access
```typescript
// lib/store/freeTrialStore.ts
const useFreeTrialStore = create(
  persist(
    (set, get) => ({
      queriesUsed: 0,
      maxQueries: 5,
      
      hasFreeTrial: () => get().queriesUsed < get().maxQueries,
    }),
    { name: 'free-trial-storage' }
  )
)
```

### Guest Session Handling
```typescript
// Guest users get temporary session IDs
const getGuestId = () => {
  let guestId = localStorage.getItem('guestUserId')
  if (!guestId) {
    guestId = `guest-${Date.now()}`
    localStorage.setItem('guestUserId', guestId)
  }
  return guestId
}
``` 