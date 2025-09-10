"use client"

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';

export default function NavigationBar() {
  const router = useRouter();
  const pathname = usePathname();
  
  const handleNavigate = () => {
    router.push('/analytics/dashboard');
  };
  
  const handleLogout = () => {
    localStorage.removeItem('adminApiKey');
    router.push('/');
  };
  
  return (
    <nav className="bg-white shadow-sm mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo and Brand */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <div className="flex items-center">
                  <span className="text-black font-bold text-xl mr-2">Auto-Analyst</span>
                  {/* You can add an actual logo image here */}
                  {/* <Image src="/logo.png" alt="Auto-Analyst" width={32} height={32} /> */}
                </div>
              </Link>
            </div>
            
            {/* Main Navigation Links */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/">
                <span className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                  pathname === '/' ? 'border-[#FF7F7F] text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } text-sm font-medium`}>
                  Home
                </span>
              </Link>
              <Link href="/analytics/dashboard">
                <span className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                  pathname?.startsWith('/analytics') ? 'border-[#FF7F7F] text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } text-sm font-medium`}>
                  Analytics
                </span>
              </Link>
              <Link href="/chat">
                <span className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                  pathname === '/chat' ? 'border-[#FF7F7F] text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } text-sm font-medium`}>
                  Chat
                </span>
              </Link>
            </div>
          </div>
          
          {/* Right side - Additional actions like profile/settings */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <button
              onClick={handleNavigate}
              className="px-3 py-1 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="ml-4 px-3 py-1 rounded-md bg-[#FFF0F0] text-sm font-medium text-[#FF7F7F] hover:bg-[#FFEDED]"
            >
              Sign Out
            </button>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#FF7F7F]"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Colored bar under nav - matches brand color */}
      <div className="h-1 bg-gradient-to-r from-[#FF7F7F] to-[#FF6666]"></div>
    </nav>
  );
} 