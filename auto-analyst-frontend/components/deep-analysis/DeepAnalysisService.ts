const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export class DeepAnalysisService {
  static async downloadReport(chatId: number, sessionId?: string, userId?: number): Promise<void> {
    console.log('[DeepAnalysisService] downloadReport called with:', { chatId, sessionId, userId, chatIdType: typeof chatId })
    
    try {
      console.log('[DeepAnalysisService] Starting download for chat:', chatId)
      
      // First fetch the report details
      const summaryUrl = `${API_URL}/deep_analysis/chats/${chatId}/summary`
      console.log('[DeepAnalysisService] Fetching chat summary from:', summaryUrl)
      
      const summaryResponse = await fetch(summaryUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId && { 'X-Session-ID': sessionId })
        }
      })
      
      console.log('[DeepAnalysisService] Chat response status:', summaryResponse.status)
      
      if (summaryResponse.status === 422) {
        const errorText = await summaryResponse.text()
        console.error('[DeepAnalysisService] 422 error response:', errorText)
        throw new Error(`Invalid chat ID format. Server returned 422: ${errorText}`)
      }
      
      if (!summaryResponse.ok) {
        const errorText = await summaryResponse.text()
        console.error('[DeepAnalysisService] Chat summary fetch failed:', errorText)
        throw new Error(`Failed to fetch chat summary: ${summaryResponse.status} ${errorText}`)
      }

      const chatData = await summaryResponse.json()
      console.log('[DeepAnalysisService] Chat data received:', chatData)

      // Extract markdown content with fallback options
      const markdownContent = chatData.markdown_content || chatData.content || chatData.analysis_summary?.summary
      
      console.log('[DeepAnalysisService] Extracted markdown content:', {
        hasMarkdownContent: !!chatData.markdown_content,
        hasContent: !!chatData.content,
        hasSummary: !!chatData.analysis_summary?.summary,
        finalContent: !!markdownContent,
        contentLength: markdownContent ? markdownContent.length : 0
      })

      if (!markdownContent) {
        console.error('[DeepAnalysisService] No markdown content found in chat data:', Object.keys(chatData))
        throw new Error('No analysis content available for download')
      }

      // Use the download_report endpoint with the fetched data
      const downloadResponse = await fetch(`${API_URL}/deep_analysis/download_report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId && { 'X-Session-ID': sessionId })
        },
        body: JSON.stringify({ 
          analysis_data: {
            markdown_content: markdownContent
          }
        })
      })

      console.log('[DeepAnalysisService] Download response status:', downloadResponse.status)

      if (!downloadResponse.ok) {
        const errorText = await downloadResponse.text()
        console.error('[DeepAnalysisService] Download failed:', errorText)
        throw new Error(`Download failed: ${downloadResponse.status} ${errorText}`)
      }

      const blob = await downloadResponse.blob()
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `deep-analysis-report-${Date.now()}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log('[DeepAnalysisService] Download completed successfully')
      
    } catch (error) {
      console.error('[DeepAnalysisService] Download failed:', error)
      throw error
    }
  }

  static async deleteReport(chatId: number, sessionId?: string, userId?: number): Promise<void> {
    try {
      const params = new URLSearchParams()
      if (userId) params.append('user_id', userId.toString())

      const response = await fetch(`${API_URL}/deep_analysis/chats/${chatId}?${params}`, {
        method: 'DELETE',
        headers: {
          ...(sessionId && { 'X-Session-ID': sessionId })
        }
      })

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      throw error
    }
  }

  static getUserId(session: any): number | undefined {
    if (!session?.user) return undefined
    
    // Try different ways to extract user ID
    if ((session.user as any).sub) {
      return parseInt((session.user as any).sub) || undefined
    } else if ((session.user as any).id) {
      return parseInt((session.user as any).id) || undefined
    }
    return undefined
  }
} 