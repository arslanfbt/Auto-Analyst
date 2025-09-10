"use client"

import { ReactNode } from 'react';
import Head from 'next/head';
import NavigationBar from './NavigationBar';
import Sidebar from './Sidebar';
import Footer from './Footer';

interface AnalyticsLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AnalyticsLayout({ 
  children, 
  title = 'Analytics | Auto-Analyst' 
}: AnalyticsLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col">
      <Head>
        <title>{title}</title>
        <meta name="description" content="Auto-Analyst analytics dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <NavigationBar />
      
      <div className="flex-grow flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="w-64 flex-shrink-0 mr-8 hidden md:block">
          <Sidebar />
        </div>
        
        <main className="flex-grow">
          {children}
        </main>
      </div>
      
      <Footer />
    </div>
  );
} 