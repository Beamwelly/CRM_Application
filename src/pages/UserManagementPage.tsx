import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { useCRM } from '@/context/hooks';
// import { userService } from '@/services/userService'; // We'll add this later
import { UserList } from '@/components/users/UserList'; // Assuming this component exists
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { EditUserPermissionsDialog } from '@/components/users/EditUserPermissionsDialog';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Trash, Settings } from 'lucide-react';

export function UserManagementPage() {
  const { 
    users, 
    isLoadingUsers, 
    errorLoadingUsers, 
    deleteUser, 
    currentUser, 
    updateUserPermissions 
  } = useCRM();
  const navigate = useNavigate();

  // State for permission editing dialog
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<User | null>(null);
  
  // State for delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<User | null>(null);

  // Permissions check for adding users
  const canAddAdmin = currentUser?.permissions?.createAdmin ?? false;
  const canAddEmployee = currentUser?.permissions?.createEmployee ?? false;
  const canEditPermissions = currentUser?.permissions?.editUserPermissions ?? false;
  const canDeleteUserPermission = currentUser?.permissions?.deleteUser ?? false;

  // Helper to get creator name
  const getUserNameById = (userId?: string | null): string => {
    if (!userId) return "System"; // Or "N/A" or an empty string
    const user = users.find(u => u.id === userId);
    return user ? user.name : "Unknown User";
  };

  const handleDeleteUser = async () => {
    if (selectedUserForDelete) {
      try {
        await deleteUser(selectedUserForDelete.id);
        // toast({ title: "User Deleted", description: `${selectedUserForDelete.name} has been deleted.` });
        setIsDeleteDialogOpen(false);
        setSelectedUserForDelete(null);
      } catch (error) {
        console.error("Delete user error:", error);
        // toast({ title: "Error", description: `Failed to delete ${selectedUserForDelete.name}.`, variant: "destructive" });
      }
    }
  };

  if (isLoadingUsers) return <Layout><div>Loading users...</div></Layout>;
  if (errorLoadingUsers) return <Layout><div>Error loading users: {errorLoadingUsers}</div></Layout>;

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">User Management</h1>
          <div className="flex gap-2">
            {(canAddAdmin || canAddEmployee) && (
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Add User</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    {canAddAdmin && <DropdownMenuItem onClick={() => navigate('/users/add-admin')}>Add Admin</DropdownMenuItem>}
                    {canAddEmployee && <DropdownMenuItem onClick={() => navigate('/users/add-employee')}>Add Employee</DropdownMenuItem>}
                </DropdownMenuContent>
                </DropdownMenu>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="capitalize">{user.role}</TableCell>
                      <TableCell>{getUserNameById(user.createdByAdminId || user.createdBy)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEditPermissions && (
                                <DropdownMenuItem 
                                    onClick={() => { setSelectedUserForPermissions(user); setIsPermissionsDialogOpen(true); }}
                                    disabled={user.id === currentUser?.id || user.role === 'developer'}
                                >
                                <Settings className="mr-2 h-4 w-4" /> Edit Permissions
                                </DropdownMenuItem>
                            )}
                             {canDeleteUserPermission && (
                                <DropdownMenuItem 
                                    onClick={() => { setSelectedUserForDelete(user); setIsDeleteDialogOpen(true); }}
                                    disabled={user.id === currentUser?.id || user.role === 'developer'}
                                    className="text-destructive focus:text-destructive"
                                >
                                <Trash className="mr-2 h-4 w-4" /> Delete User
                                </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {selectedUserForPermissions && (
        <EditUserPermissionsDialog
            isOpen={isPermissionsDialogOpen}
            onClose={() => { setIsPermissionsDialogOpen(false); setSelectedUserForPermissions(null); }}
            user={selectedUserForPermissions}
            onSave={async (userId, permissions) => {
                try {
                    await updateUserPermissions(userId, permissions);
                    // toast({ title: "Permissions Updated", description: `${selectedUserForPermissions.name}'s permissions saved.` });
                    setIsPermissionsDialogOpen(false);
                    setSelectedUserForPermissions(null);
                } catch (error) {
                    console.error("Update permissions error:", error);
                    // toast({ title: "Error", description: "Failed to update permissions.", variant: "destructive" });
                }
            }}
        />
      )}

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the user 
                    <strong>{selectedUserForDelete?.name}</strong>.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSelectedUserForDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </Layout>
  );
} 