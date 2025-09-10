"use client"


import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Paperclip, X, Square, Loader2, CheckCircle2, XCircle, Eye, CreditCard, Edit, FileText, MessageSquare, AlertTriangle, ChevronDown } from 'lucide-react'
import { Button } from "../ui/button"
import { Textarea } from "../ui/textarea"
import { useCookieConsentStore } from "@/lib/store/cookieConsentStore"
import { AlertCircle } from "lucide-react"
import { useSession } from "next-auth/react"
import axios from "axios"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog"
import { useSessionStore } from '@/lib/store/sessionStore'
import { useCredits } from '@/lib/contexts/credit-context'
import API_URL from '@/config/api'
import Link from 'next/link'
import DatasetResetPopup from './DatasetResetPopup'
import CreditExhaustedModal from './CreditExhaustedModal'
import ReactMarkdown from 'react-markdown'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import logger from '@/lib/utils/logger'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
// Deep Analysis imports
import { DeepAnalysisSidebar, DeepAnalysisButton } from '../deep-analysis'
import CommandSuggestions from './CommandSuggestions'
import AgentSuggestions from './AgentSuggestions'
import { useUserSubscriptionStore } from '@/lib/store/userSubscriptionStore'
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess'
import { UserSubscription } from '@/lib/features/feature-access'
import { useDeepAnalysis } from '@/lib/contexts/deep-analysis-context'

// const PREVIEW_API_URL = 'http://localhost:8000';
const PREVIEW_API_URL = API_URL;

interface FileUpload {
  file: File
  status: 'loading' | 'success' | 'error'
  errorMessage?: string
  isExcel?: boolean
  sheets?: string[]
  selectedSheet?: string
  dataset_upload_id?: number
}

interface AgentSuggestion {
  name: string
  description: string
}

interface FilePreview {
  headers: string[];
  rows: string[][];
  name: string;
  description: string;
}

interface DatasetDescription {
  name: string;
  description: string;
}

interface ChatInputProps {
  onSendMessage: (message: string) => void
  onFileUpload: (file: File) => void
  disabled?: boolean
  isLoading?: boolean
  onStopGeneration?: () => void
  chatId?: number | null
  userId?: number | null
}

// Add these interface definitions after the other interfaces
interface DatasetUploadStats {
  upload_id: number;
  status: string;
  file_size: number;
  row_count?: number;
  column_count?: number;
  processing_time_ms?: number;
  error_message?: string;
  error_details?: any;
}

// Add this component above the ChatInput component

// Component to display dataset upload details
const DatasetUploadInfo = ({ uploadId }: { uploadId: number }) => {
  const [uploadStats, setUploadStats] = useState<DatasetUploadStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUploadStats = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${PREVIEW_API_URL}/api/dataset-uploads?limit=1`);
        
        // Find the specific upload
        const upload = response.data.uploads.find((u: any) => u.upload_id === uploadId);
        if (upload) {
          setUploadStats(upload);
        } else {
          setError(`Upload with ID ${uploadId} not found`);
        }
      } catch (error) {
        console.error('Failed to fetch upload stats:', error);
        setError('Failed to load upload statistics');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (uploadId) {
      fetchUploadStats();
    }
  }, [uploadId]);
  
  if (isLoading) {
    return (
      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading upload details...
      </div>
    );
  }
  
  if (error) {
    return <div className="text-xs text-red-500 mt-1">{error}</div>;
  }
  
  if (!uploadStats) {
    return null;
  }
  
  return (
    <div className="text-xs mt-1">
      {uploadStats.status === 'completed' ? (
        <div className="text-green-600 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>
            {uploadStats.row_count?.toLocaleString()} rows × {uploadStats.column_count} columns • 
            {' '}{Math.round(uploadStats.file_size / 1024)} KB •
            {' '}{uploadStats.processing_time_ms ? `${uploadStats.processing_time_ms}ms` : ''}
          </span>
        </div>
      ) : uploadStats.status === 'failed' ? (
        <div className="text-red-600">
          <div className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>Upload failed: {uploadStats.error_message}</span>
          </div>
          {uploadStats.error_details && (
            <div className="text-xs text-red-500 mt-0.5 pl-4">
              {typeof uploadStats.error_details === 'object' ? 
                JSON.stringify(uploadStats.error_details) : 
                uploadStats.error_details}
            </div>
          )}
        </div>
      ) : (
        <div className="text-blue-500 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Processing upload...</span>
        </div>
      )}
    </div>
  );
};

const ChatInput = forwardRef<
  { handlePreviewDefaultDataset: () => void, handleSilentDefaultDataset: () => void },
  ChatInputProps
>(({ onSendMessage, onFileUpload, disabled, isLoading, onStopGeneration, chatId, userId }, ref) => {
  const [message, setMessage] = useState("")
  const [fileUpload, setFileUpload] = useState<FileUpload | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [showHint, setShowHint] = useState(false)
  const [input, setInput] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { data: session } = useSession()
  const { hasConsented, setConsent } = useCookieConsentStore()
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
  // Replace session flag with a set of chat IDs that have shown the popup
  const popupShownForChatIdsRef = useRef<Set<number>>(new Set());
  const [descriptionTab, setDescriptionTab] = useState<"edit" | "preview">("edit")
  // Add state for error notification
  const [errorNotification, setErrorNotification] = useState<{ message: string, details?: string } | null>(null);
  // Add timeout ref to manage error notification cleanup
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Add state to track description generation in progress
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  // Add state for sheet selection dialog
  const [showSheetSelector, setShowSheetSelector] = useState(false)
  
  // Deep Analysis states
  const { state: deepAnalysisState } = useDeepAnalysis()
  const [showDeepAnalysisSidebar, setShowDeepAnalysisSidebar] = useState(false)
  const [shouldForceExpanded, setShouldForceExpanded] = useState(false)
  
  // Custom Agents states
  const [showTemplatesSidebar, setShowTemplatesSidebar] = useState(false)
  const [shouldForceExpandedTemplates, setShouldForceExpandedTemplates] = useState(false)
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  
  // Agent suggestions state
  const [agentSuggestionsHasSelection, setAgentSuggestionsHasSelection] = useState(false)
  
  // Get subscription from store instead of manual construction
  const { subscription } = useUserSubscriptionStore()
  const deepAnalysisAccess = useFeatureAccess('DEEP_ANALYSIS', subscription)
  
  // Credit exhausted modal state
  const [showCreditExhaustedModal, setShowCreditExhaustedModal] = useState(false)

  // Expose handlePreviewDefaultDataset to parent
  useImperativeHandle(ref, () => ({
    handlePreviewDefaultDataset,
    handleSilentDefaultDataset
  }));

  // Use a ref to track localStorage changes
  const lastUploadedFileRef = useRef<string | null>(null);

  // Check isInputDisabled on mount to ensure consistent UI state
  useEffect(() => {
    const checkDisabledStatus = () => {
      const isDisabled = isInputDisabled();
    };
    checkDisabledStatus();
  }, []);

  // Enhanced credit refresh on navigation from accounts page
  useEffect(() => {
    // Listen for focus events to detect when user returns from accounts page
    const handleWindowFocus = () => {
      // Check navigation flags and referrer
      const navigationFlag = localStorage.getItem('navigateFromAccount') === 'true'
      const referrer = document.referrer;
      const isFromAccountsPage = referrer.includes('/account') || referrer.includes('/pricing');
      
      if ((navigationFlag || isFromAccountsPage) && session) {
        // Refresh credits when coming back from accounts/pricing page
        setTimeout(() => {
          checkCredits();
        }, 800); // Small delay to ensure any backend processes have completed
        
        // Clear the navigation flag
        localStorage.removeItem('navigateFromAccount')
      }
    };

    // Also listen for storage events (in case accounts page updates localStorage)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('credits') || e.key?.includes('subscription')) {
        // Credits or subscription data changed, refresh
        setTimeout(() => {
          checkCredits();
        }, 500);
      }
    };

    // Listen for custom events from other parts of the app
    const handleCreditUpdate = () => {
      setTimeout(() => {
        checkCredits();
      }, 500);
    };

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('creditsUpdated', handleCreditUpdate);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('creditsUpdated', handleCreditUpdate);
    };
  }, [session, checkCredits]);

  // Add a periodic check for credit state to ensure UI is consistent
  useEffect(() => {
    // Skip this check for non-logged in users
    if (!session) return;
    
    // Initial UI consistency check
    const forceUiUpdate = () => {
      // Force React to re-render the component if isChatBlocked changes
      setMessage(prevMessage => {
        return prevMessage;
      });
    };
    
    // Check every 3 seconds to keep UI in sync with credit context
    const intervalId = setInterval(() => {
      // Doesn't actually change state, just forces a re-render
      forceUiUpdate();
    }, 3000);
    
    return () => clearInterval(intervalId);
  }, [session, isChatBlocked]);

  // Auto-show credit exhausted modal when credits become 0
  useEffect(() => {
    if (isChatBlocked && remainingCredits <= 0 && session) {
      // Auto-show modal after a short delay when chat becomes blocked
      const timer = setTimeout(() => {
        setShowCreditExhaustedModal(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isChatBlocked, remainingCredits, session]);

  // Add an improved effect to handle chat switches and preserve dataset info
  useEffect(() => {
    // When sessionId changes (switching chats), check for dataset info
    if (sessionId) {
      
      // First try to get session info to see if we have a custom dataset
      axios.get(`${PREVIEW_API_URL}/api/session-info`, {
        headers: {
          'X-Session-ID': sessionId,
        },
      })
      .then(infoResponse => {
        const { is_custom_dataset, dataset_name, dataset_description } = infoResponse.data;
        
        
        if (is_custom_dataset) {
          // If we have a custom dataset, check if we have local file info
          const storedFileInfo = localStorage.getItem('lastUploadedFile');
          
          if (storedFileInfo) {
            try {
              // Parse stored file info
              const fileInfo = JSON.parse(storedFileInfo);
              
          // Create a mock File object for display purposes
          const mockFile = new File([""], fileInfo.name, { 
            type: fileInfo.type,
            lastModified: fileInfo.lastModified
          });
          
              // Set the file upload state
          setFileUpload({
            file: mockFile,
            status: 'success'
          });
              
              // Also try to fetch the preview for this file
              axios.post(`${PREVIEW_API_URL}/api/preview-csv`, null, {
                headers: {
                  'X-Session-ID': sessionId,
                },
              })
              .then(previewResponse => {
                const { headers, rows, name, description } = previewResponse.data;
                
                // Store preview data for display if needed
                setFilePreview({ headers, rows, name, description });
                setDatasetDescription({ name, description });
                
                
              })
              .catch(error => {
                logger.error('Failed to get dataset preview:', error);
              });
        } catch (error) {
              console.error('Error parsing stored file info:', error);
            }
          } else {
            // No local file info, but custom dataset exists on server
            // Create a generic mock file for display
            const mockFile = new File([""], `${dataset_name || 'Custom Dataset'}.csv`, { 
              type: 'text/csv'
            });
            
            // Set the file upload state
            setFileUpload({
              file: mockFile,
              status: 'success'
            });
            
            // Set dataset info from session
            if (dataset_name || dataset_description) {
              setDatasetDescription({
                name: dataset_name || 'Custom Dataset',
                description: dataset_description || 'Custom dataset'
              });
            }
          }
        } else {
          // Using default dataset, clear file upload state
        setFileUpload(null);
          localStorage.removeItem('lastUploadedFile');
          if (lastUploadedFileRef.current) {
            lastUploadedFileRef.current = null;
          }
        }
      })
      .catch(error => {
        console.error('Failed to get session info:', error);
      });
    }
  }, [sessionId]);

  // Modify the existing useEffect to avoid overriding our new chat switch handler
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined' && !fileUpload) {
      const savedFile = localStorage.getItem('lastUploadedFile');
      if (savedFile && lastUploadedFileRef.current !== savedFile) {
        try {
          lastUploadedFileRef.current = savedFile; // Save current value
          const fileInfo = JSON.parse(savedFile);
          // Create a mock File object for display purposes
          const mockFile = new File([""], fileInfo.name, { 
            type: fileInfo.type,
            lastModified: fileInfo.lastModified
          });
          
          setFileUpload({
            file: mockFile,
            status: 'success'
          });
        } catch (error) {
          console.error("Error restoring file info:", error);
          localStorage.removeItem('lastUploadedFile');
        }
      } else if (lastUploadedFileRef.current && !savedFile) {
        // If we had a value before but it's gone now, clear the state
        lastUploadedFileRef.current = null;
        setFileUpload(null);
      }
    }
  }, [fileUpload]);

  // Check if there's a custom dataset in the session when component mounts
  useEffect(() => {
    const checkSessionDataset = async () => {
      if (sessionId) {
        try {
          const response = await axios.get(`${PREVIEW_API_URL}/api/session-info`, {
            headers: {
              'X-Session-ID': sessionId,
            }
          });
          
          // If we have a custom dataset on the server
          if (response.data && response.data.is_custom_dataset) {
            const customName = response.data.dataset_name || 'Custom Dataset';
            const hasLocalStorageFile = localStorage.getItem('lastUploadedFile');
            
            // If UI doesn't show a custom dataset but server has one
            if (!fileUpload && hasLocalStorageFile) {
              try {
                const fileInfo = JSON.parse(hasLocalStorageFile);
                // Create a mock File object for display purposes
                const mockFile = new File([""], fileInfo.name, { 
                  type: fileInfo.type,
                  lastModified: fileInfo.lastModified
                });
                
                setFileUpload({
                  file: mockFile,
                  status: 'success'
                });
              } catch (error) {
                console.error("Error restoring file info:", error);
                localStorage.removeItem('lastUploadedFile');
              }
            } else if (!fileUpload && !hasLocalStorageFile) {
              // UI shows no custom dataset, but server has one, and no localStorage
              
              // Create a mock File object just for display purposes
              const mockFile = new File([""], `${customName}.csv`, { type: 'text/csv' });
              
              // Set the file upload state but also show the reset dialog
              setFileUpload({
                file: mockFile,
                status: 'success'
              });
              
              // Show the dataset reset popup to get user consent
              setDatasetMismatch(true);
              // setShowDatasetResetPopup(true);
            }
          } else if (fileUpload && fileUpload.status === 'success') {
            // The UI shows a custom dataset, but the server says we're using the default
            // This means there's a mismatch - the session was reset on the server side
            setDatasetMismatch(true);
            setShowDatasetResetPopup(true);
          } else {
            // Clear any file upload state since we're using the default dataset
            setFileUpload(null);
            localStorage.removeItem('lastUploadedFile');
          }
        } catch (error) {
          console.error("Error checking session dataset in ChatInput:", error);
        }
      }
    };
    
    checkSessionDataset();
  }, [sessionId]);

  // Store uploaded file info in localStorage to persist across page refreshes
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      if (fileUpload && fileUpload.status === 'success') {
        // Save file info to localStorage
        const fileInfo = JSON.stringify({
          name: fileUpload.file.name,
          type: fileUpload.file.type,
          lastModified: fileUpload.file.lastModified
        });
        
        // Update localStorage and our ref to avoid triggering our own listener
        localStorage.setItem('lastUploadedFile', fileInfo);
        lastUploadedFileRef.current = fileInfo;
      }
    }
  }, [fileUpload]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !isLoading && !disabled) {
      // Store the current timestamp when sending a message
      const messageTimestamp = new Date().toISOString()
      
      // Add a data attribute to track this message for correlation with the AI response
      const messageData = {
        text: message.trim(),
        timestamp: messageTimestamp
      }
      
      // Pass the additional metadata to help with message correlation
      onSendMessage(message.trim())
      
      setMessage("")
      if (inputRef.current) {
        inputRef.current.style.height = "auto"
      }
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Clear any existing error notifications
      setErrorNotification(null);
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }      
      
      // Check file type before proceeding
      const isCSVByExtension = file.name.toLowerCase().endsWith('.csv');
      const isCSVByType = file.type === 'text/csv' || file.type === 'application/csv';
      const isExcelByExtension = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
      const isExcelByType = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                            file.type === 'application/vnd.ms-excel';
      
      if (!isCSVByExtension && !isExcelByExtension && (!isCSVByType && !isExcelByType && file.type !== '')) {
        setFileUpload({ 
          file, 
          status: 'error', 
          errorMessage: 'Please upload a CSV or Excel file only' 
        });
        
        // Show error notification instead of just file error
        setErrorNotification({
          message: 'Invalid file format',
          details: 'Please upload a CSV or Excel file only. Other file formats are not supported.'
        });
        
        errorTimeoutRef.current = setTimeout(() => {
          setFileUpload(null);
          localStorage.removeItem('lastUploadedFile');
          setErrorNotification(null);
        }, 5000);
        return;
      }
      
      // Always completely reset previous file state when a new file is selected
      // This ensures we don't reuse any previous upload state
      setFileUpload(null);
      localStorage.removeItem('lastUploadedFile');
      
      // Set to loading state with new file
      setFileUpload({ 
        file, 
        status: 'loading',
        isExcel: isExcelByExtension || isExcelByType
      });
      
      try {
        // Mark that we've shown the popup to prevent it from appearing after upload
        popupShownForChatIdsRef.current = new Set();
        
        // If it's an Excel file, get the sheets first
        if (isExcelByExtension || isExcelByType) {
          try {
            // Create form data with just the file for the sheet list request
            const formData = new FormData();
            formData.append('file', file);
            
            // Get sheet names from the backend
            const sheetsResponse = await axios.post(`${PREVIEW_API_URL}/api/excel-sheets`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
                ...(sessionId && { 'X-Session-ID': sessionId }),
              },
            });
            
            if (sheetsResponse.data && sheetsResponse.data.sheets && sheetsResponse.data.sheets.length > 0) {
              // Update file upload state with sheets and select the first one by default
              setFileUpload(prev => prev ? { 
                ...prev, 
                sheets: sheetsResponse.data.sheets,
                selectedSheet: sheetsResponse.data.sheets[0],
                status: 'success'
              } : null);
              
              // Show sheet selection dialog instead of immediately previewing
              setShowSheetSelector(true);
            } else {
              throw new Error("No sheets found in Excel file");
            }
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            setFileUpload(prev => prev ? { 
              ...prev, 
              status: 'error', 
              errorMessage: `Excel error: ${errorMessage}` 
            } : null);
            
            setErrorNotification({
              message: 'Excel processing failed',
              details: errorMessage
            });
            
            errorTimeoutRef.current = setTimeout(() => {
              setFileUpload(null);
              localStorage.removeItem('lastUploadedFile');
              setErrorNotification(null);
            }, 5000);
          }
        } else {
          // For CSV files, continue with the existing flow
          await handleFilePreview(file, true);
          setFileUpload(prev => prev ? { ...prev, status: 'success' } : null);
        }
      } catch (error) {
        const errorMessage = getErrorMessage(error)
        setFileUpload(prev => prev ? { ...prev, status: 'error', errorMessage } : null)
        
        // Show detailed error notification
        setErrorNotification({
          message: 'File upload failed',
          details: errorMessage
        });
        
        errorTimeoutRef.current = setTimeout(() => {
          setFileUpload(null);
          localStorage.removeItem('lastUploadedFile');
          setErrorNotification(null);
        }, 5000);
      }
    }
  }

  const handleFilePreview = async (file: File, isNewDataset = false) => {
    // Clear any existing error notifications
    setErrorNotification(null);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    
    if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
      try {
        // Save the current description in case we need to restore it
        const savedDescription = datasetDescription?.description || '';
        const isCustomDescription = savedDescription !== 'Preview dataset' && savedDescription !== '';
        
        // For new dataset uploads, always use a placeholder guidance text
        // instead of reusing previous descriptions
        const useGuidancePlaceholder = isNewDataset || !isCustomDescription;
        
        // First reset the session on the backend to clear any previous dataset state
        if (sessionId) {
          try {
            await axios.post(`${PREVIEW_API_URL}/reset-session`, null, {
              headers: {
                'X-Session-ID': sessionId,
              },
            });
            
            // Reset the popup shown flags to ensure we show the popup for this new dataset state
            popupShownForChatIdsRef.current = new Set();
          } catch (resetError) {
            console.error('Failed to reset session before upload:', resetError);
            // Continue with upload anyway
          }
        }

        // Always do a fresh upload for new files
        const formData = new FormData();
        formData.append('file', file);
        
        // Use appropriate description based on whether this is a new dataset
        const existingDescription = useGuidancePlaceholder
          ? 'Please describe what this dataset contains and its purpose'
          : savedDescription;
        
        // Use the file name without extension as the dataset name
        const tempName = file.name.replace('.csv', '');
        
        // Add required fields
        formData.append('name', tempName);
        formData.append('description', existingDescription);
        
        // Upload the file
        try {
          const uploadResponse = await axios.post(`${PREVIEW_API_URL}/upload_dataframe`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'X-Force-Refresh': 'true', // Add this to signal a complete refresh
              ...(sessionId && { 'X-Session-ID': sessionId }),
            },
          });
          
          const previewSessionId = uploadResponse.data.session_id || sessionId;
          
          // Capture the dataset upload ID if available
          const datasetUploadId = uploadResponse.data.dataset_upload_id;
          
          // Update FileUpload state with the dataset upload ID
          if (datasetUploadId) {
            setFileUpload(prev => prev ? { ...prev, dataset_upload_id: datasetUploadId } : null);
          }
          
          // Then request a preview using the session ID
          const previewResponse = await axios.post(`${PREVIEW_API_URL}/api/preview-csv`, null, {
            headers: {
              ...(previewSessionId && { 'X-Session-ID': previewSessionId }),
            },
          });
          
          
          // Extract all fields including name and description
          const { headers, rows, name, description } = previewResponse.data;
          
          // For new datasets, always use the placeholder guidance text
          const descriptionToUse = isNewDataset
            ? 'Please describe what this dataset contains and its purpose'
            : (isCustomDescription ? savedDescription : (description || existingDescription));
          
          // Store both in filePreview and datasetDescription
          setFilePreview({ 
            headers, 
            rows, 
            name: name || tempName,
            description: descriptionToUse
          });
          
          // Sync the datasetDescription state with the same values
          setDatasetDescription({ 
            name: name || tempName, 
            description: descriptionToUse
          });
          
          setShowPreview(true);
          
          // If we got a new session ID from the upload, save it
          if (uploadResponse.data.session_id) {
            setSessionId(uploadResponse.data.session_id);
          }
          
          // Auto-generate description for new datasets if the description is the placeholder
          if (isNewDataset && 
              (descriptionToUse === 'Please describe what this dataset contains and its purpose' || 
               !descriptionToUse)) {
            // Wait a brief moment to ensure session is ready
            setTimeout(() => {
              generateDatasetDescription();
            }, 300);
          }
        } catch (error: any) {
          // Handle upload errors
          console.error('Upload error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          });
          
          // Set error notification with detailed information
          setErrorNotification({
            message: 'File preview failed',
            details: getErrorMessage(error)
          });
          
          // Set file upload to error state
          setFileUpload(prev => prev ? { 
            ...prev, 
            status: 'error', 
            errorMessage: getErrorMessage(error)
          } : null);
          
          errorTimeoutRef.current = setTimeout(() => {
            setErrorNotification(null);
          }, 5000);
          
          throw error;
        }
      } catch (error) {
        console.error('Failed to preview file:', error);
        // Set error notification with detailed information
        setErrorNotification({
          message: 'File preview failed',
          details: getErrorMessage(error)
        });
        
        // Set file upload to error state
        setFileUpload(prev => prev ? { 
          ...prev, 
          status: 'error', 
          errorMessage: getErrorMessage(error) 
        } : null);
        
        errorTimeoutRef.current = setTimeout(() => {
          setErrorNotification(null);
        }, 5000);
      }
    } else {
      // Set error notification with detailed information
      setErrorNotification({
        message: 'Invalid file format',
        details: 'Please upload a CSV file. Other file formats are not supported.'
      });
      
      // Set file upload to error state
      setFileUpload(prev => prev ? { 
        ...prev, 
        status: 'error', 
        errorMessage: 'Please upload a CSV file only' 
      } : null);
      
      errorTimeoutRef.current = setTimeout(() => {
        setErrorNotification(null);
      }, 5000);
    }
  }

  const getErrorMessage = (error: any): string => {
    if (axios.isAxiosError(error)) {
      // Detailed Axios error handling
      if (error.response?.status === 413) return "File too large. Please upload a smaller file."
      if (error.response?.status === 415) return "Invalid file type. Please upload a CSV file."
      if (error.response?.status === 400 && error.response?.data?.detail) {
        // Extract and format detailed validation errors
        const detail = error.response.data.detail;
        if (typeof detail === 'string') return detail;
        if (Array.isArray(detail)) {
          return detail.map(err => err.msg || err.message || String(err)).join('. ');
        }
        if (typeof detail === 'object') {
          return Object.entries(detail)
            .map(([key, value]) => `${key}: ${value}`)
            .join('. ');
        }
        return JSON.stringify(detail);
      }
      if (error.response?.data?.message) return error.response.data.message;
      if (error.response?.data?.error) return error.response.data.error;
      if (error.message) return error.message;
    }
    if (error instanceof Error) return error.message;
    return "Upload failed. Please try again.";
  }

  const clearFile = () => {
    setFileUpload(null)
    localStorage.removeItem('lastUploadedFile');
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Agent suggestions logic is now handled by the AgentSuggestions component

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setMessage(value)
    setCursorPosition(e.target.selectionStart || 0)
    
    // Check for command suggestions when user types "/" at the beginning
    if (value.startsWith('/') && !value.includes('@')) {
      setCommandQuery(value)
      setShowCommandSuggestions(true)
    } else {
      setShowCommandSuggestions(false)
      setCommandQuery('')
    }
    
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`
    }
  }

  const handleAgentSelect = (agentName: string) => {
    const beforeCursor = message.slice(0, cursorPosition)
    const afterCursor = message.slice(cursorPosition)
    const lastAtIndex = beforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      // Replace just the agent mention part
      const newMessage = 
        message.slice(0, lastAtIndex + 1) + 
        agentName + ' ' +  // Add a space after the agent name
        afterCursor
      
      setMessage(newMessage)
      
      // Move cursor after the inserted agent name and space
      const newCursorPos = lastAtIndex + agentName.length + 2
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
        }
      }, 0)
    }
  }

  const handleCommandSelect = (command: any) => {
    setShowCommandSuggestions(false)
    setCommandQuery('')
    
    if (command.id === 'deep-analysis') {
      // Show deep analysis sidebar in expanded state
      setShouldForceExpanded(true)
      setShowDeepAnalysisSidebar(true)
      setMessage('')
      // Reset force expanded after a brief moment
      setTimeout(() => setShouldForceExpanded(false), 100)
    } else if (command.id === 'custom-agents') {
      // Show custom agents sidebar in expanded state
      setShouldForceExpanded(true)
      setShowTemplatesSidebar(true)
      setMessage('')
      // Reset force expanded after a brief moment
      setTimeout(() => setShouldForceExpanded(false), 100)
    } else {
      // For other commands, replace the "/" with the command
      setMessage(`${command.name} `)
      // Focus back to input
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }

  const getPlaceholderText = () => {
    if (isLoading) return "Please wait..."
    if (isChatBlocked) return "You've used all your tokens for this month"
    if (disabled) return "Free trial used. Please sign in to continue."
    return "Type your message here..."
  }

  const handleAcceptCookies = () => {
    setConsent(true)
    handleSubmit(new Event('submit') as any)
  }

  const shouldShowCookieConsent = () => {
    const isAuthenticated = session || localStorage.getItem('isAdmin') === 'true'
    if (isAuthenticated) {
      // Auto-accept cookies for authenticated users
      if (!hasConsented) {
        setConsent(true)
      }
      return false
    }
    return !hasConsented // Show consent only for non-authenticated users who haven't consented
  }

  const getStatusIcon = (status: FileUpload['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
      case 'success':
        return <CheckCircle2 className="w-3 h-3 text-green-600" />
      case 'error':
        return <XCircle className="w-3 h-3 text-red-600" />
    }
  }

  const handlePreviewDefaultDataset = async () => {
    try {
      // Remove any existing file info first to prevent conflicts
      setFileUpload(null);
      localStorage.removeItem('lastUploadedFile');
      if (lastUploadedFileRef) {
        lastUploadedFileRef.current = null;
      }
      
      // Clear the file input too
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      // Reset the popup shown flags when switching to default dataset
      popupShownForChatIdsRef.current = new Set();
      
      // First force a reset on the backend to ensure we're truly using the default dataset
      try {
        await axios.post(`${PREVIEW_API_URL}/reset-session`, null, {
          headers: {
            ...(sessionId && { 'X-Session-ID': sessionId }),
          },
        });
      } catch (resetError) {
        console.error('Failed to reset session for default dataset:', resetError);
        // Continue anyway
      }
      
      // This will now also ensure we're using the default dataset
      const response = await axios.get(`${PREVIEW_API_URL}/api/default-dataset`, {
        headers: {
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
      });
      
      // For default dataset, use the description provided by the backend
      const defaultDescription = response.data.description || 'Default housing dataset containing information about residential properties';
      
      setFilePreview({
        headers: response.data.headers,
        rows: response.data.rows,
        name: response.data.name,
        description: defaultDescription
      });
      
      // Pre-fill the name and description
      setDatasetDescription({
        name: response.data.name || 'Dataset',
        description: defaultDescription
      });
      
      setShowPreview(true);
      
      // If we got a session ID, save it
      if (response.data.session_id) {
        setSessionId(response.data.session_id);
      }
      
      // Clear any dataset-related UI elements
      setDatasetMismatch(false);
      setShowDatasetResetPopup(false);
      
    } catch (error) {
      console.error('Failed to fetch dataset preview:', error);
    }
  };

  const handleSilentDefaultDataset = async () => {
    try {
      // Remove any existing file info first to prevent conflicts
      setFileUpload(null);
      localStorage.removeItem('lastUploadedFile');
      if (lastUploadedFileRef) {
        lastUploadedFileRef.current = null;
      }
      
      // Clear the file input too
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      // Reset the popup shown flags when switching to default dataset
      popupShownForChatIdsRef.current = new Set();
      
      // First force a reset on the backend to ensure we're truly using the default dataset
      try {
        await axios.post(`${PREVIEW_API_URL}/reset-session`, null, {
          headers: {
            ...(sessionId && { 'X-Session-ID': sessionId }),
          },
        });
      } catch (resetError) {
        console.error('Failed to silently reset session for default dataset:', resetError);
        // Continue anyway
      }
      
      // Load default dataset without showing preview
      const response = await axios.get(`${PREVIEW_API_URL}/api/default-dataset`, {
        headers: {
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
      });
      
      // Store dataset info but don't show preview UI
      const defaultDescription = response.data.description || 'Default housing dataset containing information about residential properties';
      
      // Prepare preview data but don't show the dialog
      setFilePreview({
        headers: response.data.headers,
        rows: response.data.rows,
        name: response.data.name,
        description: defaultDescription
      });
      
      // Pre-fill the name and description
      setDatasetDescription({
        name: response.data.name || 'Dataset',
        description: defaultDescription
      });
      
      // Don't set showPreview to true here
      
      // If we got a session ID, save it
      if (response.data.session_id) {
        setSessionId(response.data.session_id);
      }
      
      // Clear any dataset-related UI elements
      setDatasetMismatch(false);
      setShowDatasetResetPopup(false);
      
    } catch (error) {
      console.error('Failed to silently load default dataset:', error);
    }
  };

  const handleUploadWithDescription = async () => {
    if (!datasetDescription.name || !datasetDescription.description) {
      // Use error notification instead of alert
      setErrorNotification({
        message: 'Missing information',
        details: 'Please provide both a name and description for the dataset'
      });
      
      errorTimeoutRef.current = setTimeout(() => {
        setErrorNotification(null);
      }, 5000);
      return;
    }

    try {
      // Clear any existing error notifications
      setErrorNotification(null);
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      
      
      // Try to get the actual file from the file input ref first (most reliable source)
      const actualFile = fileInputRef.current?.files?.[0] || (fileUpload?.file || null);
      
      if (actualFile) {
        
        
        // Only check for mock files in specific cases when we know it was created programmatically
        // This avoids incorrectly flagging legitimate small files
        const isMockFile = actualFile.size === 0 && 
                         !fileInputRef.current?.files?.length && 
                         !actualFile.lastModified;
        
        if (isMockFile) {
          // This is likely a mock file created from localStorage after a page refresh
          // We can't upload it as-is
          alert("Please select your dataset file again to upload it");
          
          // Clear the file upload state before asking for a new file
          setFileUpload(null);
          localStorage.removeItem('lastUploadedFile');
          
          // Clear the file input so user can select again
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
            setTimeout(() => {
              fileInputRef.current?.click();
            }, 100);
          }
          
          // Close the preview dialog
          setShowPreview(false);
          return;
        }
        
        // First reset the session on the backend to ensure a clean slate
        if (sessionId) {
          try {
            await axios.post(`${PREVIEW_API_URL}/reset-session`, null, {
              headers: {
                'X-Session-ID': sessionId,
              },
            });
            
            // Reset the popup shown flags for the new dataset state
            popupShownForChatIdsRef.current = new Set();
          } catch (resetError) {
            console.error('Failed to reset session before final upload:', resetError);
            // Continue with upload anyway
          }
        }
        
        // Save a local copy of the description to ensure we maintain it
        const finalDescription = datasetDescription.description;
        
        // Check if this is an Excel file
        const isExcelFile = fileUpload?.isExcel || 
                        actualFile.name.toLowerCase().endsWith('.xlsx') || 
                        actualFile.name.toLowerCase().endsWith('.xls');
        
        // Build form data for the fresh upload
        let formData = new FormData();
        formData.append('file', actualFile);
        formData.append('name', datasetDescription.name);
        formData.append('description', finalDescription);
        
        // Add sheet name if this is an Excel file
        if (isExcelFile && fileUpload?.selectedSheet) {
          formData.append('sheet_name', fileUpload.selectedSheet);
        }

        try {
          // Use the appropriate endpoint based on file type
          const endpoint = isExcelFile ? `${PREVIEW_API_URL}/upload_excel` : `${PREVIEW_API_URL}/upload_dataframe`;
          
          const response = await axios.post(endpoint, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'X-Force-Refresh': 'true',
              ...(sessionId && { 'X-Session-ID': sessionId }),
            },
          });

          if (response.status === 200) {
            if (response.data.session_id) {
              setSessionId(response.data.session_id);
            }
            // Close the preview dialog
            setShowPreview(false);
            
            // Show success message
            setUploadSuccess(true);
            setTimeout(() => {
              setUploadSuccess(false);
            }, 3000);
          }
        } catch (error: any) {
          console.error('Final upload error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          });
          alert(`Upload failed: ${error.response?.data?.detail || error.message}`);
          throw error;
        }
      } else {
        // For default dataset, just update the session with the new description
        const response = await axios.post(`${PREVIEW_API_URL}/reset-session`, {
          name: datasetDescription.name,
          description: datasetDescription.description
        }, {
          headers: {
            ...(sessionId && { 'X-Session-ID': sessionId }),
          },
        });

        if (response.status === 200) {
          if (response.data.session_id) {
            setSessionId(response.data.session_id);
          }
          
          // Close the preview dialog
          setShowPreview(false);
          
          // Show success message
          setUploadSuccess(true);
          setTimeout(() => {
            setUploadSuccess(false);
          }, 3000);
          
          // Reset popup shown flags for new dataset state
          popupShownForChatIdsRef.current = new Set();
        }
      }
      
      // Only update fileUpload state after successful upload
      setShowPreview(false);
      setUploadSuccess(true);
      if (actualFile) {
        // Create a new File object with the updated name but preserve other properties
        // Add appropriate extension if not present in the new name
        let updatedFileName = datasetDescription.name;
        const isExcelFile = fileUpload?.isExcel || 
                        actualFile.name.toLowerCase().endsWith('.xlsx') || 
                        actualFile.name.toLowerCase().endsWith('.xls');
        
        if (isExcelFile) {
          // For Excel files with sheet selection, we're converting to CSV
          if (!updatedFileName.endsWith('.csv')) {
            updatedFileName = `${updatedFileName}.csv`;
          }
        } else if (!updatedFileName.endsWith('.csv')) {
          updatedFileName = `${updatedFileName}.csv`;
        }
          
        const updatedFile = new File(
          [actualFile], 
          updatedFileName,
          { type: 'text/csv', lastModified: actualFile.lastModified }
        );
        
        setFileUpload({
          file: updatedFile,
          status: 'success',
          // Keep Excel metadata for reference even though we converted to CSV
          isExcel: isExcelFile,
          sheets: fileUpload?.sheets,
          selectedSheet: fileUpload?.selectedSheet
        });
      
        // Save to localStorage after successful upload to persist across refreshes
        localStorage.setItem('lastUploadedFile', JSON.stringify({
          name: updatedFileName,
          type: 'text/csv',
          lastModified: actualFile.lastModified,
          isExcel: isExcelFile,
          selectedSheet: fileUpload?.selectedSheet
        }));
      }
      
      // Don't reset the description here to preserve it
      // setDatasetDescription({ name: '', description: '' });
      
      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to process dataset:', error);
      alert('Failed to process dataset. Please try again.');
    }
  }

  // Helper function to determine if input should be fully disabled
  const isInputDisabled = () => {
    if (isChatBlocked) {
      logger.log("[ChatInput] Input disabled due to insufficient credits");
      return true;
    }
    return disabled || isLoading || false;
  }

  // Get the appropriate reset date from Redis or fall back to first day of next month
  const getResetDate = () => {
    // Log the raw value for debugging
    logger.log(`[ChatInput] Credit reset date from context: ${creditResetDate}`);
    
    // Use the actual reset date from Redis if available
    if (creditResetDate) {
      try {
        // If it's the "Check accounts page" string, format it better for the sentence
        if (creditResetDate === "Check accounts page") {
          return "the next billing cycle (check accounts page for details)";
        }
        
        const resetDate = new Date(creditResetDate);
        if (!isNaN(resetDate.getTime())) {
          return resetDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        }
      } catch (error) {
        console.error('[ChatInput] Error parsing reset date:', error);
      }
    }
    
    // Fall back to a clearer message if no date from Redis or invalid date
    logger.log('[ChatInput] No valid reset date from Redis, using fallback message');
    return "the next billing cycle (check accounts page for details)";
  }

  // Add a function to generate dataset description automatically
  const generateDatasetDescription = async () => {
    if (!sessionId) return;
    
    try {
      // Set generation in progress state
      setIsGeneratingDescription(true);
      
      setDatasetDescription(prev => ({
        ...prev, 
        description: "Generating description..."
      }));
      
      // Get the current user-written description if it exists
      const currentDescription = datasetDescription.description;
      const existingDescription = currentDescription && 
                                 currentDescription !== "Generating description..." && 
                                 currentDescription !== "Preview dataset";
      
      const response = await axios.post(`${PREVIEW_API_URL}/create-dataset-description`, {
        sessionId: sessionId,
        existingDescription: existingDescription
      });
      
      if (response.data && response.data.description) {
        setDatasetDescription(prev => ({
          ...prev,
          description: response.data.description
        }));
      }
    } catch (error) {
      console.error("Failed to generate description:", error);
      setDatasetDescription(prev => ({
        ...prev,
        description: prev.description === "Generating description..." ? "" : prev.description
      }));
    } finally {
      // Clear generation in progress state
      setIsGeneratingDescription(false);
    }
  };

  // Add handler for dataset reset confirmation
  const handleDatasetReset = async (keepCustomData: boolean) => {
    if (keepCustomData && fileUpload && fileUpload.file) {
      // Check if this is likely a mock file (zero size)
      const isMockFile = fileUpload.file.size === 0;
      
      if (isMockFile) {
        // First clear existing file state
        setFileUpload(null);
        localStorage.removeItem('lastUploadedFile');
        
        // If we have a file input reference, clear it and trigger a click
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
          
          // Close the dataset reset popup first
          setShowDatasetResetPopup(false);
          setDatasetMismatch(false);
          
          // Wait a moment then trigger file selection
          setTimeout(() => {
            if (fileInputRef.current) {
              fileInputRef.current.click();
            }
          }, 100);
        } else {
          // If we can't access the file input, show the preview dialog
          setShowPreview(true);
          
          // Pre-fill the name from the file
          setDatasetDescription({
            name: fileUpload.file.name.replace('.csv', ''),
            description: 'Please provide a description for your dataset'
          });
          
          // Close the dataset reset popup
          setShowDatasetResetPopup(false);
          setDatasetMismatch(false);
        }
      } else {
        // This is a real file, we can try to show the preview directly
        try {
          await handleFilePreview(fileUpload.file);
          
          // Close the dataset reset popup
          setShowDatasetResetPopup(false);
          setDatasetMismatch(false);
        } catch (error) {
          console.error("Failed to preview dataset:", error);
          
          // Clear the file upload state if preview fails
          setFileUpload(null);
          localStorage.removeItem('lastUploadedFile');
          
          // Close the dataset reset popup
          setShowDatasetResetPopup(false);
          setDatasetMismatch(false);
          
          // Show an error message
          alert("Failed to preview dataset. Please select your file again.");
        }
      }
    } else {
      // User chose to reset, clear the file upload state
      setFileUpload(null);
      localStorage.removeItem('lastUploadedFile');
      
      // Show default dataset preview
      handlePreviewDefaultDataset();
      
      // Close the popup
      setShowDatasetResetPopup(false);
      setDatasetMismatch(false);
    }
    
    // Reset the popup shown flags to ensure we ask for each chat with the
    // new dataset state (whether it's default or custom)
    popupShownForChatIdsRef.current = new Set();
  };

  // Add new function to handle Excel sheet selection and preview
  const handleExcelSheetPreview = async (file: File, sheetName: string, isNewDataset = false) => {
    // Clear any existing error notifications
    setErrorNotification(null);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    
    try {
      // Save the current description in case we need to restore it
      const savedDescription = datasetDescription?.description || '';
      const isCustomDescription = savedDescription !== 'Preview dataset' && savedDescription !== '';
      
      // For new dataset uploads, always use a placeholder guidance text
      // instead of reusing previous descriptions
      const useGuidancePlaceholder = isNewDataset || !isCustomDescription;
      
      // First reset the session on the backend to clear any previous dataset state
      if (sessionId) {
        try {
          await axios.post(`${PREVIEW_API_URL}/reset-session`, null, {
            headers: {
              'X-Session-ID': sessionId,
            },
          });
          logger.log('Session reset before new Excel sheet preview');
          
          // Reset the popup shown flags to ensure we show the popup for this new dataset state
          popupShownForChatIdsRef.current = new Set();
        } catch (resetError) {
          console.error('Failed to reset session before Excel preview:', resetError);
          // Continue with upload anyway
        }
      }

      // Always do a fresh upload for new files
      logger.log('Uploading Excel file and getting preview...', file.name, file.size, file.type, 'sheet:', sheetName);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheet_name', sheetName);
      
      // Use appropriate description based on whether this is a new dataset
      const existingDescription = useGuidancePlaceholder
        ? 'Please describe what this dataset contains and its purpose'
        : savedDescription;
      
      // Use the file name without extension plus sheet name as the dataset name
      const baseFileName = file.name.replace(/\.(xlsx|xls)$/i, '');
      const tempName = `${baseFileName} - ${sheetName}`;
      
      // Add required fields
      formData.append('name', tempName);
      formData.append('description', existingDescription);
      
      logger.log('FormData prepared for Excel:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        sheetName: sheetName,
        name: tempName,
        description: existingDescription,
        isNewDataset: isNewDataset
      });
      
      // Upload the file with sheet selection
      try {
        const uploadResponse = await axios.post(`${PREVIEW_API_URL}/upload_excel`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-Force-Refresh': 'true', // Add this to signal a complete refresh
            ...(sessionId && { 'X-Session-ID': sessionId }),
          },
        });
        
        logger.log('Excel upload response:', uploadResponse.data);
        const previewSessionId = uploadResponse.data.session_id || sessionId;
        
        // Capture the dataset upload ID if available
        const datasetUploadId = uploadResponse.data.dataset_upload_id;
        
        // Update FileUpload state with the dataset upload ID
        if (datasetUploadId) {
          setFileUpload(prev => prev ? { 
            ...prev, 
            selectedSheet: sheetName,
            dataset_upload_id: datasetUploadId,
            status: 'success'
          } : null);
        } else {
          setFileUpload(prev => prev ? { 
            ...prev, 
            selectedSheet: sheetName,
            status: 'success'
          } : null);
        }
        
        // Update file upload state with the selected sheet
        setFileUpload(prev => prev ? { 
          ...prev, 
          selectedSheet: sheetName,
          status: 'success'
        } : null);
        
        // Then request a preview using the session ID
        const previewResponse = await axios.post(`${PREVIEW_API_URL}/api/preview-csv`, null, {
          headers: {
            ...(previewSessionId && { 'X-Session-ID': previewSessionId }),
          },
        });
        
        logger.log('Preview response for Excel sheet:', previewResponse.data);
        
        // Extract all fields including name and description
        const { headers, rows, name, description } = previewResponse.data;
        
        // For new datasets, always use the placeholder guidance text
        const descriptionToUse = isNewDataset
          ? 'Please describe what this dataset contains and its purpose'
          : (isCustomDescription ? savedDescription : (description || existingDescription));
        
        // Store both in filePreview and datasetDescription
        setFilePreview({ 
          headers, 
          rows, 
          name: name || tempName,
          description: descriptionToUse
        });
        
        // Sync the datasetDescription state with the same values
        setDatasetDescription({ 
          name: name || tempName, 
          description: descriptionToUse
        });
        
        setShowPreview(true);
        
        // If we got a new session ID from the upload, save it
        if (uploadResponse.data.session_id) {
          setSessionId(uploadResponse.data.session_id);
        }
        
        // Auto-generate description for new datasets if the description is the placeholder
        if (isNewDataset && 
            (descriptionToUse === 'Please describe what this dataset contains and its purpose' || 
             !descriptionToUse)) {
          // Wait a brief moment to ensure session is ready
          setTimeout(() => {
            generateDatasetDescription();
          }, 300);
        }
      } catch (error: any) {
        // Handle upload errors
        console.error('Excel upload error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        
        // Set error notification with detailed information
        setErrorNotification({
          message: 'Excel file preview failed',
          details: getErrorMessage(error)
        });
        
        // Set file upload to error state
        setFileUpload(prev => prev ? { 
          ...prev, 
          status: 'error', 
          errorMessage: getErrorMessage(error)
        } : null);
        
        errorTimeoutRef.current = setTimeout(() => {
          setErrorNotification(null);
        }, 5000);
        
        throw error;
      }
    } catch (error) {
      console.error('Failed to preview Excel sheet:', error);
      // Set error notification with detailed information
      setErrorNotification({
        message: 'Excel sheet preview failed',
        details: getErrorMessage(error)
      });
      
      // Set file upload to error state
      setFileUpload(prev => prev ? { 
        ...prev, 
        status: 'error', 
        errorMessage: getErrorMessage(error) 
      } : null);
      
      errorTimeoutRef.current = setTimeout(() => {
        setErrorNotification(null);
      }, 5000);
    }
  }

  // Add a function to handle sheet selection confirmation
  const handleSheetSelectionConfirm = async () => {
    if (fileUpload?.file && fileUpload.selectedSheet) {
      try {
        // Set status to loading during preview
        setFileUpload(prev => prev ? {
          ...prev,
          status: 'loading'
        } : null);
        
        // First preview the selected sheet
        await handleExcelSheetPreview(fileUpload.file, fileUpload.selectedSheet, true);
        
        // Set status back to success after preview
        setFileUpload(prev => prev ? {
          ...prev,
          status: 'success'
        } : null);
        
        // Close the sheet selector dialog
        setShowSheetSelector(false);
      } catch (error) {
        console.error('Failed to preview selected sheet:', error);
        
        // Show error notification
        setErrorNotification({
          message: 'Sheet preview failed',
          details: getErrorMessage(error)
        });
        
        // Set status to error
        setFileUpload(prev => prev ? {
          ...prev,
          status: 'error',
          errorMessage: getErrorMessage(error)
        } : null);
        
        // Leave the dialog open so user can try another sheet
      }
    }
  }

  return (
    <>
      <div className="relative">
        <div className="bg-white border-t border-gray-200 p-4">
          {shouldShowCookieConsent() ? (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Cookie Consent Required
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  To chat with Auto-Analyst, we need your consent to use cookies for storing chat history and preferences.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleAcceptCookies}
                    className="text-sm bg-[#FF7F7F] text-white px-4 py-2 rounded-md hover:bg-[#FF6666] transition-colors"
                  >
                    Accept & Continue
                  </button>
                  <button
                    onClick={() => setConsent(false)}
                    className="text-sm bg-gray-100 text-gray-600 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Error Notification */}
              <AnimatePresence>
                {errorNotification && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-w-3xl mx-auto mb-2"
                  >
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-red-800">{errorNotification.message}</h4>
                        {errorNotification.details && (
                          <p className="text-xs text-red-700 mt-1">{errorNotification.details}</p>
                        )}
                      </div>
                      <button 
                        onClick={() => setErrorNotification(null)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {uploadSuccess && (
                <div className="max-w-3xl mx-auto mb-2">
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-green-700 text-sm">Dataset uploaded successfully!</span>
                  </div>
                </div>
              )}

              {/* Dataset info and button row */}
              <div className="max-w-3xl mx-auto mb-2 flex flex-wrap items-center gap-2">
                {fileUpload && (
                  <div 
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
                      fileUpload.status === 'error' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    {getStatusIcon(fileUpload.status)}
                    <div className="flex flex-col">
                      <div className="flex items-center max-w-[200px] hover:max-w-xs transition-all duration-300">
                        <span className="text-blue-700 font-medium truncate">
                          {fileUpload.file.name}
                        </span>
                        {fileUpload.isExcel && fileUpload.selectedSheet && (
                          <span className="ml-1 text-blue-500 font-normal whitespace-nowrap">
                            {fileUpload.selectedSheet}
                          </span>
                        )}
                      </div>
                      {fileUpload.status === 'error' && fileUpload.errorMessage && (
                        <span className="text-red-600">
                          • {fileUpload.errorMessage}
                        </span>
                      )}
                      {fileUpload.dataset_upload_id && fileUpload.status === 'success' && (
                        <DatasetUploadInfo uploadId={fileUpload.dataset_upload_id} />
                      )}
                    </div>
                    {fileUpload.status === 'success' && (
                      <div className="flex items-center gap-1 ml-auto">
                        {fileUpload.isExcel && fileUpload.sheets && fileUpload.sheets.length > 0 && (
                          <button
                            onClick={() => setShowSheetSelector(true)}
                            className="px-2 py-0.5 text-xs bg-white rounded border border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            Change
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            // Save the current description before preview
                            const currentDescription = datasetDescription?.description || '';
                            
                            if (fileUpload.isExcel && fileUpload.selectedSheet) {
                              // For Excel files, preview the selected sheet
                              handleExcelSheetPreview(fileUpload.file, fileUpload.selectedSheet, false)
                                .then(() => {
                                  // After preview, if description was reset, restore our saved one
                                  if ((datasetDescription?.description === 'Preview dataset' || 
                                      datasetDescription?.description !== currentDescription) && 
                                      currentDescription && 
                                      currentDescription !== 'Preview dataset' &&
                                      currentDescription !== 'Please describe what this dataset contains and its purpose') {
                                    logger.log('Restoring dataset description:', currentDescription);
                                    setDatasetDescription(prev => ({
                                      ...prev,
                                      description: currentDescription
                                    }));
                                  }
                                })
                                .catch(error => {
                                  console.error('Failed to preview Excel file:', error);
                                });
                            } else {
                              // For CSV files, continue with the existing flow
                              handleFilePreview(fileUpload.file, false)
                                .then(() => {
                                  // After preview, if description was reset, restore our saved one
                                  if ((datasetDescription?.description === 'Preview dataset' || 
                                      datasetDescription?.description !== currentDescription) && 
                                      currentDescription && 
                                      currentDescription !== 'Preview dataset' &&
                                      currentDescription !== 'Please describe what this dataset contains and its purpose') {
                                    logger.log('Restoring dataset description:', currentDescription);
                                    setDatasetDescription(prev => ({
                                      ...prev,
                                      description: currentDescription
                                    }));
                                  }
                                })
                                .catch(error => {
                                  console.error('Failed to preview file:', error);
                                });
                            }
                          }}
                          className="hover:bg-white/50 p-1 rounded-full transition-colors text-blue-500 hover:text-blue-700"
                          title="Preview data"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {!fileUpload && (
                  <button
                    onClick={handlePreviewDefaultDataset}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Preview Default Dataset
                  </button>
                )}
                

                {/* <TemplatesButton
                    onClick={() => {
                      setShouldForceExpanded(true)
                      setShowTemplatesSidebar(true)
                      // Reset force expanded after a brief moment
                      setTimeout(() => setShouldForceExpanded(false), 100)
                    }}
                    userProfile={subscription}
                    showLabel={true}
                    size="sm"
                  />
                 */}

                <DeepAnalysisButton
                  onClick={() => {
                    setShouldForceExpanded(true)
                    setShowDeepAnalysisSidebar(true)
                    // Reset force expanded after a brief moment
                    setTimeout(() => setShouldForceExpanded(false), 100)
                  }}
                  userProfile={subscription}
                  showLabel={true}
                  size="sm"
                  isRunning={deepAnalysisState.isRunning}
                />
                
              </div>

              {/* Show credit exhausted modal when chat is blocked */}
              {isChatBlocked && !showCreditExhaustedModal && (
                <div className="max-w-3xl mx-auto mb-4">
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-[#FF7F7F]/20 rounded-md p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-[#FF7F7F]" />
                      <span className="text-gray-900 font-medium">Credits Required</span>
                    </div>
                    <p className="text-sm text-gray-700 ml-7">
                      You need credits to continue using Auto-Analyst. 
                    </p>
                    <div className="flex gap-3 ml-7">
                      <Button 
                        className="bg-[#FF7F7F] hover:bg-[#FF6666] text-white"
                        onClick={() => setShowCreditExhaustedModal(true)}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        View Options
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Textarea
                      ref={inputRef}
                      value={message}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          // Check if agent suggestions are visible and have a selection
                          const isAgentSuggestionsVisible = !showCommandSuggestions && message.includes('@');
                          
                          if (isAgentSuggestionsVisible && agentSuggestionsHasSelection) {
                            // AgentSuggestions will handle Enter key since it has a selection
                            // Don't preventDefault here - let AgentSuggestions handle it
                            return;
                          }
                          
                          // If no agent suggestions selection, handle normally
                          e.preventDefault()
                          handleSubmit(e)
                        }
                      }}
                      onClick={() => {
                        if (!hasConsented) {
                          setConsent(true)
                        }
                      }}
                      disabled={isInputDisabled()}
                      placeholder={getPlaceholderText()}
                      className={`w-full bg-gray-100 text-gray-900 placeholder-gray-500 border-0 rounded-lg py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-[#FF7F7F] focus:bg-white transition-colors resize-none ${
                        isInputDisabled() ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                      }`}
                      rows={1}
                    />
                    <AnimatePresence>
                      {/* Command Suggestions */}
                      <CommandSuggestions
                        query={commandQuery}
                        isVisible={showCommandSuggestions}
                        onSelectCommand={handleCommandSelect}
                        userProfile={subscription}
                      />
                      
                      {/* Agent Suggestions */}
                      <AgentSuggestions
                        message={message}
                        cursorPosition={cursorPosition}
                        onSuggestionSelect={handleAgentSelect}
                        isVisible={!showCommandSuggestions && message.includes('@')}
                        userId={userId}
                        onStateChange={setAgentSuggestionsHasSelection}
                      />
                    </AnimatePresence>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                        className="hidden" 
                        id="file-upload"
                        accept=".csv,.xlsx,.xls"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer p-2 rounded-full hover:bg-gray-200 transition-colors inline-flex items-center justify-center"
                      >
                        <Paperclip className="w-5 h-5 text-gray-500 hover:text-blue-600 transition-colors" />
                      </label>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: isLoading ? 1 : 1.05 }}
                    whileTap={{ scale: isLoading ? 1 : 0.95 }}
                    type={isLoading ? 'button' : 'submit'}
                    onClick={() => {
                      if (isLoading && onStopGeneration) {
                        onStopGeneration()
                      }
                    }}
                    className={`${
                      isLoading 
                        ? 'bg-red-500 hover:bg-red-600 cursor-pointer' 
                        : isInputDisabled() || !message.trim()
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-[#FF7F7F] hover:bg-[#FF6666]'
                    } text-white p-3 rounded-full transition-colors`}
                  >
                    {isLoading ? (
                      <Square className="w-5 h-5" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </motion.button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
      <AnimatePresence>
        {showPreview && (
          <Dialog 
            open={showPreview} 
            onOpenChange={(open) => {
              // Only allow closing when not generating
              if (!open && !isGeneratingDescription) {
                // When dialog is closed without completing upload
                setShowPreview(false);
                
                // If the dialog is closed without completing upload of a new file,
                // and we don't have a successful upload yet, reset everything
                if (fileUpload?.status !== 'success') {
                  logger.log('Dialog closed without completing upload, resetting state');
                  setFileUpload(null);
                  localStorage.removeItem('lastUploadedFile');
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }
              } else if (!open && isGeneratingDescription) {
                // Prevent dialog from closing during generation
                return false;
              }
            }}
          >
            <DialogContent 
              className="w-[90vw] max-w-4xl h-[90vh] overflow-hidden bg-gray-50 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              onPointerDownOutside={(e) => {
                // Prevent closing when clicking outside during generation
                if (isGeneratingDescription) {
                  e.preventDefault();
                }
              }}
              onEscapeKeyDown={(e) => {
                // Prevent closing with ESC key during generation
                if (isGeneratingDescription) {
                  e.preventDefault();
                }
              }}
            >
              <DialogHeader className="border-b pb-4 bg-gray-50 z-8">
                <DialogTitle className="text-xl text-gray-800">
                  Dataset Details
                </DialogTitle>
                {/* Make close button disabled during generation */}
                <DialogClose 
                  className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground" 
                  disabled={isGeneratingDescription}
                >
                  <span className="sr-only">Close</span>
                </DialogClose>
              </DialogHeader>
              <div className="flex flex-col gap-6 p-4 overflow-y-auto h-[calc(90vh-8rem)]">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      Dataset Name
                    </label>
                    <input
                      type="text"
                      value={datasetDescription.name}
                      onChange={(e) => setDatasetDescription(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7F7F] focus:border-transparent text-gray-800"
                      placeholder="Enter dataset name"
                      disabled={isGeneratingDescription}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      Description
                    </label>
                    <Tabs value={descriptionTab} onValueChange={(value) => setDescriptionTab(value as "edit" | "preview")} className="w-full">
                      <div className="flex justify-between items-center mb-2">
                        <TabsList className="grid grid-cols-2 w-40">
                          <TabsTrigger value="edit" className="flex items-center gap-1">
                            <Edit className="w-3 h-3" />
                            Edit
                          </TabsTrigger>
                          <TabsTrigger value="preview" className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Preview
                          </TabsTrigger>
                        </TabsList>
                        <button
                          type="button"
                          onClick={generateDatasetDescription}
                          className={`px-2 py-1 text-xs font-medium ${
                            isGeneratingDescription 
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } rounded focus:outline-none focus:ring-2 focus:ring-[#FF7F7F]`}
                          disabled={isGeneratingDescription}
                        >
                          {isGeneratingDescription ? 'Generating...' : 'Auto-generate'}
                        </button>
                      </div>
                      <TabsContent value="edit" className="mt-0">
                        <textarea
                          value={datasetDescription.description}
                          onChange={(e) => setDatasetDescription(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7F7F] focus:border-transparent text-gray-800"
                          rows={5}
                          placeholder="Describe what this dataset contains and its purpose"
                          disabled={isGeneratingDescription}
                        />
                      </TabsContent>
                      <TabsContent value="preview" className="mt-0">
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white min-h-[132px] prose prose-sm max-w-none overflow-y-auto">
                          {datasetDescription.description ? (
                            datasetDescription.description === "Generating description..." ? (
                              <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-5 h-5 text-gray-400 animate-spin mr-2" />
                                <p className="text-gray-400">Generating description...</p>
                              </div>
                            ) : (
                              <ReactMarkdown>
                                {datasetDescription.description}
                              </ReactMarkdown>
                            )
                          ) : (
                            <p className="text-gray-400 italic">No description provided</p>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>

                <div className="border rounded-lg bg-white">
                  <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-medium text-gray-700">
                      {fileUpload ? 'Data Preview' : 'Default Dataset Preview'}
                    </h3>
                    <button
                      onClick={handleUploadWithDescription}
                      disabled={!filePreview?.name || !filePreview?.description || isGeneratingDescription || datasetDescription.description === "Generating description..."}
                      className={`px-3 py-1.5 text-xs font-medium text-white rounded-md flex items-center gap-2 ${
                        !filePreview?.name || !filePreview?.description || isGeneratingDescription || datasetDescription.description === "Generating description..."
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-[#FF7F7F] hover:bg-[#FF6666]'
                      }`}
                    >
                      {isGeneratingDescription ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        fileUpload ? 'Upload Dataset' : 'Use Default Dataset'
                      )}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    {filePreview && (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            {filePreview.headers.map((header, i) => (
                              <TableHead 
                                key={i} 
                                className="font-semibold text-gray-700 px-4 py-3 text-left whitespace-nowrap"
                              >
                                {header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filePreview.rows.map((row, i) => (
                            <TableRow 
                              key={i}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              {Array.isArray(row) ? row.map((cell, j) => (
                                <TableCell 
                                  key={j} 
                                  className="px-4 py-3 border-b border-gray-100 text-gray-700 whitespace-nowrap"
                                >
                                  {cell === null ? '-' : cell}
                                </TableCell>
                              )) : null}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => setShowPreview(false)}
                    className={`px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md ${
                      isGeneratingDescription 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-gray-50'
                    } focus:outline-none focus:ring-2 focus:ring-[#FF7F7F] focus:border-transparent transition-colors`}
                    disabled={isGeneratingDescription}
                  >
                    Close
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
      
      {/* Credit info dialog */}
      <Dialog open={showCreditInfo} onOpenChange={setShowCreditInfo}>
        <DialogContent className="sm:max-w-lg text-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-800">About Credits and Monthly Reset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3 text-gray-800">
            <p>Free accounts receive a monthly allocation of tokens to use with Auto-Analyst.</p>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium mb-2 text-gray-800">How credits work:</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-800">
                <li>Each interaction with our AI uses a certain number of tokens</li>
                <li>More complex queries or larger datasets use more tokens</li>
                <li>Your free token allocation resets on the 1st day of each month</li>
                <li>Upgrade to a paid plan for unlimited tokens and additional features</li>
              </ul>
            </div>
            
            <div className="flex justify-end">
              <Link href="/pricing" passHref>
                <Button className="bg-[#FF7F7F] hover:bg-[#FF6666] text-white mr-2">
                  View Pricing Plans
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setShowCreditInfo(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dataset Reset Popup */}
      <DatasetResetPopup
        isOpen={showDatasetResetPopup}
        onClose={() => setShowDatasetResetPopup(false)}
        onConfirm={() => handleDatasetReset(false)} 
        onCancel={() => handleDatasetReset(true)}
      />

      {/* Sheet Selection Dialog */}
      <Dialog 
        open={showSheetSelector} 
        onOpenChange={(open) => {
          if (!open) {
            // If user closes dialog without selecting, reset file upload
            if (!showPreview) {
              setFileUpload(null);
              localStorage.removeItem('lastUploadedFile');
            }
            setShowSheetSelector(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Excel Sheet</DialogTitle>
            <p className="text-sm text-gray-500 mt-2">
              Your Excel file contains multiple sheets. Please select which sheet you'd like to analyze.
            </p>
          </DialogHeader>
          <div className="py-4">
            {fileUpload?.sheets && fileUpload.sheets.length > 0 ? (
              <Select
                value={fileUpload.selectedSheet}
                onValueChange={(sheet) => {
                  setFileUpload(prev => prev ? {
                    ...prev,
                    selectedSheet: sheet
                  } : null);
                }}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="Select a sheet" />
                </SelectTrigger>
                <SelectContent>
                  {fileUpload.sheets.map(sheet => (
                    <SelectItem 
                      key={sheet} 
                      value={sheet} 
                      className="cursor-pointer hover:bg-blue-50 hover:text-[#FF7F7F] transition-colors"
                    >
                      {sheet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-gray-500">No sheets found in this Excel file.</p>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowSheetSelector(false);
                setFileUpload(null);
                localStorage.removeItem('lastUploadedFile');
              }}
            >
              Cancel
            </Button>
            <Button 
              disabled={!fileUpload?.selectedSheet}
              onClick={handleSheetSelectionConfirm}
              className="bg-[#FF7F7F] hover:bg-[#FF6666] text-white"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Deep Analysis Sidebar */}
      <DeepAnalysisSidebar
        isOpen={showDeepAnalysisSidebar}
        onClose={() => setShowDeepAnalysisSidebar(false)}
        sessionId={sessionId || undefined}
        userId={userId}
        forceExpanded={shouldForceExpanded}
      />
      
      {/* Templates Sidebar */}
      {/* <TemplatesSidebar
        isOpen={showTemplatesSidebar}
        onClose={() => setShowTemplatesSidebar(false)}
        userId={userId}
        forceExpanded={shouldForceExpanded}
      /> */}

      {/* Credit Exhausted Modal */}
      <CreditExhaustedModal
        isOpen={showCreditExhaustedModal}
        onClose={() => setShowCreditExhaustedModal(false)}
      />
    </>
  )
})

export default ChatInput
