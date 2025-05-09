import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { getSessionId } from '@/lib/api/auth';

export default function Sidebar() {
  const pathname = usePathname();
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  // Function to handle admin signout
  const handleSignOut = () => {
    localStorage.removeItem('adminApiKey');
    window.location.reload();
  };
  
  const activeClass = "bg-[#FFF0F0] text-[#FF7F7F] font-medium";
  const inactiveClass = "text-gray-600 hover:bg-gray-50";
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-medium text-gray-800 mb-4">Analytics Dashboard</h2>
      
      <nav className="space-y-1">
        {/* Main Analytics */}
        <div className="pb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Overview
          </h3>
          
          <Link 
            href="/analytics/dashboard"
            className={`flex items-center px-3 py-2 text-sm rounded-md ${
              pathname === '/analytics/dashboard' ? activeClass : inactiveClass
            }`}
          >
            <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Dashboard
          </Link>
        </div>
        
        {/* Model Analytics */}
        <div className="pt-2 pb-2 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 pt-2">
            Model Analysis
          </h3>
          
          <Link 
            href="/analytics/models"
            className={`flex items-center px-3 py-2 text-sm rounded-md ${
              pathname === '/analytics/models' ? activeClass : inactiveClass
            }`}
          >
            <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Model Usage
          </Link>
          
          <Link 
            href="/analytics/tiers"
            className={`flex items-center px-3 py-2 text-sm rounded-md ${
              pathname === '/analytics/tiers' ? activeClass : inactiveClass
            }`}
          >
            <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
            </svg>
            Tier Analytics
          </Link>
        </div>
        
        {/* User Analytics */}
        <div className="pt-2 pb-2 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 pt-2">
            User Analytics
          </h3>
          
          <Link 
            href="/analytics/users"
            className={`flex items-center px-3 py-2 text-sm rounded-md ${
              pathname === '/analytics/users' ? activeClass : inactiveClass
            }`}
          >
            <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            User Activity
          </Link>
        </div>
        
        {/* Cost Analytics */}
        <div className="pt-2 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 pt-2">
            Cost Management
          </h3>
          
          <Link 
            href="/analytics/costs"
            className={`flex items-center px-3 py-2 text-sm rounded-md ${
              pathname === '/analytics/costs' ? activeClass : inactiveClass
            }`}
          >
            <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cost Analysis
          </Link>
        </div>
      </nav>
      
      {/* Admin Tools Section */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900">Admin Tools</h3>
        <div className="mt-3 space-y-3">
          <button 
            onClick={() => window.location.reload()}
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
            className="w-full text-left px-3 py-2 rounded-md text-base font-medium bg-[#FFF0F0] text-[#FF7F7F] hover:bg-[#FFEDED]"
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
                    <code className="bg-gray-100 px-2 py-1 rounded block truncate text-gray-700">{process.env.BACKEND_API_URL || 'http://localhost:8000'}</code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 