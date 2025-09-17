import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, BarChart3, CheckSquare, Square, Loader2 } from "lucide-react"

interface ExcelUploadDialogProps {
  isOpen: boolean
  onClose: () => void
  sheets: string[]
  fileName: string
  onConfirm: (selectedSheets: string[], name: string, description: string, fillNulls: boolean, convertTypes: boolean) => void
  isSubmitting: boolean
  sessionId: string
}

export default function ExcelUploadDialog({
  isOpen,
  onClose,
  sheets,
  fileName,
  onConfirm,
  isSubmitting,
  sessionId
}: ExcelUploadDialogProps) {
  const [selectedSheets, setSelectedSheets] = useState<string[]>([])
  const [datasetName, setDatasetName] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  
  // New preprocessing options (default to checked)
  const [fillNulls, setFillNulls] = useState(true)
  const [convertTypes, setConvertTypes] = useState(true)

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

  const handleConfirm = () => {
    if (selectedSheets.length > 0 && datasetName.trim() && description.trim()) {
      onConfirm(selectedSheets, datasetName.trim(), description.trim(), fillNulls, convertTypes)
    }
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
            <BarChart3 className="h-5 w-5" />
            Excel Upload Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sheet selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Select Sheets to Import</label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {sheets.map((sheet) => (
                <div key={sheet} className="flex items-center space-x-2">
                  <div
                    className="flex items-center cursor-pointer"
                    onClick={() => handleSheetToggle(sheet)}
                  >
                    {selectedSheets.includes(sheet) ? (
                      <CheckSquare className="h-4 w-4 text-[#FF7F7F]" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <label className="text-sm cursor-pointer" onClick={() => handleSheetToggle(sheet)}>
                    {sheet}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Dataset name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Dataset Name</label>
            <Input
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              placeholder="Enter dataset name"
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your dataset..."
              disabled={isSubmitting}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* NEW: Preprocessing Options */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <label className="text-sm font-medium text-gray-700">Preprocessing Options</label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="fillNulls"
                checked={fillNulls}
                onCheckedChange={(checked) => setFillNulls(checked as boolean)}
              />
              <label
                htmlFor="fillNulls"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Fill nulls
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="convertTypes"
                checked={convertTypes}
                onCheckedChange={(checked) => setConvertTypes(checked as boolean)}
              />
              <label
                htmlFor="convertTypes"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Convert types for better analysis
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isSubmitting || selectedSheets.length === 0 || !datasetName.trim() || !description.trim()}
            className="bg-[#FF7F7F] hover:bg-[#FF6666] text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
