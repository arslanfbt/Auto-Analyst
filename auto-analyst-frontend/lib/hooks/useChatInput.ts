import { useState, useEffect, useRef } from 'react'
import { useSession } from "next-auth/react"
import { useSessionStore } from '@/lib/store/sessionStore'
import { useCredits } from '@/lib/contexts/credit-context'
import { ChatInputProps, FileUpload, FilePreview, DatasetDescription, ErrorNotification } from '@/types/chatInput.types'
import axios from 'axios'
import API_URL from '@/config/api'
import logger from '@/lib/utils/logger'

const PREVIEW_API_URL = API_URL;

export const useChatInput = (props: ChatInputProps) => {
  // State management
  const [message, setMessage] = useState("")
  const [fileUpload, setFileUpload] = useState<FileUpload | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showHint, setShowHint] = useState(false)
  const [input, setInput] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { data: session } = useSession()
  const [showPreview, setShowPreview] = useState(false)
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null)
  const [datasetDescription, setDatasetDescription] = useState<DatasetDescription>({
    name: '',
    description: '',
  });
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const { sessionId, setSessionId } = useSessionStore()
  const { remainingCredits, isChatBlocked, creditResetDate, checkCredits } = useCredits()
  const [showCreditInfo, setShowCreditInfo] = useState(false)
  const [showDatasetResetPopup, setShowDatasetResetPopup] = useState(false)
  const [datasetMismatch, setDatasetMismatch] = useState(false)
  const popupShownForChatIdsRef = useRef<Set<number>>(new Set());
  const [descriptionTab, setDescriptionTab] = useState<"edit" | "preview">("edit")
  const [errorNotification, setErrorNotification] = useState<ErrorNotification | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [showUploadSummary, setShowUploadSummary] = useState(false)

  // Excel-specific states
  const [showExcelDialog, setShowExcelDialog] = useState(false)
  const [excelSheets, setExcelSheets] = useState<string[]>([])
  const [excelFileName, setExcelFileName] = useState('')
  const [isExcelSubmitting, setIsExcelSubmitting] = useState(false)

  // CSV-specific states
  const [showCSVDialog, setShowCSVDialog] = useState(false)
  const [csvFileName, setCSVFileName] = useState('')
  const [csvPreview, setCSVPreview] = useState<FilePreview | null>(null)
  const [isCSVSubmitting, setIsCSVSubmitting] = useState(false)

  // Deep Analysis states
  const [showDeepAnalysisSidebar, setShowDeepAnalysisSidebar] = useState(false)
  const [showTemplatesSidebar, setShowTemplatesSidebar] = useState(false)
  const [showCreditExhaustedModal, setShowCreditExhaustedModal] = useState(false)

  // Add a ref to prevent multiple initializations
  const sessionInitialized = useRef(false)

  // Ensure we always have a session ID
  useEffect(() => {
    if (!sessionId && !sessionInitialized.current) {
      sessionInitialized.current = true
      // Generate a new session ID if we don't have one
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setSessionId(newSessionId)
    }
  }, [sessionId, setSessionId])

  // Helper function to safely update session ID
  const updateSessionIdSafely = (newSessionId: string) => {
    if (newSessionId && newSessionId !== sessionId) {
      console.log(`Session ID update: ${sessionId} -> ${newSessionId}`)
      setSessionId(newSessionId)
    }
  }

  // Helper function to get headers with session ID
  const getHeaders = (additionalHeaders: Record<string, string> = {}) => {
    return {
      ...additionalHeaders,
      ...(sessionId && { 'X-Session-ID': sessionId }),
    }
  }

  // Helper function to get error messages
  const getErrorMessage = (error: any): string => {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.detail || error.response?.data?.message || error.message
    }
    return error.message || 'Unknown error occurred'
  }

  // Handler functions
  const handleSendMessage = () => {
    if (message.trim() && !props.disabled && !props.isLoading) {
      props.onSendMessage(message)
      setMessage("")
    }
  }

  const handleFileUpload = async (file: File) => {
    const isCSV = file.name.toLowerCase().endsWith('.csv')
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    
    if (isCSV) {
      // Handle CSV files - upload temporarily, get preview, show dialog
      try {
        setCSVFileName(file.name)
        setFileUpload({ file, status: 'loading', isExcel: false })

        // Upload the CSV file temporarily with basic info
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('name', file.name.replace(/\.csv$/i, ''))
        uploadFormData.append('description', `CSV data from ${file.name}`)

        // Upload the file to set it as current session dataset
        await axios.post(`${PREVIEW_API_URL}/upload_dataframe`, uploadFormData, {
          headers: getHeaders({ 'X-Force-Refresh': 'true' }),
        })

        // Get the preview of the uploaded dataset
        const response = await axios.post(`${PREVIEW_API_URL}/api/preview-csv`, {}, {
          headers: getHeaders(),
        })

        const preview = {
          headers: response.data.headers || [],
          rows: response.data.rows || [],
          name: response.data.name || file.name.replace(/\.csv$/i, ''),
          description: response.data.description || `CSV data from ${file.name}`
        }

        setCSVPreview(preview)
        setDatasetDescription({
          name: preview.name,
          description: preview.description
        })
        setFileUpload(prev => (prev ? { ...prev, status: 'success' } : null))
        setShowCSVDialog(true)
      } catch (error: any) {
        console.error('Error processing CSV file:', error)
        setFileUpload(prev =>
          prev ? { ...prev, status: 'error', errorMessage: error?.message || 'Failed to read CSV file' } : null
        )
        setErrorNotification({
          message: 'CSV processing failed',
          details: error?.message || 'Failed to read CSV file'
        })
      }
    } else if (isExcel) {
      // Handle Excel files - existing logic
      await handleExcelFileSelected(file)
    } else {
      // Invalid file type
      setFileUpload({
        file,
        status: 'error',
        errorMessage: 'Please upload a CSV or Excel file only'
      })
      setErrorNotification({
        message: 'Invalid file format',
        details: 'Please upload a CSV or Excel file only. Other file formats are not supported.'
      })
    }
  }

  const handleRemoveFile = () => {
    setFileUpload(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // ADD MISSING FUNCTION: handleExcelFileSelected
  const handleExcelFileSelected = async (file: File) => {
    try {
      setExcelFileName(file.name)
      setFileUpload({ file, status: 'loading', isExcel: true })

      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(`${PREVIEW_API_URL}/api/excel-sheets`, formData, {
        headers: getHeaders(),
      })

      const sheets: string[] = Array.isArray(response.data?.sheets) ? response.data.sheets : []
      if (!sheets.length) throw new Error('No sheets found in Excel file')

      setExcelSheets(sheets)
      setDatasetDescription(prev => ({
        ...prev,
        name: file.name.replace(/\.(xlsx|xls)$/i, ''),
        description: prev.description || `Excel data from ${file.name}`
      }))
      setFileUpload(prev => (prev ? { ...prev, status: 'success', sheets } : null))
      setShowExcelDialog(true)
    } catch (error: any) {
      console.error('Error processing Excel file:', error)
      setFileUpload(prev =>
        prev ? { ...prev, status: 'error', errorMessage: error?.message || 'Failed to read Excel file' } : null
      )
      setErrorNotification({
        message: 'Excel processing failed',
        details: error?.message || 'Failed to read Excel file'
      });
    }
  }

  const handlePreviewDefaultDataset = async () => {
    try {
      setFileUpload(null);
      localStorage.removeItem('lastUploadedFile');
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      popupShownForChatIdsRef.current = new Set();
      
      // DON'T reset session for default dataset preview - just get the data
      const response = await axios.get(`${PREVIEW_API_URL}/api/default-dataset`, {
        headers: getHeaders(),
      });
      
      const defaultDescription = response.data.description || 'Default housing dataset containing information about residential properties';
      
      setFilePreview({
        headers: response.data.headers,
        rows: response.data.rows,
        name: response.data.name,
        description: defaultDescription
      });
      
      setDatasetDescription({
        name: response.data.name || 'Dataset',
        description: defaultDescription
      });
      
      setShowPreview(true);
      
      // Only update session ID if it's provided and different
      if (response.data.session_id) {
        updateSessionIdSafely(response.data.session_id);
      }
      
      setDatasetMismatch(false);
    } catch (error) {
      console.error('Error loading default dataset:', error);
    }
  }

  const handleSilentDefaultDataset = async () => {
    try {
      setFileUpload(null);
      localStorage.removeItem('lastUploadedFile');
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      popupShownForChatIdsRef.current = new Set();
      
      // DON'T reset session for silent default dataset - just get the data
      const response = await axios.get(`${PREVIEW_API_URL}/api/default-dataset`, {
        headers: getHeaders(),
      });
      
      const defaultDescription = response.data.description || 'Default housing dataset containing information about residential properties';
      
      setFilePreview({
        headers: response.data.headers,
        rows: response.data.rows,
        name: response.data.name,
        description: defaultDescription
      });
      
      setDatasetDescription({
        name: response.data.name || 'Dataset',
        description: defaultDescription
      });
      
      // Only update session ID if it's provided and different
      if (response.data.session_id) {
        updateSessionIdSafely(response.data.session_id);
      }
      
      setDatasetMismatch(false);
    } catch (error) {
      console.error('Error loading default dataset:', error);
    }
  }

  const handleExcelConfirmUpload = async (selectedSheets: string[], name: string, description: string) => {
    if (!fileUpload?.file) return
    
    setIsExcelSubmitting(true)
    
    try {
      // Only reset session if we're uploading a new custom dataset
      if (sessionId) {
        try {
          await axios.post(`${PREVIEW_API_URL}/reset-session`, null, {
            headers: getHeaders(),
          })
        } catch (resetError) {
          console.warn('Session reset failed, continuing with upload:', resetError);
        }
      }

      const formData = new FormData()
      formData.append('file', fileUpload.file)
      formData.append('name', name)
      formData.append('description', description)
      formData.append('selected_sheets', JSON.stringify(selectedSheets))

      const response = await axios.post(`${PREVIEW_API_URL}/upload_excel`, formData, {
        headers: getHeaders({ 'X-Force-Refresh': 'true' }),
      })

      if (response.status === 200) {
        // Only update session ID if it's provided and different
        if (response.data.session_id) {
          updateSessionIdSafely(response.data.session_id);
        }
        
        // Update file upload state with selected sheets
        setFileUpload(prev => prev ? { 
          ...prev, 
          status: 'success', 
          sheets: response.data.sheets_processed || selectedSheets,
          selectedSheets: selectedSheets
        } : null)
        
        setDatasetDescription({ name, description })
        setUploadSuccess(true)
        setShowExcelDialog(false)
        
        // Show upload summary after successful upload
        setTimeout(() => {
          setShowUploadSummary(true)
          setUploadSuccess(false)
        }, 500)
      }
    } catch (error) {
      console.error('Excel upload failed:', error);
      setErrorNotification({ 
        message: 'Excel upload failed', 
        details: getErrorMessage(error)
      })
      setFileUpload(prev => prev ? { 
        ...prev, 
        status: 'error', 
        errorMessage: getErrorMessage(error)
      } : null)
    } finally {
      setIsExcelSubmitting(false)
    }
  }

  // CSV confirm upload handler
  const handleCSVConfirmUpload = async (name: string, description: string) => {
    try {
      // Update the session description with the final name and description
      const formData = new FormData()
      formData.append('name', name)
      formData.append('description', description)
      
      // Call an endpoint to update the session description (if such an endpoint exists)
      // Or we could call upload_dataframe again with the same file but new description
      // For now, let's just update the local state
      setDatasetDescription({ name, description })
      setUploadSuccess(true)
      setShowCSVDialog(false)
      
      // Show upload summary after successful upload
      setTimeout(() => {
        setShowUploadSummary(true)
        setUploadSuccess(false)
      }, 500)
    } catch (error) {
      console.error('Error updating CSV description:', error)
      setErrorNotification({
        message: 'Failed to update description',
        details: getErrorMessage(error)
      })
    }
  }

  // File preview handler for CSV
  const handleFilePreview = async (file: File, isNewDataset = false) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await axios.post(`${PREVIEW_API_URL}/upload_csv_preview`, formData, {
        headers: getHeaders(),
      })
      
      if (response.data) {
        const { headers, rows, name, description } = response.data
        const fileName = name || file.name.replace('.csv', '')
        const fileDesc = description || 'Please describe what this dataset contains and its purpose'
        
        setCSVPreview({ 
          headers, 
          rows, 
          name: fileName,
          description: fileDesc
        })
        
        setDatasetDescription({ 
          name: fileName, 
          description: fileDesc
        })
      }
    } catch (error) {
      console.error('Error previewing file:', error)
      throw error
    }
  }

  // Return all state and handlers
  return {
    // State
    message,
    setMessage,
    fileUpload,
    setFileUpload,
    showPreview,
    setShowPreview,
    filePreview,
    setFilePreview,
    datasetDescription,
    setDatasetDescription,
    uploadSuccess,
    setUploadSuccess,
    sessionId,
    setSessionId,
    remainingCredits,
    isChatBlocked,
    showCreditInfo,
    setShowCreditInfo,
    showDatasetResetPopup,
    setShowDatasetResetPopup,
    datasetMismatch,
    setDatasetMismatch,
    descriptionTab,
    setDescriptionTab,
    errorNotification,
    setErrorNotification,
    isGeneratingDescription,
    setIsGeneratingDescription,
    showExcelDialog,
    setShowExcelDialog,
    excelSheets,
    setExcelSheets,
    excelFileName,
    setExcelFileName,
    isExcelSubmitting,
    setIsExcelSubmitting,
    showDeepAnalysisSidebar,
    setShowDeepAnalysisSidebar,
    showTemplatesSidebar,
    setShowTemplatesSidebar,
    showCreditExhaustedModal,
    setShowCreditExhaustedModal,
    showUploadSummary,
    setShowUploadSummary,
    showCSVDialog,
    setShowCSVDialog,
    csvFileName,
    setCSVFileName,
    csvPreview,
    setCSVPreview,
    isCSVSubmitting,
    setIsCSVSubmitting,
    
    // Refs
    fileInputRef,
    inputRef,
    popupShownForChatIdsRef,
    errorTimeoutRef,
    
    // Handlers
    handleSendMessage,
    handleFileUpload,
    handleRemoveFile,
    handlePreviewDefaultDataset,
    handleSilentDefaultDataset,
    handleExcelFileSelected, // ADDED THIS MISSING HANDLER
    handleExcelConfirmUpload,
    handleCSVConfirmUpload,
    handleFilePreview,
    
    // Props
    ...props
  }
}




