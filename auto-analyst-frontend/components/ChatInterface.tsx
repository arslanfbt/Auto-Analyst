"use client"

import React, { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import ChatWindow from "./ChatWindow";
import ChatInput from "./ChatInput";
import Sidebar from "./Sidebar";
import axios from "axios";

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<{ text: string; sender: "user" | "ai" }[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const handleSendMessage = async (message: string) => {
    setMessages([...messages, { text: message, sender: "user" }]);

    try {
      const endpoint = selectedAgent ? `http://localhost:8000/chat/${selectedAgent}` : `http://localhost:8000/chat`;
      const response = await axios.post(endpoint, { query: message });
      
      const responseText = typeof response.data.response === 'string' 
        ? response.data.response 
        : JSON.stringify(response.data.response);

      setMessages((prevMessages) => [
        ...prevMessages,
        { text: responseText, sender: "ai" },
      ]);
    } catch (error) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: "Error: Unable to get a response from the server.", sender: "ai" },
      ]);
    }
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("styling_instructions", "Please analyze the data and provide a detailed report.");
    try {
      const response = await axios.post("http://localhost:8000/upload_dataframe", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: response.data.message, sender: "ai" },
      ]);
    } catch (error) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: "Error: Unable to upload the file.", sender: "ai" },
      ]);
    }
  };
  

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-white text-gray-900">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <motion.div
        animate={{ marginLeft: isSidebarOpen ? "16rem" : "0rem" }}
        transition={{ type: "tween", duration: 0.3 }}
        className="flex-1 flex flex-col"
      >
        <header className="bg-white/70 backdrop-blur-sm p-4 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Image
              src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/auto-analyst-logo-R9wBx0kWOUA96KxwKBtl1onOHp6o02.png"
              alt="Auto-Analyst Logo"
              width={256}
              height={256}
            />
          </div>
          <button
            onClick={toggleSidebar}
            className="text-gray-500 hover:text-[#FF7F7F] focus:outline-none transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </header>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 overflow-hidden"
        >
          <ChatWindow messages={messages} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <ChatInput onSendMessage={handleSendMessage} onFileUpload={handleFileUpload} />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ChatInterface;