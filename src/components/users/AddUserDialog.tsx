import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRM } from '@/context/hooks';
import { Role, User, UserPermissions, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_EMPLOYEE_PERMISSIONS } from '@/types';
import { useToast } from '@/hooks/use-toast';
// Placeholder for permissions component
// import { PermissionsEditor } from './PermissionsEditor';

interface AddUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  // onUserAdded: (newUser: User) => void; // Callback after successful add
}

// Base schema
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  role: z.enum(['relationship_manager', 'operations_executive', 'accountant', 'senior_sales_manager', 'junior_sales_manager']),
  createdBy: z.string().uuid().optional().nullable(),
  permissions: z.any(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddUserDialog({ isOpen, onClose }: AddUserDialogProps) {
  const { currentUser, users, addUser } = useCRM();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Determine which roles the current user can create
  const creatableRoles = ['relationship_manager', 'operations_executive', 'accountant', 'senior_sales_manager', 'junior_sales_manager'] as const;
  
  if (currentUser?.role === 'developer') {
    // Developer can create all roles
  } else if (currentUser?.role === 'admin') {
    // Admin can create all roles
  } else {
    // No roles can be created
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: creatableRoles[0],
      createdBy: currentUser?.id || null,
      permissions: DEFAULT_EMPLOYEE_PERMISSIONS,
    },
  });

  // Update default permissions when role changes
  const selectedRole = form.watch('role');
  useEffect(() => {
    if (selectedRole) {
      form.setValue('permissions', DEFAULT_EMPLOYEE_PERMISSIONS);
    }
  }, [selectedRole, form]);

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    
    const userDataForApi = {
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      permissions: data.permissions,
      createdBy: currentUser?.id,
    };

    try {
      await addUser(userDataForApi);
      toast({ title: "User Created", description: `User ${data.name} has been added as a ${data.role.replace(/_/g, ' ')}.` });
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to add user:", error);
      toast({ 
        title: "Error Creating User", 
        description: error instanceof Error ? error.message : "An unknown error occurred", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Fill in the details for the new user and assign permissions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Basic Info Fields */}
            <FormField name="name" control={form.control} render={({ field }) => (
              <FormItem> <FormLabel>Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem>
            )} />
            <FormField name="email" control={form.control} render={({ field }) => (
              <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input type="email" {...field} /></FormControl> <FormMessage /> </FormItem>
            )} />
            <FormField name="password" control={form.control} render={({ field }) => (
              <FormItem> <FormLabel>Password</FormLabel> <FormControl><Input type="password" {...field} /></FormControl> <FormMessage /> </FormItem>
            )} />

            {/* Role Selection */}
            <FormField name="role" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {creatableRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {role.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* TODO: Permissions Editor Component Placeholder */}
            <div>
                <h3 className="text-lg font-medium mb-2">Permissions</h3>
                <div className="p-4 border rounded-md bg-muted/40">
                    <p className="text-sm text-muted-foreground">Permissions editor UI will go here. Currently uses defaults based on selected role.</p>
                     {/* Example: <PermissionsEditor control={form.control} name="permissions" /> */}
                </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating User..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 