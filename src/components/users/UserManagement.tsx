import React, { useMemo } from 'react';
import { useCRM } from '../../contexts/CRMContext';
import { Button } from '../../components/ui/button';
import { Table, TableHeader, TableBody, TableCell, TableHead, TableRow } from '../../components/ui/table';
import { AddUserDialog } from './AddUserDialog';

export function UserManagement() {
  const { users, currentUser, deleteUser } = useCRM();
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = React.useState(false);
  
  // Filter users based on current user's role
  const filteredUsers = React.useMemo(() => {
    if (currentUser?.role === 'developer') {
      return users;
    }
    if (currentUser?.role === 'admin') {
      return users.filter(user => user.createdBy === currentUser.id);
    }
    return [];
  }, [users, currentUser]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Management</h2>
        {(currentUser?.role === 'developer' || currentUser?.role === 'admin') && (
          <Button onClick={() => setIsAddUserDialogOpen(true)}>
            Add User
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role.replace(/_/g, ' ')}</TableCell>
                <TableCell>
                  {user.createdBy ? users.find(u => u.id === user.createdBy)?.name || 'Unknown' : 'System'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteUser(user.id)}
                    disabled={user.role === 'developer' || user.role === 'admin'}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AddUserDialog
        isOpen={isAddUserDialogOpen}
        onClose={() => setIsAddUserDialogOpen(false)}
      />
    </div>
  );
} 