"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Lock } from 'lucide-react'
import { Badge } from '../ui/badge'
import { hasFeatureAccess, UserSubscription } from '@/lib/features/feature-access'

interface Command {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  featureId?: string
  isPremium?: boolean
}

interface CommandSuggestionsProps {
  query: string
  isVisible: boolean
  onSelectCommand: (command: Command) => void
  userProfile: UserSubscription | null
  className?: string
}

const AVAILABLE_COMMANDS: Command[] = [
  {
    id: 'deep-analysis',
    name: 'deep-analysis',
    description: 'Comprehensive multi-step analysis with automated planning',
    icon: <Brain className="w-4 h-4" />,
    featureId: 'DEEP_ANALYSIS',
    isPremium: true
  }
]

export default function CommandSuggestions({
  query,
  isVisible,
  onSelectCommand,
  userProfile,
  className = ''
}: CommandSuggestionsProps) {
  // Filter commands based on query
  const filteredCommands = AVAILABLE_COMMANDS.filter(command => {
    if (!query || query === '/') return true
    return command.name.toLowerCase().includes(query.toLowerCase().replace('/', ''))
  })

  if (!isVisible || filteredCommands.length === 0) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`absolute bottom-full left-0 right-0 mb-2 bg-white border rounded-lg shadow-lg z-50 ${className}`}
      >
        <div className="p-2">
          <div className="text-xs text-gray-500 px-2 py-1 mb-1">
            Available Commands
          </div>
          <div className="space-y-1">
            {filteredCommands.map((command) => {
              const accessResult = command.featureId 
                ? hasFeatureAccess(command.featureId, userProfile)
                : { hasAccess: true }

              const hasAccess = accessResult.hasAccess

              return (
                <motion.div
                  key={command.id}
                  whileHover={{ backgroundColor: hasAccess ? '#f3f4f6' : undefined }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                    hasAccess 
                      ? 'hover:bg-gray-100' 
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                  onClick={() => hasAccess && onSelectCommand(command)}
                >
                  <div className={`flex-shrink-0 ${hasAccess ? 'text-blue-500' : 'text-gray-400'}`}>
                    {hasAccess ? command.icon : <Lock className="w-4 h-4" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-sm ${hasAccess ? 'text-gray-900' : 'text-gray-500'}`}>
                        /{command.name}
                      </span>
                      {command.isPremium && (
                        <Badge 
                          variant={hasAccess ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          Premium
                        </Badge>
                      )}
                      {!hasAccess && (
                        <Badge variant="outline" className="text-xs text-red-600">
                          Locked
                        </Badge>
                      )}
                    </div>
                    <div className={`text-xs ${hasAccess ? 'text-gray-600' : 'text-gray-400'}`}>
                      {command.description}
                    </div>
                    {!hasAccess && accessResult.reason && (
                      <div className="text-xs text-red-500 mt-1">
                        {accessResult.reason}
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
          
          {/* Upgrade prompt for premium features */}
          {filteredCommands.some(cmd => {
            const access = hasFeatureAccess(cmd.featureId || '', userProfile)
            return cmd.isPremium && !access.hasAccess
          }) && (
            <div className="mt-2 pt-2 border-t">
              <div className="text-xs text-gray-500 px-2">
                This feature requires a premium subscription.{' '}
                <span className="text-blue-600 cursor-pointer hover:underline">
                  Upgrade now
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
} 