import { useEffect, useState } from 'react';
import { loginUser, getSessionId } from '@/lib/api/auth';

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initializeUser() {
      try {
        // Get or generate session ID
        const sessionId = getSessionId();
        
        // Default user info - modify as needed for your app
        const username = 'guest_user';
        const email = `guest_${sessionId.substring(0, 8)}@example.com`;
        
        // Login or create user
        const userData = await loginUser(username, email, sessionId);
        setUser(userData);
      } catch (error) {
        console.error('Error initializing user:', error);
      } finally {
        setLoading(false);
      }
    }
    
    initializeUser();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {children}
    </div>
  );
} 