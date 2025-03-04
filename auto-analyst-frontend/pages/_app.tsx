import { ThemeProvider } from 'next-themes';
import { Inter } from 'next/font/google';
import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import { useEffect } from 'react';
import { loginUser, getSessionId } from '@/lib/api/auth';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    async function initUser() {
      try {
        // Get session ID from local storage or create new one
        const sessionId = getSessionId();
        
        // Send it with every request - add this to the fetch code
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
          // Clone the original options to avoid modifying the original object
          const newOptions = { ...options };
          
          // Initialize headers if they don't exist
          newOptions.headers = newOptions.headers || {};
          
          // Add session ID header
          if (sessionId) {
            newOptions.headers['X-Session-ID'] = sessionId;
          }
          
          // Call the original fetch with our modified options
          return originalFetch(url, newOptions);
        };
        
        // Auto-login a guest user
        const username = `guest_${sessionId.substring(0, 8)}`;
        const email = `${username}@example.com`;
        await loginUser(username, email, sessionId);
        console.log(`User initialized with session ID: ${sessionId}`);
      } catch (error) {
        console.error('Failed to initialize user:', error);
      }
    }
    
    initUser();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className={`${inter.variable} font-sans`}>
        <Component {...pageProps} />
      </div>
    </ThemeProvider>
  );
}