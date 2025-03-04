import Link from 'next/link';
import { useRouter } from 'next/router';

export default function NavigationBar() {
  const router = useRouter();
  
  // Helper to determine if a link is active
  const isActive = (path) => {
    return router.pathname === path ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100';
  };
  
  return (
    <nav className="bg-white shadow-sm mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <span className="text-blue-600 font-bold text-xl">Auto-Analyst</span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/">
                <span className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                  router.pathname === '/' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } text-sm font-medium`}>
                  Home
                </span>
              </Link>
              <Link href="/analytics/dashboard">
                <span className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                  router.pathname === '/analytics/dashboard' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } text-sm font-medium`}>
                  Analytics
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 