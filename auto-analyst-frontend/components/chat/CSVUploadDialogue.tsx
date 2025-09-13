import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Eye, Loader2, Sparkles } from "lucide-react"

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
}

export default function CSVUploadDialog({
  isOpen,
  onClose,
  fileName,
  filePreview,
  onConfirm,
  isSubmitting
}: CSVUploadDialogProps) {
  const [datasetName, setDatasetName] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)

  // Initialize with filename and blank description
  useEffect(() => {
    if (fileName && !datasetName) {
      const baseFileName = fileName.replace(/\.csv$/i, '').replace('Default Dataset', 'Housing Dataset')
      setDatasetName(baseFileName)
    }
    // Don't pre-fill description - start blank
  }, [fileName, datasetName])

  const handleSubmit = () => {
    if (!datasetName.trim() || !description.trim()) return
    onConfirm(datasetName.trim(), description.trim())
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  const handleAutoGenerate = async () => {
    if (!filePreview) return
    
    setIsGeneratingDescription(true)
    
    try {
      // Create a detailed description based on the data
      const headers = filePreview.headers
      const sampleRows = filePreview.rows.slice(0, 3)
      
      // Analyze the data to create a comprehensive description
      let generatedDescription = `This dataset contains ${headers.length} columns and appears to be a comprehensive data collection. `
      
      // Analyze column types and patterns
      const numericColumns = []
      const textColumns = []
      const dateColumns = []
      
      headers.forEach((header, index) => {
        const sampleValues = sampleRows.map(row => row[index]).filter(val => val !== null && val !== undefined)
        
        if (sampleValues.length > 0) {
          const firstValue = sampleValues[0]
          if (typeof firstValue === 'number' || !isNaN(Number(firstValue))) {
            numericColumns.push(header)
          } else if (typeof firstValue === 'string') {
            if (firstValue.includes('/') || firstValue.includes('-') || firstValue.includes('202')) {
              dateColumns.push(header)
            } else {
              textColumns.push(header)
            }
          }
        }
      })
      
      // Build detailed description
      if (numericColumns.length > 0) {
        generatedDescription += `The dataset includes ${numericColumns.length} numeric columns (${numericColumns.slice(0, 3).join(', ')}${numericColumns.length > 3 ? ' and more' : ''}) which suggest quantitative measurements or metrics. `
      }
      
      if (textColumns.length > 0) {
        generatedDescription += `There are ${textColumns.length} text-based columns (${textColumns.slice(0, 3).join(', ')}${textColumns.length > 3 ? ' and more' : ''}) that likely contain categorical data, identifiers, or descriptive information. `
      }
      
      if (dateColumns.length > 0) {
        generatedDescription += `The dataset also includes ${dateColumns.length} date/time columns (${dateColumns.slice(0, 2).join(', ')}${dateColumns.length > 2 ? ' and more' : ''}) which enable temporal analysis. `
      }
      
      // Add analysis suggestions
      generatedDescription += `This data structure is well-suited for various analytical approaches including statistical analysis, trend identification, correlation studies, and predictive modeling. `
      
      // Add specific insights based on column names
      const columnNames = headers.map(h => h.toLowerCase())
      if (columnNames.some(name => name.includes('price') || name.includes('cost') || name.includes('revenue'))) {
        generatedDescription += `Given the presence of financial metrics, this dataset would be particularly valuable for economic analysis, pricing strategies, and financial forecasting. `
      }
      
      if (columnNames.some(name => name.includes('customer') || name.includes('user') || name.includes('client'))) {
        generatedDescription += `The customer-related fields suggest this data could be used for customer segmentation, behavior analysis, and customer relationship management insights. `
      }
      
      if (columnNames.some(name => name.includes('location') || name.includes('address') || name.includes('city'))) {
        generatedDescription += `Geographic information present in the dataset enables location-based analysis, regional comparisons, and spatial data visualization. `
      }
      
      generatedDescription += `The comprehensive nature of this dataset makes it suitable for machine learning applications, business intelligence reporting, and strategic decision-making processes.`
      
      setDescription(generatedDescription)
    } catch (error) {
      console.error('Error generating description:', error)
      // Fallback to simple description
      const features = filePreview.headers.slice(0, 5).join(', ')
      setDescription(`This dataset contains ${filePreview.headers.length} columns including ${features}${filePreview.headers.length > 5 ? ' and more' : ''}. The data can be used for analysis and insights.`)
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
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        {filePreview.headers.map((header, index) => (
                          <th key={index} className="px-2 py-1 text-left font-medium text-gray-700 border-r">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filePreview.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-2 py-1 border-r text-gray-600">
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
