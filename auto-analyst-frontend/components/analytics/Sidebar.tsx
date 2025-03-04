import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { getSessionId } from '@/lib/api/auth';

export default function Sidebar() {
  const router = useRouter();
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  // Function to handle admin signout
  const handleSignOut = () => {
    localStorage.removeItem('adminApiKey');
    router.reload(); // Reload the page to trigger re-authentication
  };
  
  // Sidebar menu items - only include dashboard for now
  const menuItems = [
    { name: 'Dashboard', href: '/analytics/dashboard', enabled: true },
    // These items are disabled until their pages are implemented
    { name: 'Model Usage', href: '#', enabled: false },
    { name: 'User Activity', href: '#', enabled: false },
    { name: 'Cost Analysis', href: '#', enabled: false },
  ];
  
  return (
    <aside className="w-64 bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900">Analytics</h3>
        <div className="mt-3 space-y-1">
          {menuItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.enabled ? item.href : '#'}
              onClick={(e) => !item.enabled && e.preventDefault()}
            >
              <span
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  router.pathname === item.href 
                    ? 'bg-blue-50 text-blue-700' 
                    : item.enabled 
                      ? 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      : 'text-gray-400 cursor-not-allowed'
                }`}
                title={!item.enabled ? 'Coming soon' : ''}
              >
                {item.name}
              </span>
            </Link>
          ))}
        </div>
        
        {/* Admin Tools Section */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900">Admin Tools</h3>
          <div className="mt-3 space-y-3">
            <button 
              onClick={() => router.reload()}
              className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              Refresh Data
            </button>
            
            <button
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              {showDebugInfo ? 'Hide Debug Info' : 'Show Debug Info'}
            </button>
            
            <button 
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
            >
              Sign Out
            </button>
            
            {/* Debug Information Panel */}
            {showDebugInfo && (
              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Debug Info</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-medium text-gray-700">Session ID:</span>
                    <div className="mt-1">
                      <code className="bg-gray-100 px-2 py-1 rounded block truncate text-gray-700">{getSessionId()}</code>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">User ID:</span>
                    <div className="mt-1">
                      <code className="bg-gray-100 px-2 py-1 rounded block truncate text-gray-700">{localStorage.getItem('userId') || 'Not set'}</code>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">API URL:</span>
                    <div className="mt-1">
                      <code className="bg-gray-100 px-2 py-1 rounded block truncate text-gray-700">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}</code>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
} 