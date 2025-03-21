"use client"

import ChatInterface from "@/components/chat/ChatInterface"
import ResponsiveLayout from "../../components/ResponsiveLayout"
import "../globals.css"

export default function ChatPage() {
  return (
    <ResponsiveLayout>
      <ChatInterface />
    </ResponsiveLayout>
  )
}

