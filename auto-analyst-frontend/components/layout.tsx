"use client"

import React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { User, Menu, X } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'
import Footer from './landing/Footer'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/Auto-analysts%20icon%20small-S682Oi8nbFhOADUHXJSD9d0KtSWKCe.png"
              alt="Auto-Analyst Logo"
              width={35}
              height={35}
            />
            <span className="font-bold text-xl text-black">Auto-Analyst</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/chat" 
              className={`text-gray-600 hover:text-[#FF7F7F] ${
                pathname === '/chat' ? 'text-[#FF7F7F] font-medium' : ''
              }`}
              onClick={() => {
                // Set flag if coming from account or pricing page
                if (pathname === '/account' || pathname === '/pricing') {
                  localStorage.setItem('navigateFromAccount', 'true')
                }
              }}
            >
              Chat
            </Link>
            <Link 
              href="/pricing" 
              className={`text-gray-600 hover:text-[#FF7F7F] ${
                pathname === '/pricing' ? 'text-[#FF7F7F] font-medium' : ''
              }`}
            >
              Pricing
            </Link>
            {session ? (
              <div className="relative group">
                <button className="flex items-center space-x-1">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {session.user?.image ? (
                      <img src={session.user.image} alt={session.user.name || 'User'} className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} className="text-gray-600" />
                    )}
                  </div>
                  <span className="text-gray-700">{session.user?.name?.split(' ')[0] || 'User'}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link 
                    href="/account" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    My Account
                  </Link>
                  <button 
                    onClick={() => router.push('/api/auth/signout')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link 
                href="/api/auth/signin" 
                className="px-4 py-2 bg-[#FF7F7F] text-white rounded-md hover:bg-[#FF6666]"
              >
                Sign In
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 py-2 px-4">
            <nav className="flex flex-col space-y-3">
              <Link 
                href="/chat" 
                className={`text-gray-600 hover:text-[#FF7F7F] py-2 ${
                  pathname === '/chat' ? 'text-[#FF7F7F] font-medium' : ''
                }`}
                onClick={() => {
                  setMobileMenuOpen(false)
                  // Set flag if coming from account or pricing page
                  if (pathname === '/account' || pathname === '/pricing') {
                    localStorage.setItem('navigateFromAccount', 'true')
                  }
                }}
              >
                Chat
              </Link>
              <Link 
                href="/pricing" 
                className={`text-gray-600 hover:text-[#FF7F7F] py-2 ${
                  pathname === '/pricing' ? 'text-[#FF7F7F] font-medium' : ''
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              {session ? (
                <>
                  <Link 
                    href="/account" 
                    className="text-gray-600 hover:text-[#FF7F7F] py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Account
                  </Link>
                  <button 
                    onClick={() => {
                      setMobileMenuOpen(false)
                      router.push('/api/auth/signout')
                    }}
                    className="text-left text-gray-600 hover:text-[#FF7F7F] py-2"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link 
                  href="/api/auth/signin" 
                  className="text-gray-600 hover:text-[#FF7F7F] py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-grow bg-gray-50">
        {children}
        
      </main>

      <Footer />
    </div>
  )
} 