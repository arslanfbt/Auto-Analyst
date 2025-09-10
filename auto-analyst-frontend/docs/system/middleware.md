# Middleware Configuration

This document explains the Next.js middleware setup for Auto-Analyst frontend.

## Overview

The middleware handles route protection, particularly for admin routes, using Next.js edge runtime capabilities.

## Middleware Implementation

### Current Configuration

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname
  const { pathname } = request.nextUrl;

  // Check if it's an admin route
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('authToken')?.value;
    
    // If there's no token or it's not valid, redirect to login
    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Configure which paths should trigger this middleware
export const config = {
  matcher: ['/admin/:path*'],
};
```

## Route Protection

### Protected Routes

Currently, the middleware protects:

- `/admin/*` - All admin dashboard routes

### Authentication Method

**Current Implementation:**
- Checks for `authToken` cookie (basic implementation)
- Redirects to `/login` with redirect parameter if no token found


```typescript
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token?.isAdmin) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
```

## Middleware Patterns

### 1. Route Protection

```typescript
// Protect multiple route patterns
export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/settings/:path*'
  ],
};
```

### 2. API Route Protection

```typescript
if (pathname.startsWith('/api/admin')) {
  const apiKey = request.headers.get('X-Admin-API-Key');
  
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }
}
```

### 3. Conditional Redirects

```typescript
// Redirect authenticated users away from login
if (pathname === '/login') {
  const token = request.cookies.get('next-auth.session-token');
  
  if (token) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }
}
```

## Best Practices

### Performance Considerations

1. **Keep middleware lightweight** - Runs on every request
2. **Use efficient checks** - Avoid heavy computations
3. **Cache where possible** - Store frequently accessed data

### Security Guidelines

1. **Validate tokens properly** - Use NextAuth token verification
2. **Handle edge cases** - Invalid tokens, expired sessions
3. **Log security events** - Track unauthorized access attempts

### Error Handling

```typescript
export function middleware(request: NextRequest) {
  try {
    // Protection logic
  } catch (error) {
    console.error('Middleware error:', error);
    // Allow request to proceed rather than blocking
    return NextResponse.next();
  }
}
```

## Advanced Middleware Features

### CORS Headers

```typescript
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  
  return response;
}
```

### Request Logging

```typescript
export function middleware(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();
  
  // Log request in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`${request.method} ${request.nextUrl.pathname} - ${Date.now() - start}ms`);
  }
  
  return response;
}
```

### Rate Limiting

```typescript
const requestCounts = new Map();

export function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const current = requestCounts.get(ip) || 0;
  
  if (current > 100) { // 100 requests per window
    return new Response('Rate limit exceeded', { status: 429 });
  }
  
  requestCounts.set(ip, current + 1);
  
  // Reset counter after 1 minute
  setTimeout(() => requestCounts.delete(ip), 60000);
  
  return NextResponse.next();
}
```

## Configuration Options

### Matcher Patterns

```typescript
export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
    
    // Match specific patterns
    '/admin/:path*',
    '/api/protected/:path*',
    
    // Exclude specific paths
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### Conditional Execution

```typescript
export const config = {
  matcher: [
    {
      source: '/admin/:path*',
      has: [
        {
          type: 'header',
          key: 'authorization',
        },
      ],
    },
  ],
};
```

## Integration with NextAuth

### Session-based Protection

```typescript
import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(request) {
    // Additional middleware logic
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Admin routes require admin role
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return token?.role === 'admin'
        }
        
        // Protected routes require any valid token
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*']
}
```

## Troubleshooting

### Common Issues

1. **Infinite redirects**: Check redirect logic carefully
2. **Middleware not triggering**: Verify matcher configuration
3. **Performance issues**: Avoid heavy operations in middleware

### Debug Middleware

```typescript
export function middleware(request: NextRequest) {
  console.log('Middleware triggered for:', request.nextUrl.pathname);
  console.log('Cookies:', request.cookies.toString());
  console.log('Headers:', Object.fromEntries(request.headers));
  
  // Your middleware logic
  
  return NextResponse.next();
}
```

## Future Enhancements

Potential improvements to the middleware system:

1. **Enhanced Authentication**: Better token validation
2. **Rate Limiting**: Request throttling per user/IP
3. **Security Headers**: CSP, HSTS, etc.
4. **Analytics**: Request tracking and monitoring
5. **A/B Testing**: Feature flag support
6. **Geolocation**: Region-based routing

 