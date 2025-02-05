import { withAuth } from "next-auth/middleware"

// Remove the middleware protection entirely since we'll handle access control in the component
export const config = {
  matcher: []
} 