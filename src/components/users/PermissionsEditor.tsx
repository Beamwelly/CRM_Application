import React, { useState } from 'react';
import { User, UserPermissions, ServiceType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  onUpdatePermissions: (userId: string, permissions: UserPermissions) => Promise<void>;
  onClose?: () => void;
}

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: "training", label: "Training" },
  { value: "wealth", label: "Wealth" },
  { value: "equity", label: "Equity" },
  { value: "insurance", label: "Insurance" },
  { value: "mutual_funds", label: "Mutual Funds" },
  { value: "PMS", label: "PMS" },
  { value: "AIF", label: "AIF" },
  { value: "others", label: "Others" }
];

export function PermissionsEditor({ user, onUpdatePermissions, onClose }: PermissionsEditorProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [currentPermissions, setCurrentPermissions] = useState<UserPermissions>(() => {
    // Start with existing permissions or defaults
    const basePermissions = user.permissions || {
      viewLeads: 'none',
      createLead: false,
      editLead: false,
      deleteLead: false,
      viewCustomers: 'none',
      createCustomer: false,
      editCustomer: false,
      deleteCustomer: false,
      viewCommunications: 'none',
      createCommunication: false,
      editCommunication: false,
      deleteCommunication: false,
      viewUsers: 'none',
      createEmployee: false,
      createAdmin: false,
      editUserPermissions: false,
      deleteUser: false
    };

    // Ensure serviceTypeAccess is always an array
    return {
      ...basePermissions,
      serviceTypeAccess: Array.isArray(basePermissions.serviceTypeAccess) 
        ? basePermissions.serviceTypeAccess 
        : []
    };
  });

  const handleScopeChange = (permission: keyof UserPermissions, value: string) => {
    setCurrentPermissions(prev => ({
      ...prev,
      [permission]: value
    }));
  };

  const handleBooleanChange = (permission: keyof UserPermissions, value: boolean) => {
    setCurrentPermissions(prev => ({
      ...prev,
      [permission]: value
    }));
  };

  const handleServiceTypeChange = (serviceType: ServiceType, checked: boolean) => {
    setCurrentPermissions(prev => ({
      ...prev,
      serviceTypeAccess: checked
        ? [...(prev.serviceTypeAccess || []), serviceType]
        : (prev.serviceTypeAccess || []).filter(st => st !== serviceType)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdatePermissions(user.id, currentPermissions);
      toast({
        title: "Success",
        description: "Permissions updated successfully"
      });
      if (onClose) onClose();
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update permissions"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderScopeSelect = (permission: keyof UserPermissions, label: string) => (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor={permission}>{label}</Label>
      <Select
        value={currentPermissions[permission] as string}
        onValueChange={(value) => handleScopeChange(permission, value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select scope" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          <SelectItem value="own">Own</SelectItem>
          <SelectItem value="subordinates">Subordinates</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const renderBooleanSwitch = (permission: keyof UserPermissions, label: string) => (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor={permission}>{label}</Label>
      <Switch
        id={permission}
        checked={currentPermissions[permission] as boolean}
        onCheckedChange={(checked) => handleBooleanChange(permission, checked)}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Leads</h3>
        {renderScopeSelect('viewLeads', 'View Leads')}
        {renderBooleanSwitch('createLead', 'Create Lead')}
        {renderBooleanSwitch('editLead', 'Edit Lead')}
        {renderBooleanSwitch('deleteLead', 'Delete Lead')}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Customers</h3>
        {renderScopeSelect('viewCustomers', 'View Customers')}
        {renderBooleanSwitch('createCustomer', 'Create Customer')}
        {renderBooleanSwitch('editCustomer', 'Edit Customer')}
        {renderBooleanSwitch('deleteCustomer', 'Delete Customer')}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Communications</h3>
        {renderScopeSelect('viewCommunications', 'View Communications')}
        {renderBooleanSwitch('createCommunication', 'Create Communication')}
        {renderBooleanSwitch('editCommunication', 'Edit Communication')}
        {renderBooleanSwitch('deleteCommunication', 'Delete Communication')}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">User Management</h3>
        {renderScopeSelect('viewUsers', 'View Users')}
        {renderBooleanSwitch('createEmployee', 'Create Employee')}
        {renderBooleanSwitch('createAdmin', 'Create Admin')}
        {renderBooleanSwitch('editUserPermissions', 'Edit User Permissions')}
        {renderBooleanSwitch('deleteUser', 'Delete User')}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Service Types</h3>
        <div className="grid grid-cols-2 gap-4">
          {SERVICE_TYPES.map(({ value, label }) => (
            <div key={value} className="flex items-center space-x-2">
              <Switch
                id={value}
                checked={(currentPermissions.serviceTypeAccess || []).includes(value)}
                onCheckedChange={(checked) => handleServiceTypeChange(value, checked)}
              />
              <Label htmlFor={value}>{label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
} 