import { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, BarChart3, Users, Database, HomeIcon } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col fixed inset-y-0 border-r bg-card z-30">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/analytics/dashboard" className="flex items-center font-bold text-lg">
            <span className="text-primary">Analytics</span>
            <span className="ml-1">Dashboard</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-2 px-4 py-6">
          <Link href="/analytics/dashboard" passHref>
            <Button variant="ghost" className="w-full justify-start">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/analytics/dashboard?tab=models" passHref>
            <Button variant="ghost" className="w-full justify-start">
              <BarChart3 className="mr-2 h-4 w-4" />
              Model Analytics
            </Button>
          </Link>
          <Link href="/analytics/dashboard?tab=users" passHref>
            <Button variant="ghost" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              User Analytics
            </Button>
          </Link>
          <Link href="/analytics/dashboard?tab=providers" passHref>
            <Button variant="ghost" className="w-full justify-start">
              <Database className="mr-2 h-4 w-4" />
              Provider Analytics
            </Button>
          </Link>
          <div className="pt-4 mt-4 border-t">
            <Link href="/" passHref>
              <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                <HomeIcon className="mr-2 h-4 w-4" />
                Return to App
              </Button>
            </Link>
          </div>
        </nav>
      </div>
      
      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1 min-h-screen">
        <main className="flex-1 pb-10">
          {children}
        </main>
      </div>
    </div>
  );
} 