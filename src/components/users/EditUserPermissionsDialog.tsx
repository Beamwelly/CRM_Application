import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { PermissionsEditor } from './PermissionsEditor';
import { User } from '../../types';
import { Button } from '../../components/ui/button';

interface EditUserPermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSave: (userId: string, permissions: any) => Promise<void>;
}

export function EditUserPermissionsDialog({ isOpen, onClose, user, onSave }: EditUserPermissionsDialogProps) {
  const [permissions, setPermissions] = useState<UserPermissions>(user.permissions);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(user.id, permissions);
      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Permissions for {user.name}</DialogTitle>
          <DialogDescription>
            Configure what actions this user can perform in the system.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <PermissionsEditor
            user={user}
            onUpdatePermissions={(newPermissions) => setPermissions(newPermissions)}
            onClose={onClose}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 