import "./globals.css"
import type { Metadata } from "next"
import ClientLayout from "@/components/ClientLayout"

export const metadata: Metadata = {
  title: "Auto-Analyst",
  description: "AI-powered analytics platform",
  openGraph: {
    title: "Auto-Analyst",
    description: "AI-powered analytics platform",
    url: process.env.NEXTAUTH_URL || "http://localhost:3000",
    siteName: "Auto-Analyst",
    images: [
      {
        url: "https://xu73i5cewj3dp7jn.public.blob.vercel-storage.com/FireBirdTech%20%281%29.png",
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
    images: ["https://xu73i5cewj3dp7jn.public.blob.vercel-storage.com/FireBirdTech%20%281%29.png"],
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

