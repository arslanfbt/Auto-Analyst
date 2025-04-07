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
      <DialogContent className="sm:max-w-[450px] border-gray-200 bg-white">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-[#FF7F7F]">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Dataset Selection</DialogTitle>
          </div>
          <DialogDescription className="text-base font-normal space-y-4">
            <p>
              You are currently using a custom dataset. Please note that the information shown may not be current. 
              This can happen if you refresh the page, change your session, or switch between different chats.
            </p>
            <div className="bg-[#FFE5E5] p-3 rounded-md border border-[#FFCACA] flex gap-3">
              <Database className="h-5 w-5 text-[#FF7F7F] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Please choose an option:</p>
                <ul className="list-disc ml-5 mt-1 text-sm text-gray-700 space-y-1">
                  <li><strong>Continue with custom dataset</strong> - Use your previously uploaded data</li>
                  <li><strong>Switch to Housing Dataset</strong> - Reset to the standard default dataset</li>
                </ul>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:gap-0 mt-2">
          <Button 
            variant="outline"
            className="border-[#FFCACA] text-[#FF7F7F] hover:bg-[#FFE5E5]"
            onClick={onCancel}
          >
            Continue with Custom Dataset
          </Button>
          <Button 
            variant="default"
            className="bg-[#FF7F7F] hover:bg-[#FF6666] text-white"
            onClick={onConfirm}
          >
            Switch to Housing Dataset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DatasetResetPopup; 