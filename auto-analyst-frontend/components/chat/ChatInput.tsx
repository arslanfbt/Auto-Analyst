"use client"

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Paperclip, X, Square, Loader2, CheckCircle2, XCircle, Eye, CreditCard } from 'lucide-react'
import AgentHint from './AgentHint'
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
} from "@/components/ui/dialog"
import { useSessionStore } from '@/lib/store/sessionStore'
import { useCredits } from '@/lib/contexts/credit-context'
import API_URL from '@/config/api'
import Link from 'next/link'
import DatasetResetPopup from './DatasetResetPopup'

// const PREVIEW_API_URL = 'http://localhost:8000';
const PREVIEW_API_URL = API_URL;

interface FileUpload {
  file: File
  status: 'loading' | 'success' | 'error'
  errorMessage?: string
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
}

const ChatInput = forwardRef<
  { handlePreviewDefaultDataset: () => void },
  ChatInputProps
>(({ onSendMessage, onFileUpload, disabled, isLoading, onStopGeneration }, ref) => {
  const [message, setMessage] = useState("")
  const [fileUpload, setFileUpload] = useState<FileUpload | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [showHint, setShowHint] = useState(false)
  const [input, setInput] = useState('')
  const [agentSuggestions, setAgentSuggestions] = useState<AgentSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
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
  const { remainingCredits, isChatBlocked } = useCredits()
  const [showCreditInfo, setShowCreditInfo] = useState(false)
  const [showDatasetResetPopup, setShowDatasetResetPopup] = useState(false)
  const [datasetMismatch, setDatasetMismatch] = useState(false)

  // Expose handlePreviewDefaultDataset to parent
  useImperativeHandle(ref, () => ({
    handlePreviewDefaultDataset
  }));

  // Use a ref to track localStorage changes
  const lastUploadedFileRef = useRef<string | null>(null);

  // Check for saved file on component mount and when localStorage changes
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined' && !fileUpload) {
      const savedFile = localStorage.getItem('lastUploadedFile');
      if (savedFile) {
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
      } else if (lastUploadedFileRef.current) {
        // If we had a value before but it's gone now, clear the state
        lastUploadedFileRef.current = null;
        setFileUpload(null);
      }
    }
  }, [fileUpload]);
  
  // Add an effect to check for localStorage changes
  useEffect(() => {
    const checkForStorageChanges = () => {
      const currentValue = localStorage.getItem('lastUploadedFile');
      
      // If storage changed and we have a value
      if (currentValue !== lastUploadedFileRef.current && currentValue) {
        try {
          const fileInfo = JSON.parse(currentValue);
          // Create a mock File object for display purposes
          const mockFile = new File([""], fileInfo.name, { 
            type: fileInfo.type,
            lastModified: fileInfo.lastModified
          });
          
          setFileUpload({
            file: mockFile,
            status: 'success'
          });
          
          lastUploadedFileRef.current = currentValue;
        } catch (error) {
          console.error("Error processing storage change:", error);
        }
      } 
      // If storage was cleared and we had a value
      else if (!currentValue && lastUploadedFileRef.current) {
        setFileUpload(null);
        lastUploadedFileRef.current = null;
      }
    };
    
    // Check on mount
    checkForStorageChanges();
    
    // Set up listener for storage events (in case another tab changes localStorage)
    window.addEventListener('storage', checkForStorageChanges);
    
    // Custom interval to detect changes in the same tab (every 500ms)
    const intervalId = setInterval(checkForStorageChanges, 500);
    
    return () => {
      window.removeEventListener('storage', checkForStorageChanges);
      clearInterval(intervalId);
    };
  }, []);

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
          
          console.log("Session info in ChatInput:", response.data);
          
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
              // This is likely after a refresh - show the dataset reset popup
              console.log("UI shows no dataset, but server has custom dataset - showing reset dialog");
              
              // Create a mock File object just for display purposes
              const mockFile = new File([""], `${customName}.csv`, { type: 'text/csv' });
              
              // Set the file upload state but also show the reset dialog
              setFileUpload({
                file: mockFile,
                status: 'success'
              });
              
              // Show the dataset reset popup to get user consent
              setDatasetMismatch(true);
              setShowDatasetResetPopup(true);
            }
          } else if (fileUpload && fileUpload.status === 'success') {
            // The UI shows a custom dataset, but the server says we're using the default
            // This means there's a mismatch - the session was reset on the server side
            console.log("Dataset mismatch detected: UI shows custom dataset but server uses default");
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
      // Log file details for debugging
      console.log('Selected file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
      
      // Check file type before proceeding
      const isCSVByExtension = file.name.toLowerCase().endsWith('.csv');
      const isCSVByType = file.type === 'text/csv' || file.type === 'application/csv';
      
      if (!isCSVByExtension || (!isCSVByType && file.type !== '')) {
        setFileUpload({ 
          file, 
          status: 'error', 
          errorMessage: 'Please upload a CSV file only' 
        });
        
        setTimeout(() => {
          setFileUpload(null);
          localStorage.removeItem('lastUploadedFile');
        }, 3000);
        return;
      }
      
      // Reset any previous file state
      localStorage.removeItem('lastUploadedFile');
      
      // Set to loading state
      setFileUpload({ file, status: 'loading' })
      
      try {
        // First preview the file
        await handleFilePreview(file);
        setFileUpload(prev => prev ? { ...prev, status: 'success' } : null)
      } catch (error) {
        const errorMessage = getErrorMessage(error)
        setFileUpload(prev => prev ? { ...prev, status: 'error', errorMessage } : null)
        
        setTimeout(() => {
          setFileUpload(null);
          localStorage.removeItem('lastUploadedFile');
        }, 3000)
      }
    }
  }

  const handleFilePreview = async (file: File) => {
    if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
      try {
        // Check if we already have a session ID - if so, we can skip the upload
        // and just fetch the preview directly
        if (fileUpload?.status === 'success' && sessionId) {
          console.log('File already uploaded, fetching preview from session...');
          
          // Just get the preview using the existing session
          const previewResponse = await axios.post(`${PREVIEW_API_URL}/api/preview-csv`, null, {
            headers: {
              'X-Session-ID': sessionId,
            },
          });
          
          console.log('Preview response from existing session:', previewResponse.data);
          
          const { headers, rows, name, description } = previewResponse.data;
          
          // Update both states with the same name and description
          setFilePreview({ headers, rows, name, description });
          setDatasetDescription({ name, description });
          setShowPreview(true);
          
          return;
        }
        
        // Otherwise, do a fresh upload
        console.log('Uploading new file and getting preview...', file.name, file.size, file.type);
        const formData = new FormData();
        formData.append('file', file);
        
        // Add required fields
        const tempName = file.name.replace('.csv', '');
        const tempDescription = 'Preview dataset';
        formData.append('name', tempName);
        formData.append('description', tempDescription);
        
        console.log('FormData prepared:', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          name: tempName,
          description: tempDescription
        });
        
        // Upload the file
        try {
          const uploadResponse = await axios.post(`${PREVIEW_API_URL}/upload_dataframe`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              ...(sessionId && { 'X-Session-ID': sessionId }),
            },
          });
          
          console.log('Upload response:', uploadResponse.data);
          const previewSessionId = uploadResponse.data.session_id || sessionId;
          
          // Then request a preview using the session ID
          const previewResponse = await axios.post(`${PREVIEW_API_URL}/api/preview-csv`, null, {
            headers: {
              ...(previewSessionId && { 'X-Session-ID': previewSessionId }),
            },
          });
          
          console.log('Preview response:', previewResponse.data);
          
          // Extract all fields including name and description
          const { headers, rows, name, description } = previewResponse.data;
          
          // Store both in filePreview and datasetDescription
          setFilePreview({ 
            headers, 
            rows, 
            name: name || tempName,
            description: description || tempDescription 
          });
          
          // Sync the datasetDescription state with the same values
          setDatasetDescription({ 
            name: name || tempName, 
            description: description || tempDescription 
          });
          
          setShowPreview(true);
          
          // If we got a new session ID from the upload, save it
          if (uploadResponse.data.session_id) {
            setSessionId(uploadResponse.data.session_id);
          }
        } catch (error: any) {
          // Handle upload errors
          console.error('Upload error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          });
          throw error;
        }
      } catch (error) {
        console.error('Failed to preview file:', error);
        alert(`Error uploading file: ${getErrorMessage(error)}`);
      }
    } else {
      console.log('Not a CSV file');
      alert('Please upload a CSV file');
    }
  }

  const getErrorMessage = (error: any): string => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 413) return "File too large"
      if (error.response?.status === 415) return "Invalid file type"
      if (error.response?.data?.message) return error.response.data.message
    }
    if (error instanceof Error) return error.message
    return "Upload failed"
  }

  const clearFile = () => {
    setFileUpload(null)
    localStorage.removeItem('lastUploadedFile');
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  useEffect(() => {
    const agents: AgentSuggestion[] = [
      { name: "data_viz_agent", description: "Specializes in data visualization" },
      { name: "sk_learn_agent", description: "Handles machine learning tasks" },
      { name: "statistical_analytics_agent", description: "Performs statistical analysis" },
      { name: "preprocessing_agent", description: "Handles data preprocessing tasks" },
    ]

    // Find all @ symbol positions in the message
    const atPositions: number[] = [];
    let pos = -1;
    while ((pos = message.indexOf('@', pos + 1)) !== -1) {
      atPositions.push(pos);
    }

    // Find the @ position closest to the cursor that's being typed
    let activeAtPos = -1;
    for (const pos of atPositions) {
      // Check if the cursor is within or at the end of an agent mention
      const textAfterAt = message.slice(pos + 1);
      const spaceAfterAt = textAfterAt.indexOf(' ');
      const endOfMention = spaceAfterAt !== -1 ? pos + 1 + spaceAfterAt : message.length;
      
      if (cursorPosition >= pos + 1 && cursorPosition <= endOfMention) {
        activeAtPos = pos;
        break;
      }
    }

    if (activeAtPos !== -1) {
      // Get the text being typed for the agent name
      const textAfterAt = message.slice(activeAtPos + 1);
      const spaceIndex = textAfterAt.indexOf(' ');
      const typedText = spaceIndex !== -1 
        ? message.slice(activeAtPos + 1, activeAtPos + 1 + spaceIndex) 
        : textAfterAt;
      
      // Only show suggestions if we're actively typing an agent name
      if (typedText && !typedText.includes(' ')) {
        const filtered = agents.filter(agent => 
          agent.name.toLowerCase().includes(typedText.toLowerCase())
        )
        setAgentSuggestions(filtered)
        setShowSuggestions(filtered.length > 0)
        return
      }
    }
    
    setShowSuggestions(false)
  }, [message, cursorPosition])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    setCursorPosition(e.target.selectionStart || 0)
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`
    }
  }

  const handleSuggestionClick = (agentName: string) => {
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
      
      setShowSuggestions(false)
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
      
      // This will now also ensure we're using the default dataset
      const response = await axios.get(`${PREVIEW_API_URL}/api/default-dataset`, {
        headers: {
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
      });
      
      setFilePreview({
        headers: response.data.headers,
        rows: response.data.rows,
        name: response.data.name,
        description: response.data.description
      });
      
      // Pre-fill the name and description
      setDatasetDescription({
        name: response.data.name || 'Dataset',
        description: response.data.description || 'Please provide a description for this dataset'
      });
      
      setShowPreview(true);
      
      // If we got a session ID, save it
      if (response.data.session_id) {
        setSessionId(response.data.session_id);
      }
      
      console.log("Default dataset preview loaded, upload state reset");
    } catch (error) {
      console.error('Failed to fetch dataset preview:', error);
    }
  };

  const handleUploadWithDescription = async () => {
    if (!datasetDescription.name || !datasetDescription.description) {
      alert('Please provide both a name and description for the dataset');
      return;
    }

    try {
      let formData = new FormData();
      
      if (fileUpload?.file) {
        // Log file details to console for debugging
        console.log("Upload file details:", {
          name: fileUpload.file.name,
          size: fileUpload.file.size,
          type: fileUpload.file.type,
          lastModified: fileUpload.file.lastModified
        });
        
        // Only check for mock files in specific cases when we know it was created programmatically
        // This avoids incorrectly flagging legitimate small files
        const isMockFile = fileUpload.file.size === 0 && 
                         !fileInputRef.current?.files?.length && 
                         !fileUpload.file.lastModified;
        
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
        
        // For uploaded file
        formData.append('file', fileUpload.file);
        formData.append('name', datasetDescription.name);
        formData.append('description', datasetDescription.description);

        console.log('Final upload with description:', {
          fileName: fileUpload.file.name,
          fileSize: fileUpload.file.size,
          name: datasetDescription.name,
          description: datasetDescription.description
        });

        try {
          const response = await axios.post(`${PREVIEW_API_URL}/upload_dataframe`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
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
        }
      }
      
      setShowPreview(false);
      setUploadSuccess(true);
      if (fileUpload) {
        setFileUpload(prev => prev ? { ...prev, status: 'success' } : null);
      }
      
      // Save to localStorage after successful upload to persist across refreshes
      if (fileUpload?.file) {
        localStorage.setItem('lastUploadedFile', JSON.stringify({
          name: fileUpload.file.name,
          type: fileUpload.file.type,
          lastModified: fileUpload.file.lastModified
        }));
      }
      
      setDatasetDescription({ name: '', description: '' });
      
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
    return disabled || isLoading || isChatBlocked
  }

  // Calculate reset date (first day of next month)
  const getResetDate = () => {
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return nextMonth.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  // Add a function to generate dataset description automatically
  const generateDatasetDescription = async () => {
    if (!sessionId) return;
    
    try {
      setDatasetDescription(prev => ({
        ...prev, 
        description: "Generating description..."
      }));
      
      const response = await axios.post(`${PREVIEW_API_URL}/create-dataset-description`, {
        sessionId: sessionId
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
          console.log("Clearing file input and requesting new selection");
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
          console.log("Showing preview dialog for file selection");
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
          console.log("Showing preview for existing file");
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
  };

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
              {uploadSuccess && (
                <div className="max-w-3xl mx-auto mb-2">
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-green-700 text-sm">Dataset uploaded successfully!</span>
                  </div>
                </div>
              )}

              {fileUpload && (
                <div className="max-w-3xl mx-auto mb-2">
                  <div 
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
                      fileUpload.status === 'error' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    {getStatusIcon(fileUpload.status)}
                    <span className="text-blue-700 font-medium">
                      {fileUpload.file.name}
                    </span>
                    {fileUpload.status === 'error' && fileUpload.errorMessage && (
                      <span className="text-red-600">
                        • {fileUpload.errorMessage}
                      </span>
                    )}
                    {fileUpload.status === 'success' && (
                      <button 
                        onClick={() => handleFilePreview(fileUpload.file)}
                        className="hover:bg-white/50 p-1 rounded-full transition-colors text-blue-500 hover:text-blue-700"
                        title="Preview data"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!fileUpload && (
                <div className="max-w-3xl mx-auto mb-2">
                  <button
                    onClick={handlePreviewDefaultDataset}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Preview Default Dataset
                  </button>
                </div>
              )}

              {/* Credit exhaustion message with reset date */}
              {isChatBlocked && (
                <div className="max-w-3xl mx-auto mb-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-md p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                      <span className="text-orange-700 font-medium">You've used all your tokens for this month</span>
                    </div>
                    <p className="text-sm text-orange-600 ml-7">
                      Upgrade your plan to get more tokens immediately, or wait until <strong>{getResetDate()}</strong> when your free tokens will reset.
                    </p>
                    <div className="flex gap-3 ml-7">
                      <Link href="/pricing" passHref>
                        <Button className="bg-[#FF7F7F] hover:bg-[#FF6666] text-white">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Upgrade Plan
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        className="text-gray-700" 
                        onClick={() => setShowCreditInfo(true)}
                      >
                        Learn More
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
                      {showSuggestions && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full left-0 mb-2 w-full max-h-40 overflow-y-auto bg-white rounded-lg shadow-lg"
                        >
                          {agentSuggestions.map((agent) => (
                            <div
                              key={agent.name}
                              onClick={() => handleSuggestionClick(agent.name)}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <div className="font-medium">{agent.name}</div>
                              <div className="text-sm text-gray-500">{agent.description}</div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                        className="hidden" 
                        id="file-upload"
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
              if (!open) {
                // When dialog is closed without completing upload
                setShowPreview(false);
                
                // If the dialog is closed without completing upload of a new file,
                // and we don't have a successful upload yet, reset everything
                if (fileUpload?.status !== 'success') {
                  console.log('Dialog closed without completing upload, resetting state');
                  setFileUpload(null);
                  localStorage.removeItem('lastUploadedFile');
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }
              }
            }}
          >
            <DialogContent className="w-[90vw] max-w-4xl h-[90vh] overflow-hidden bg-gray-50 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <DialogHeader className="border-b pb-4 bg-gray-50 z-8">
                <DialogTitle className="text-xl text-gray-800">
                  Dataset Details
                </DialogTitle>
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
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      Description
                    </label>
                    <div className="relative">
                      <textarea
                        value={datasetDescription.description}
                        onChange={(e) => setDatasetDescription(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 pr-28 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7F7F] focus:border-transparent text-gray-800"
                        rows={3}
                        placeholder="Describe what this dataset contains and its purpose"
                      />
                      <button
                        type="button"
                        onClick={generateDatasetDescription}
                        className="absolute right-2 top-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF7F7F]"
                      >
                        Auto-generate
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg bg-white">
                  <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-medium text-gray-700">
                      {fileUpload ? 'Data Preview' : 'Default Dataset Preview'}
                    </h3>
                    <button
                      onClick={handleUploadWithDescription}
                      disabled={!filePreview?.name || !filePreview?.description}
                      className={`px-3 py-1.5 text-xs font-medium text-white rounded-md flex items-center gap-2 ${
                        !filePreview?.name || !filePreview?.description
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-[#FF7F7F] hover:bg-[#FF6666]'
                      }`}
                    >
                      {fileUpload ? 'Upload Dataset' : 'Use Default Dataset'}
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
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FF7F7F] focus:border-transparent transition-colors"
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
    </>
  )
})

export default ChatInput
