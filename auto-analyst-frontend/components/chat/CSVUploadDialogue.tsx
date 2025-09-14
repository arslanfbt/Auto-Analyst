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
  sessionId // Use the prop instead of useSession
}: CSVUploadDialogProps) {
  const [datasetName, setDatasetName] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)

  // Initialize with existing data if provided, otherwise use props
  useEffect(() => {
    if (existingData) {
      // If we have existing data (from uploaded dataset), use it
      setDatasetName(existingData.name || fileName)
      setDescription(existingData.description || '')
    } else if (fileName && !datasetName) {
      // If it's a new upload, use filename
      const baseFileName = fileName.replace(/\.csv$/i, '').replace('Default Dataset', 'Housing Dataset')
      setDatasetName(baseFileName)
    }
  }, [fileName, datasetName, existingData])

  // Add a new useEffect to handle when filePreview changes (for already uploaded datasets)
  useEffect(() => {
    if (filePreview && !existingData) {
      // If we have filePreview but no existingData, this is an already uploaded dataset
      setDatasetName(filePreview.name || fileName)
      setDescription(filePreview.description || '')
    }
  }, [filePreview, fileName, existingData])

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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#FF7F7F]" />
            Dataset Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dataset Name */}
          <div className="space-y-2">
            <label htmlFor="datasetName" className="text-sm font-medium">
              Dataset Name
            </label>
            <Input
              id="datasetName"
              placeholder="Enter dataset name..."
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              disabled={isSubmitting}
              className="focus:ring-[#FF7F7F] focus:border-[#FF7F7F]"
            />
          </div>

          {/* Description with smaller tabs */}
          <div className="space-y-3">
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

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "edit" | "preview")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="edit" className="text-xs">Edit</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="edit" className="mt-3">
                <Textarea
                  placeholder="Describe what this dataset contains and its purpose..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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

          {/* Data Preview */}
          {filePreview && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Data Preview</label>
              <div className="border rounded-md overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 border-b">
                  {filePreview.headers.length} columns, {filePreview.rows.length} sample rows
                </div>
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-xs min-w-max">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        {filePreview.headers.map((header, index) => (
                          <th key={index} className="px-2 py-1 text-left font-medium text-gray-700 border-r whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filePreview.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b hover:bg-gray-50">
                          {row.map((cell, cellIndex) => (
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

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
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
