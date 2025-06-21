import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../ui/use-toast'
import API_URL from '@/config/api'
import { TemplateAgent, TemplatePreference } from './types'

interface UseTemplatesProps {
  userId: number
  enabled?: boolean
}

interface UseTemplatesReturn {
  templates: TemplateAgent[]
  preferences: TemplatePreference[]
  loading: boolean
  error: string | null
  templateCount: number
  enabledCount: number
  loadData: () => Promise<void>
  toggleTemplate: (templateId: number, enabled: boolean) => Promise<boolean>
  bulkUpdatePreferences: (updates: { template_id: number; is_enabled: boolean }[]) => Promise<boolean>
}

export function useTemplates({ userId, enabled = true }: UseTemplatesProps): UseTemplatesReturn {
  const [templates, setTemplates] = useState<TemplateAgent[]>([])
  const [preferences, setPreferences] = useState<TemplatePreference[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    if (!enabled || !userId) return

    setLoading(true)
    setError(null)
    
    try {
      const [templatesResponse, preferencesResponse] = await Promise.all([
        fetch(`${API_URL}/templates/?variant_type=planner`).catch(err => {
          throw new Error(`Templates endpoint failed: ${err.message}`)
        }),
        fetch(`${API_URL}/templates/user/${userId}?variant_type=planner`).catch(err => {
          throw new Error(`Preferences endpoint failed: ${err.message}`)
        })
      ])

      // Check templates response
      if (!templatesResponse.ok) {
        const errorText = await templatesResponse.text()
        throw new Error(`Failed to load templates: ${templatesResponse.status} ${templatesResponse.statusText} - ${errorText}`)
      }

      // Check preferences response  
      if (!preferencesResponse.ok) {
        const errorText = await preferencesResponse.text()
        throw new Error(`Failed to load preferences: ${preferencesResponse.status} ${preferencesResponse.statusText} - ${errorText}`)
      }

      // Parse responses
      const templatesData = await templatesResponse.json().catch(err => {
        throw new Error(`Failed to parse templates response: ${err.message}`)
      })
      
      const preferencesData = await preferencesResponse.json().catch(err => {
        throw new Error(`Failed to parse preferences response: ${err.message}`)
      })
      
      setTemplates(templatesData)
      setPreferences(preferencesData)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      setError(errorMessage)
      console.error('Error loading templates data:', err)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [userId, enabled, toast])

  const toggleTemplate = useCallback(async (templateId: number, isEnabled: boolean): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/templates/user/${userId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          is_enabled: isEnabled
        }),
      })

      if (response.ok) {
        // Update local state
        setPreferences(prev => prev.map(pref => 
          pref.template_id === templateId 
            ? { ...pref, is_enabled: isEnabled }
            : pref
        ))
        
        // Dispatch event for other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('template-preferences-updated'))
        }
        
        return true
      } else {
        throw new Error('Failed to update template preference')
      }
    } catch (error) {
      console.error('Error toggling template:', error)
      toast({
        title: "Update Failed",
        description: "Failed to update template preference",
        variant: "destructive",
      })
      return false
    }
  }, [userId, toast])

  const bulkUpdatePreferences = useCallback(async (
    updates: { template_id: number; is_enabled: boolean }[]
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/templates/user/${userId}/bulk-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: updates }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update local state for all successful updates
        setPreferences(prev => prev.map(pref => {
          const update = updates.find(u => u.template_id === pref.template_id)
          return update ? { ...pref, is_enabled: update.is_enabled } : pref
        }))

        // Dispatch event for other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('template-preferences-updated'))
        }

        const successful = result.results?.filter((r: any) => r.success).length || updates.length
        const failed = result.results?.filter((r: any) => !r.success).length || 0

        toast({
          title: failed === 0 ? "Settings Saved!" : "Partially Saved",
          description: failed === 0 
            ? `Updated ${successful} template preferences`
            : `${successful} saved, ${failed} failed`,
          variant: failed === 0 ? "default" : "destructive",
          duration: 3000,
        })

        return failed === 0
      } else {
        throw new Error('Failed to save preferences')
      }
    } catch (error) {
      console.error('Error bulk updating preferences:', error)
      toast({
        title: "Save Failed",
        description: "Failed to save template preferences",
        variant: "destructive",
      })
      return false
    }
  }, [userId, toast])

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadData()
  }, [loadData])

  // Listen for external updates
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleUpdate = () => {
      loadData()
    }

    window.addEventListener('template-preferences-updated', handleUpdate)
    return () => {
      window.removeEventListener('template-preferences-updated', handleUpdate)
    }
  }, [loadData])

  const templateCount = templates.length
  const enabledCount = preferences.filter(p => p.is_enabled).length

  return {
    templates,
    preferences,
    loading,
    error,
    templateCount,
    enabledCount,
    loadData,
    toggleTemplate,
    bulkUpdatePreferences
  }
} 