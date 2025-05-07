import * as React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRM } from "@/context/hooks";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import { User } from '@/types'; // Import User type

// Define the base schema structure outside the component
const baseAddEmployeeSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  position: z.enum(['relationship_manager', 'operations_executive', 'accountant', 'senior_sales_manager', 'junior_sales_manager']),
  assignedAdminId: z.string().uuid("Invalid Admin UUID").optional(), // Keep optional here, refine based on role
});

// Define the type based on the base schema
type FormValues = z.infer<typeof baseAddEmployeeSchema>;

export function AddEmployeePage() {
  // Hooks first
  const { addUser, currentUser, users } = useCRM();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);

  // Create the refined schema *inside* the component, using currentUser
  const formSchema = React.useMemo(() => 
    baseAddEmployeeSchema.superRefine((data, ctx) => {
      // If the current user is a developer, the assignedAdminId becomes required
      if (currentUser?.role === 'developer' && !data.assignedAdminId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Assigning to an Admin is required for Developers.",
          path: ["assignedAdminId"],
        });
      }
    }),
    [currentUser?.role] // Re-create schema if user role changes (unlikely mid-form, but safe)
  );

  // Get list of admins for the dropdown (only needed if current user is developer)
  const admins = React.useMemo(() => 
    users.filter(user => user.role === 'admin'), 
    [users]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      assignedAdminId: undefined, // Start with no admin selected
    },
  });

  // Check authorization after hooks
  if (!currentUser || (currentUser.role !== 'developer' && currentUser.role !== 'admin')) {
     return <Layout><p>Unauthorized</p></Layout>;
  }

  const onSubmit = async (data: FormValues) => {
    // Ensure user has permission based on role (though backend should also check)
    if (!currentUser?.permissions?.createEmployee) {
       toast({ title: "Permission Denied", variant: "destructive" });
       return;
    }

    setIsLoading(true);
    try {
      // Developer can optionally assign an admin, Admin cannot (it's automatic)
      const createdByAdminId = currentUser.role === 'developer' ? data.assignedAdminId : 
                               (currentUser.role === 'admin' ? currentUser.id : null);

      await addUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'employee', // Set system role to 'employee'
        position: data.position, // Pass the job position
        permissions: {}, // Let backend assign default employee permissions
        createdByAdminId: createdByAdminId || undefined,
      });
      toast({
        title: "Employee Created",
        description: `${data.name} has been added as an Employee.`,
      });
      navigate('/users'); // Navigate back to user list
    } catch (error) {
      console.error("Failed to add employee:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create employee.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Card className="max-w-2xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle>Add New Employee</CardTitle>
                <CardDescription>
                  Fill in the details to create a new employee account.
                  {currentUser?.role === 'developer' && ' You can optionally assign them to an existing Admin.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="employee-name">Name</FormLabel>
                      <FormControl>
                        <Input id="employee-name" placeholder="Employee's full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="employee-email">Email</FormLabel>
                      <FormControl>
                        <Input id="employee-email" type="email" placeholder="employee@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="employee-password">Password</FormLabel>
                      <FormControl>
                        <Input id="employee-password" type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="employee-position">Position</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger id="employee-position">
                            <SelectValue placeholder="Select a position" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="relationship_manager">Relationship Manager</SelectItem>
                          <SelectItem value="operations_executive">Operations Executive</SelectItem>
                          <SelectItem value="accountant">Accountant</SelectItem>
                          <SelectItem value="senior_sales_manager">Senior Sales Manager</SelectItem>
                          <SelectItem value="junior_sales_manager">Junior Sales Manager</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Conditional Dropdown for Developer to Assign Admin */} 
                {currentUser?.role === 'developer' && admins.length > 0 && (
                  <FormField
                    control={form.control}
                    name="assignedAdminId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Admin <span className="text-destructive">*</span></FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an Admin to assign this employee to" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {/* No empty value needed, placeholder handles it */}
                            {admins.map(admin => (
                              <SelectItem key={admin.id} value={admin.id}>
                                {admin.name} ({admin.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {currentUser?.role === 'developer' && admins.length === 0 && (
                   <p className="text-sm text-muted-foreground">No Admins found to assign this employee to.</p>
                )}

              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                  <Button variant="outline" type="button" onClick={() => navigate('/users')} disabled={isLoading}>
                      Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Creating..." : "Create Employee"}
                  </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </Layout>
  );
} 