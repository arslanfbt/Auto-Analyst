import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { FileText, BarChart3, CheckSquare, Square, Loader2 } from "lucide-react"

interface ExcelUploadDialogProps {
  isOpen: boolean
  onClose: () => void
  sheets: string[]
  fileName: string
  onConfirm: (selectedSheets: string[], name: string, description: string) => void
  isSubmitting: boolean
  sessionId: string // Add sessionId prop
}

export default function ExcelUploadDialog({
  isOpen,
  onClose,
  sheets,
  fileName,
  onConfirm,
  isSubmitting,
  sessionId // Add sessionId parameter
}: ExcelUploadDialogProps) {
  const [selectedSheets, setSelectedSheets] = useState<string[]>([])
  const [datasetName, setDatasetName] = useState<string>("")
  const [description, setDescription] = useState<string>("")

  // Initialize dataset name from filename
  useEffect(() => {
    if (sheets.length > 0 && selectedSheets.length === 0) {
      setSelectedSheets([sheets[0]]) // Auto-select first sheet
    }
    if (fileName && !datasetName) {
      const baseFileName = fileName.replace(/\.(xlsx|xls)$/i, '')
      setDatasetName(baseFileName)
    }
  }, [sheets, fileName, selectedSheets.length, datasetName])

  // Remove auto-generation when dialog opens - let user control when to generate
  // (No auto-generation effect for Excel uploads)

  const handleSheetToggle = (sheetName: string) => {
    setSelectedSheets(prev => 
      prev.includes(sheetName) 
        ? prev.filter(s => s !== sheetName)
        : [...prev, sheetName]
    )
  }

  const handleSelectAll = () => {
    setSelectedSheets(selectedSheets.length === sheets.length ? [] : [...sheets])
  }

  const handleSubmit = () => {
    if (selectedSheets.length === 0 || !datasetName.trim() || !description.trim()) return
    onConfirm(selectedSheets, datasetName.trim(), description.trim())
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  const allSelected = selectedSheets.length === sheets.length
  const someSelected = selectedSheets.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#FF7F7F]" />
            Excel File Upload
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Info */}
          <div className="bg-[#FF7F7F]/10 border border-[#FF7F7F]/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-[#FF7F7F]" />
              <span className="font-medium text-gray-900">File:</span>
            </div>
            <p className="text-gray-700 text-sm">{fileName}</p>
          </div>

          {/* Dataset Name */}
          <div className="space-y-2">
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

          {/* Sheet Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#FF7F7F]" />
                Select Sheets ({selectedSheets.length}/{sheets.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="flex items-center gap-2 hover:bg-[#FF7F7F]/10 hover:border-[#FF7F7F]/30"
                disabled={isSubmitting}
              >
                {allSelected ? (
                  <>
                    <Square className="w-4 h-4" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    Select All
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
              {sheets.map((sheetName) => (
                <div key={sheetName} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={sheetName}
                    checked={selectedSheets.includes(sheetName)}
                    onChange={() => handleSheetToggle(sheetName)}
                    className="h-4 w-4 rounded border-gray-300 text-[#FF7F7F] focus:ring-[#FF7F7F] focus:ring-2"
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor={sheetName}
                    className="text-sm font-medium leading-none cursor-pointer flex-1 select-none"
                  >
                    {sheetName}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Description - REMOVED AUTO-GENERATE BUTTON */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              placeholder="Brief description of your dataset..."
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="focus:ring-[#FF7F7F] focus:border-[#FF7F7F]"
            />
          </div>

          {/* Actions */}
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
              disabled={isSubmitting || selectedSheets.length === 0 || !datasetName.trim() || !description.trim()}
              className="bg-[#FF7F7F] hover:bg-[#FF6666] text-white flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 w-4" />
                  Confirm Excel Sheets ({selectedSheets.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
