import React from 'react';
import { User, UserPermissions } from '@/types';
import { useCRM } from '@/context/hooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose // Import DialogClose if needed for implicit closing
} from "@/components/ui/dialog";
import { PermissionsEditor } from './PermissionsEditor'; // Import the editor

interface EditUserPermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export function EditUserPermissionsDialog({ isOpen, onClose, user }: EditUserPermissionsDialogProps) {
  const { updateUserPermissions } = useCRM(); // Get the update function from context

  // The PermissionsEditor handles its own saving state and calls this function
  const handleUpdatePermissions = async (userId: string, permissions: UserPermissions) => {
    // The updateUserPermissions function from CRMContext already handles API call & state update
    await updateUserPermissions(userId, permissions);
    // The PermissionsEditor shows success/error toasts
    onClose(); // Close dialog after successful update (PermissionsEditor also calls onClose on success)
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl"> {/* Use a wider dialog for permissions */}
        <DialogHeader>
          <DialogTitle>Edit Permissions for {user.name}</DialogTitle>
          <DialogDescription>
            Adjust the access levels for {user.email}.
          </DialogDescription>
        </DialogHeader>

        {/* Pass user and the update handler to the editor */}
        <PermissionsEditor 
          user={user} 
          onUpdatePermissions={handleUpdatePermissions} 
          onClose={onClose} // Pass onClose so the editor can close the dialog
        />
        {/* Footer is part of PermissionsEditor */}
      </DialogContent>
    </Dialog>
  );
} 