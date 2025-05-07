import React, { useState } from 'react';
import { User } from '@/types';
import { useCRM } from '@/context/hooks';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Edit, Trash, ShieldQuestion } from 'lucide-react';
// Import Alert Dialog components if needed for delete confirmation
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
// Import EditUserPermissionsDialog
import { EditUserPermissionsDialog } from './EditUserPermissionsDialog';

interface UserListProps {
  users: User[];
}

export function UserList({ users }: UserListProps) {
  const { currentUser, deleteUser /*, updateUserPermissions */ } = useCRM(); // Use deleteUser from context
  const [isEditPermsOpen, setIsEditPermsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // --- Permission Check Helpers ---
  const canEditUserPerms = (targetUser: User): boolean => {
    if (!currentUser || !currentUser.permissions?.editUserPermissions) return false;
    if (currentUser.role === 'developer') return true; // Developer can edit anyone
    if (currentUser.role === 'admin' && targetUser.createdByAdminId === currentUser.id) return true; // Admin can edit own employees
    return false;
  };

  const canDeleteUser = (targetUser: User): boolean => {
    if (!currentUser || !currentUser.permissions?.deleteUser) return false;
    if (targetUser.id === currentUser.id) return false; // Cannot delete self
    if (currentUser.role === 'developer') return true; // Developer can delete anyone (except self)
    if (currentUser.role === 'admin' && targetUser.createdByAdminId === currentUser.id) return true; // Admin can delete own employees
    return false;
  };
  // --- End Permission Check Helpers ---

  const handleEditPermissions = (user: User) => {
    setSelectedUser(user);
    setIsEditPermsOpen(true);
  };

  const handleDeleteConfirm = (user: User) => {
    setSelectedUser(user);
    setIsDeleteConfirmOpen(true);
  };

  const handleDelete = async () => { // Make async
    if (selectedUser) {
      // console.log('TODO: Call deleteUser context function', selectedUser.id);
      try {
        await deleteUser(selectedUser.id); // Call context function
        // Optional: Show success toast
      } catch (error) {
        console.error("Error deleting user from UserList:", error);
        // Optional: Show error toast
      }
      setIsDeleteConfirmOpen(false);
      setSelectedUser(null);
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "destructive" | "outline" | "secondary" => {
     switch (role) {
       case 'developer': return 'destructive';
       case 'admin': return 'secondary';
       case 'employee': return 'outline';
       default: return 'default';
     }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            {/* Add other relevant columns like Created At, Created By Admin, Limit? */}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={user.id === currentUser?.id}> {/* Disable actions on self */}
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">User Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleEditPermissions(user)} 
                        disabled={!canEditUserPerms(user)} 
                      >
                        <ShieldQuestion className="mr-2 h-4 w-4" />
                        Edit Permissions
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteConfirm(user)} 
                        disabled={!canDeleteUser(user)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Edit Permissions Dialog */}
      {selectedUser && isEditPermsOpen && (
        <EditUserPermissionsDialog
          isOpen={isEditPermsOpen}
          onClose={() => { setIsEditPermsOpen(false); setSelectedUser(null); }}
          user={selectedUser}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the user "{selectedUser?.name}" ({selectedUser?.email})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 