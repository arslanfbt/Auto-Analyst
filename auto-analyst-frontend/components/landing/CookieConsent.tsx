"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { useCookieConsentStore } from "@/lib/store/cookieConsentStore"

export default function CookieConsent() {
  const [mounted, setMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const { hasConsented, setConsent } = useCookieConsentStore()

  useEffect(() => {
    setMounted(true)
    setIsAdmin(localStorage.getItem('isAdmin') === 'true')
  }, [])

  const handleAccept = () => {
    setIsVisible(false)
    setTimeout(() => {
      setConsent(true)
    }, 200)
  }

  const handleReject = () => {
    setIsVisible(false)
    setTimeout(() => {
      setConsent(false)
    }, 200)
  }

  if (!mounted || isAdmin || (hasConsented === true && localStorage.getItem('cookie-consent') === 'true')) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-white shadow-lg z-50"
        >
          <div className="max-w-7xl mx-auto p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              <p className="mb-2">
                We use cookies to enhance your experience and analyze our website traffic. 
                By clicking "Accept All", you consent to our use of cookies.
              </p>
              <a 
                href="/privacy-policy" 
                className="text-[#FF7F7F] hover:underline"
              >
                Learn more about our cookie policy
              </a>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleReject}
                className="whitespace-nowrap bg-gray-200 text-gray-900 hover:bg-gray-300"
              >
                Reject All
              </Button>
              <Button
                onClick={handleAccept}
                className="bg-[#FF7F7F] text-white hover:bg-[#FF6666] whitespace-nowrap"
              >
                Accept All
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 