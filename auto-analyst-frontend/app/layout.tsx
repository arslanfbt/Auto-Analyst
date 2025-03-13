import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Providers } from './providers'
import { CreditProvider } from '@/lib/contexts/credit-context'
import { AuthProvider } from '@/components/AuthProvider'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Auto-Analyst",
  description: "AI-powered analytics platform",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CreditProvider>
            <Providers>{children}</Providers>
          </CreditProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

