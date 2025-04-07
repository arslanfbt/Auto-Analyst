import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Database } from 'lucide-react';

interface DatasetResetPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const DatasetResetPopup: React.FC<DatasetResetPopupProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Dataset Selection</DialogTitle>
          </div>
          <DialogDescription className="text-base font-normal space-y-4">
            <p>
              Your session has a custom dataset, but your current view may need to be updated.
              This happens after page refreshes, session changes, or when switching between chats.
            </p>
            <div className="bg-amber-50 p-3 rounded-md border border-amber-200 flex gap-3">
              <Database className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Please choose an option:</p>
                <ul className="list-disc ml-5 mt-1 text-sm text-amber-700 space-y-1">
                  <li><strong>Continue with custom dataset</strong> - Use your previously uploaded data</li>
                  <li><strong>Switch to default dataset</strong> - Reset to the standard analysis dataset</li>
                </ul>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:gap-0 mt-2">
          <Button variant="outline" className="sm:w-auto border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800" onClick={onCancel}>
            Continue with Custom Dataset
          </Button>
          <Button variant="default" className="sm:w-auto bg-slate-800 hover:bg-slate-900" onClick={onConfirm}>
            Switch to Default Dataset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DatasetResetPopup; 