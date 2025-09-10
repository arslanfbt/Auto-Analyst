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
    
    // You could also verify the token here with a JWT library
    // For more complex auth, consider using an API route or Auth.js
  }

  return NextResponse.next();
}

// Configure which paths should trigger this middleware
export const config = {
  matcher: ['/admin/:path*'],
}; 