'use client';

import {
  Button,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components';
import { TrashIcon } from '@repo/ui/icons';

import { ModalBaseProps } from './modal-provider';

export type DeleteConfirmationModalProps = {
  title?: string;
  message?: string;
  itemType?: string; // e.g., "entry", "photo", "comment"
  onConfirm?: () => void;
  isLoading?: boolean;
};

const DeleteConfirmationModal: React.FC<ModalBaseProps<DeleteConfirmationModalProps>> = ({
  props,
  close,
}) => {
  const {
    title = 'Delete Item',
    message = 'Are you sure you want to delete this item? This action cannot be undone.',
    itemType = 'item',
    onConfirm,
    isLoading = false,
  } = props || {};

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    close();
  };

  const handleCancel = () => {
    close();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-red-600">
          <TrashIcon size={20} weight="bold" />
          {title}
        </DialogTitle>
      </DialogHeader>
      
      <div className="w-full py-4">
        <div className="flex flex-col gap-4">
          <p className="text-gray-700 leading-relaxed">
            {message}
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="text-red-500 mt-0.5">⚠️</div>
              <div className="text-sm text-red-700">
                <strong>Warning:</strong> This action is permanent and cannot be undone. 
                The {itemType} will be deleted immediately.
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button 
          variant="outline" 
          onClick={handleCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button 
          variant="destructive"
          onClick={handleConfirm}
          loading={isLoading}
          disabled={isLoading}
        >
          Delete {itemType}
        </Button>
      </DialogFooter>
    </>
  );
};

export default DeleteConfirmationModal;