import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import AdminDashboardLink from './admin/AdminDashboardLink';

export default function Header() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // useEffect to handle mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-background/95 backdrop-blur-sm border-b">
      <div className="flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/Auto-analysts%20icon%20small-S682Oi8nbFhOADUHXJSD9d0KtSWKCe.png" 
            alt="Auto Analyst Logo" 
            width={32} 
            height={32} 
            className="dark:invert"
          />
          <span className="font-bold text-lg hidden sm:inline-block text-black text-[#FF7F7F]">Auto Analyst</span>
        </Link>
      </div>
      
      <div className="flex items-center gap-4">
        <AdminDashboardLink />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {mounted && theme === 'dark' ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
} 