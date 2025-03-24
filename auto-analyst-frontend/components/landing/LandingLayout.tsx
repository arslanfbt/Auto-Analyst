import React, { ReactNode } from 'react';
import Head from 'next/head';
import Footer from './Footer';

interface LandingLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function LandingLayout({ 
  children, 
  title = 'Auto-Analyst - Transform Your Data Into Insights', 
  description = 'Harness the power of AI to analyze, predict, and optimize your business decisions'
}: LandingLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {children}
      
      <Footer />
    </div>
  );
} 