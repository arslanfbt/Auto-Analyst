import "./globals.css"
import type { Metadata } from "next"
import ClientLayout from "@/components/ClientLayout"

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
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}

