import "./globals.css"
import type { Metadata } from "next"
import ClientLayout from "@/components/ClientLayout"

export const metadata: Metadata = {
  title: "Auto-Analyst",
  description: "AI-powered analytics platform",
  openGraph: {
    title: "Auto-Analyst",
    description: "AI-powered analytics platform",
    url: process.env.NEXTAUTH_URL || "https://auto-analyst-cs.vercel.app",
    siteName: "Auto-Analyst",
    images: [
      {
        url: "https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/auto-analyst-logo-R9wBx0kWOUA96KxwKBtl1onOHp6o02.png",
        width: 1200,
        height: 630,
        alt: "Auto-Analyst - AI-powered analytics platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Auto-Analyst",
    description: "AI-powered analytics platform",
    images: ["https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/auto-analyst-logo-R9wBx0kWOUA96KxwKBtl1onOHp6o02.png"],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}

