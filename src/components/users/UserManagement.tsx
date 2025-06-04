import React, { useMemo, useEffect, useState } from 'react';
import { useCRM } from '../../contexts/CRMContext';
import { Button } from '../../components/ui/button';
import { Table, TableHeader, TableBody, TableCell, TableHead, TableRow } from '../../components/ui/table';
import { AddUserDialog } from './AddUserDialog';
import { EditUserPermissionsDialog } from './EditUserPermissionsDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export function UserManagement() {
  const { users, currentUser, deleteUser, fetchUsers, updateUserPermissions } = useCRM();
  const { toast } = useToast();
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter users based on current user's role and permissions
  const filteredUsers = useMemo(() => {
    if (!currentUser) return [];
    
    if (currentUser.role === 'developer') {
      return users;
    }
    if (currentUser.role === 'admin') {
      return users.filter(user => 
        user.id === currentUser.id || user.createdByAdminId === currentUser.id
      );
    }
    return users.filter(user => user.id === currentUser.id);
  }, [users, currentUser]);

  // Refresh users when component mounts and after any changes
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        await fetchUsers();
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load users. Please try refreshing the page."
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, [fetchUsers, toast]);

  const handleEditPermissions = (user) => {
    if (!canEditUserPerms(user)) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "You don't have permission to edit this user's permissions"
      });
      return;
    }
    setSelectedUser(user);
    setIsPermissionsDialogOpen(true);
  };

  const handleDeleteUser = (user) => {
    if (!canDeleteUser(user)) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "You don't have permission to delete this user"
      });
      return;
    }
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handlePermissionsUpdate = async (userId, permissions) => {
    try {
      await updateUserPermissions(userId, permissions);
      await fetchUsers(); // Refresh the user list after permissions are updated
      toast({
        title: "Success",
        description: "Permissions updated successfully"
      });
      setIsPermissionsDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update permissions"
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser(selectedUser.id);
      await fetchUsers(); // Refresh the user list after deletion
      toast({
        title: "Success",
        description: "User deleted successfully"
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user"
      });
    }
  };

  // Permission check helpers
  const canEditUserPerms = (targetUser) => {
    if (!currentUser?.permissions?.editUserPermissions) return false;
    if (currentUser.role === 'developer') return true;
    if (currentUser.role === 'admin' && targetUser.createdByAdminId === currentUser.id) return true;
    return false;
  };

  const canDeleteUser = (targetUser) => {
    if (!currentUser?.permissions?.deleteUser) return false;
    if (targetUser.id === currentUser.id) return false;
    if (currentUser.role === 'developer') return true;
    if (currentUser.role === 'admin' && targetUser.createdByAdminId === currentUser.id) return true;
    return false;
  };

  const canAddUser = () => {
    if (!currentUser) return false;
    return currentUser.permissions?.createEmployee || currentUser.permissions?.createAdmin;
  };
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">User Management</h2>
        {canAddUser() && (
          <Button onClick={() => setIsAddUserDialogOpen(true)}>Add User</Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4">
                Loading users...
              </TableCell>
            </TableRow>
          ) : filteredUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => handleEditPermissions(user)}
                      disabled={!canEditUserPerms(user)}
                    >
                      Edit Permissions
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteUser(user)}
                      disabled={!canDeleteUser(user)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AddUserDialog
        open={isAddUserDialogOpen}
        onOpenChange={setIsAddUserDialogOpen}
      />

      {selectedUser && (
        <EditUserPermissionsDialog
          isOpen={isPermissionsDialogOpen}
          onClose={() => {
            setIsPermissionsDialogOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onUpdatePermissions={handlePermissionsUpdate}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              <strong> {selectedUser?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 