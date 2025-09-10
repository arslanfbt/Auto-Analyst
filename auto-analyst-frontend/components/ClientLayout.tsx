"use client"

import { Inter } from "next/font/google"
import { ThemeProvider } from 'next-themes'
import { SessionProvider } from "next-auth/react"
import { CreditProvider } from '@/lib/contexts/credit-context'
import { DeepAnalysisProvider } from '@/lib/contexts/deep-analysis-context'
import { AuthProvider } from '@/components/AuthProvider'
import { Providers } from '../app/providers'

const inter = Inter({ subsets: ["latin"] })

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className={`${inter.className} font-sans`}>
          <AuthProvider>
            <CreditProvider>
              <DeepAnalysisProvider>
              <Providers>{children}</Providers>
              </DeepAnalysisProvider>
            </CreditProvider>
          </AuthProvider>
        </div>
      </ThemeProvider>
    </SessionProvider>
  )
} 