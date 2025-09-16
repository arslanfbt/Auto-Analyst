import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Eye, Loader2, Sparkles } from "lucide-react"
import axios from 'axios'
import API_URL from '@/config/api'
// Remove the useSession import since we're getting sessionId as a prop

interface CSVUploadDialogProps {
  isOpen: boolean
  onClose: () => void
  fileName: string
  filePreview?: {
    headers: string[]
    rows: any[][]
    name: string
    description: string
  }
  onConfirm: (name: string, description: string) => void
  isSubmitting: boolean
  existingData?: any
  sessionId: string // Add sessionId prop
}

export default function CSVUploadDialog({
  isOpen,
  onClose,
  fileName,
  filePreview,
  onConfirm,
  isSubmitting,
  existingData,
  sessionId
}: CSVUploadDialogProps) {
  const [datasetName, setDatasetName] = useState('')
  const [description, setDescription] = useState('')
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit") // Add missing state
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)

  // Auto-trigger description generation when dialog opens with preview data
  useEffect(() => {
    if (isOpen && filePreview && !description) {
      // Set the dataset name from preview
      setDatasetName(filePreview.name || fileName.replace(/\.csv$/i, ''))
      
      // Set basic description
      setDescription(filePreview.description || `CSV data from ${fileName}`)
      
      // Auto-trigger description generation after a small delay
      const timer = setTimeout(() => {
        handleAutoGenerate()
      }, 100) // Small delay to ensure component is fully mounted
      
      return () => clearTimeout(timer)
    }
  }, [isOpen, filePreview])

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setDatasetName('')
      setDescription('')
      setActiveTab("edit")
      setIsGeneratingDescription(false)
    }
  }, [isOpen])

  const handleClose = () => {
    if (!isSubmitting) {
      setDatasetName('')
      setDescription('')
      setActiveTab("edit")
      onClose()
    }
  }

  const handleSubmit = () => {
    if (!datasetName.trim() || !description.trim()) return
    onConfirm(datasetName.trim(), description.trim())
  }

  const handleAutoGenerate = async () => {
    if (!sessionId || !filePreview) {
      console.error('No session ID or file preview available for description generation')
      return
    }
    
    setIsGeneratingDescription(true)
    
    try {
      // Use the new endpoint that works with preview data
      const response = await axios.post(`${API_URL}/generate-description-from-preview`, {
        headers: filePreview.headers,
        rows: filePreview.rows,
        datasetName: datasetName,
        existingDescription: description
      }, {
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId && { 'X-Session-ID': sessionId }),
        }
      })
      
      if (response.data && response.data.description) {
        setDescription(response.data.description)
      } else {
        console.error('No description received from backend')
      }
    } catch (error) {
      console.error('Error generating description:', error)
      // Show user-friendly error message instead of fallback
      setDescription('Failed to generate description. Please try again or enter manually.')
    } finally {
      setIsGeneratingDescription(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#FF7F7F]" />
            Dataset Details
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
          {/* Dataset Name - Fixed height */}
          <div className="flex-shrink-0 space-y-2">
            <label htmlFor="datasetName" className="text-sm font-medium">
              Dataset Name
            </label>
            <Input
              id="datasetName"
              placeholder="Enter dataset name..."
              value={datasetName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDatasetName(e.target.value)}
              disabled={isSubmitting}
              className="focus:ring-[#FF7F7F] focus:border-[#FF7F7F]"
            />
          </div>

          {/* Description - Fixed height */}
          <div className="flex-shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Description</label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoGenerate}
                disabled={isSubmitting || !filePreview || isGeneratingDescription}
                className="text-xs hover:bg-[#FF7F7F]/10 hover:border-[#FF7F7F]/30 flex items-center gap-1"
              >
                {isGeneratingDescription ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                Auto-generate
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as "edit" | "preview")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="edit" className="text-xs">Edit</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="edit" className="mt-3">
                <Textarea
                  placeholder="Describe what this dataset contains and its purpose..."
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  className="min-h-[120px] focus:ring-[#FF7F7F] focus:border-[#FF7F7F]"
                />
              </TabsContent>
              
              <TabsContent value="preview" className="mt-3">
                <div className="min-h-[120px] p-3 bg-gray-50 rounded-md border">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {description || "No description provided"}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Data Preview - Flexible height with internal scrolling */}
          {filePreview && (
            <div className="flex-1 min-h-0 flex flex-col space-y-3">
              <label className="text-sm font-medium flex-shrink-0">Data Preview</label>
              <div className="flex-1 min-h-0 border rounded-md overflow-hidden flex flex-col">
                <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 border-b flex-shrink-0">
                  {filePreview.headers.length} columns, {filePreview.rows.length} sample rows
                </div>
                <div className="flex-1 min-h-0 overflow-auto">
                  <table className="w-full text-xs min-w-max">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        {filePreview.headers.map((header: string, index: number) => (
                          <th key={index} className="px-2 py-1 text-left font-medium text-gray-700 border-r whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filePreview.rows.map((row: any[], rowIndex: number) => (
                        <tr key={rowIndex} className="border-b hover:bg-gray-50">
                          {row.map((cell: any, cellIndex: number) => (
                            <td key={cellIndex} className="px-2 py-1 border-r text-gray-600 whitespace-nowrap">
                              {cell !== null && cell !== undefined ? String(cell) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !datasetName.trim() || !description.trim()}
              className="bg-[#FF7F7F] hover:bg-[#FF6666] text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Dataset'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
