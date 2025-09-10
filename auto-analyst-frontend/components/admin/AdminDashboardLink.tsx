import Link from 'next/link';
import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';

export default function AdminDashboardLink() {
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    // Check if there's an admin API key in localStorage
    const adminKey = localStorage.getItem('adminApiKey');
    setIsAdmin(!!adminKey);
  }, []);
  
  if (!isAdmin) return null;
  
  return (
    <Link
      href="/analytics/dashboard"
      className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
    >
      <BarChart3 className="h-4 w-4 mr-1" />
      Analytics Dashboard
    </Link>
  );
} 