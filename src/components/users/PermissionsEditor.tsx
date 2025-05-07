import React from 'react';
import { User, UserPermissions, DataAccessScope, CommunicationAccessScope, UserViewScope } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

interface PermissionsEditorProps {
  user: User;
  onUpdatePermissions: (userId: string, permissions: UserPermissions) => Promise<void>; // Function to call when saving
  onClose?: () => void; // Optional close handler (e.g., if in a dialog)
}

// Define options for Select components
const dataAccessScopeOptions: DataAccessScope[] = ['all', 'assigned', 'created', 'subordinates', 'none'];
const communicationAccessScopeOptions: CommunicationAccessScope[] = ['all', 'assignedContacts', 'created', 'none'];
const userViewScopeOptions: UserViewScope[] = ['all', 'subordinates', 'none'];

export function PermissionsEditor({ user, onUpdatePermissions, onClose }: PermissionsEditorProps) {
  const { toast } = useToast();
  const [currentPermissions, setCurrentPermissions] = React.useState<UserPermissions>(user.permissions || {});
  const [isSaving, setIsSaving] = React.useState(false);
  
  const isDeveloper = user.role === 'developer';
  const isAdmin = user.role === 'admin';
  const isEmployee = user.role === 'employee';

  // --- Permission Change Handler ---
  const handlePermissionChange = (
    key: keyof UserPermissions, 
    value: boolean | DataAccessScope | CommunicationAccessScope | UserViewScope | undefined
  ) => {
    setCurrentPermissions(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdatePermissions(user.id, currentPermissions);
      toast({
        title: "Permissions Updated",
        description: `Permissions for ${user.name} saved successfully.`,
      });
      if (onClose) onClose();
    } catch (error) {
      console.error("Failed to save permissions:", error);
      toast({
        title: "Error Saving Permissions",
        description: error instanceof Error ? error.message : "Could not update permissions.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Render Helper for Permission Controls ---
  const renderSwitch = (id: keyof UserPermissions, label: string, disabled: boolean = false) => (
    <div className="flex items-center justify-between space-x-2 p-2 border rounded">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Switch
        id={id}
        checked={!!currentPermissions[id]}
        onCheckedChange={(checked) => handlePermissionChange(id, checked)}
        disabled={disabled || isSaving}
      />
    </div>
  );

  const renderSelect = (
    id: keyof UserPermissions, 
    label: string, 
    options: string[], 
    disabled: boolean = false
  ) => (
    <div className="flex items-center justify-between space-x-2 p-2 border rounded">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Select
        value={currentPermissions[id] as string || 'none'}
        onValueChange={(value) => handlePermissionChange(id, value as DataAccessScope | CommunicationAccessScope | UserViewScope)}
        disabled={disabled || isSaving}
      >
        <SelectTrigger id={id} className="w-[180px]">
          <SelectValue placeholder="Select scope" />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option} value={option}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        {/* Title and Description are now handled by the Dialog wrapper */}
        {/* <CardTitle>Edit Permissions for {user.name} ({user.role})</CardTitle> */}
        {/* <CardDescription>Configure access levels for different CRM modules.</CardDescription> */}
      </CardHeader>
      {/* Added max-height and overflow for scrollability */}
      <CardContent className="space-y-6 max-h-[70vh] overflow-y-auto p-4"> 
        {/* --- Leads Permissions --- */}
        <div className="space-y-2">
          <h4 className="font-semibold">Leads</h4>
          {renderSelect('viewLeads', 'View Leads Scope', dataAccessScopeOptions)}
          {renderSwitch('createLeads', 'Create Leads')}
          {renderSelect('editLeads', 'Edit Leads Scope', dataAccessScopeOptions)}
          {renderSelect('deleteLeads', 'Delete Leads Scope', dataAccessScopeOptions)}
          {renderSwitch('assignLeads', 'Assign Leads')}
        </div>

        {/* --- Customers Permissions --- */}
        <div className="space-y-2">
          <h4 className="font-semibold">Customers</h4>
          {renderSelect('viewCustomers', 'View Customers Scope', dataAccessScopeOptions)}
          {renderSwitch('createCustomers', 'Create Customers')}
          {renderSelect('editCustomers', 'Edit Customers Scope', dataAccessScopeOptions)}
          {renderSelect('deleteCustomers', 'Delete Customers Scope', dataAccessScopeOptions)}
          {renderSwitch('manageRenewals', 'Manage Renewals')}
        </div>

        {/* --- Communications Permissions --- */}
        <div className="space-y-2">
          <h4 className="font-semibold">Communications</h4>
          {renderSelect('viewCommunications', 'View Communications Scope', communicationAccessScopeOptions)}
          {renderSwitch('addCommunications', 'Add Communications')}
          {renderSwitch('playRecordings', 'Play Call Recordings')}
          {renderSwitch('downloadRecordings', 'Download Call Recordings')}
        </div>

        {/* --- User Management Permissions --- */}
        <div className="space-y-2">
          <h4 className="font-semibold">User Management</h4>
          {renderSelect('viewUsers', 'View Users Scope', userViewScopeOptions, isEmployee)} 
          {renderSwitch('createAdmin', 'Create Admins', !isDeveloper)} 
          {renderSwitch('createEmployee', 'Create Employees', isEmployee)}
          {renderSwitch('editUserPermissions', 'Edit User Permissions', isEmployee)}
          {renderSwitch('deleteUser', 'Delete Users', isEmployee)}
        </div>

         {/* --- System Permissions --- */}
         <div className="space-y-2">
          <h4 className="font-semibold">System</h4>
          {renderSwitch('clearSystemData', 'Clear System Data (Leads/Customers)', !isDeveloper)}
        </div>
        
        {/* --- Save/Cancel Buttons --- */}
        <div className="flex justify-end space-x-2 pt-4">
          {onClose && (
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Permissions"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 