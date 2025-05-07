import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useCRM } from '@/context/hooks';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  employeeCreationLimit: z.coerce
    .number({ invalid_type_error: "Limit must be a number." })
    .int({ message: "Limit must be a whole number." })
    .min(0, { message: "Limit cannot be negative." })
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddAdminPage() {
  // Hooks must be called at the top level
  const { addAdmin, currentUser } = useCRM();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [logoFile, setLogoFile] = React.useState<File | null>(null); // State for the logo file

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      employeeCreationLimit: 10, // Default limit, adjust as needed
    },
  });

  // Only developers can add admins - Render check after hooks
  if (currentUser?.role !== 'developer') {
    // Maybe navigate away or show unauthorized message
    return <Layout><p>Unauthorized</p></Layout>; 
  }

  // Handler for file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setLogoFile(event.target.files[0]);
    } else {
      setLogoFile(null);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    formData.append('password', data.password);
    if (data.employeeCreationLimit !== undefined) {
      formData.append('employeeCreationLimit', String(data.employeeCreationLimit));
    }
    if (logoFile) {
      formData.append('logo', logoFile); // Use 'logo' as the key, matching backend multer field name
    }

    try {
      // Pass FormData to addAdmin
      // We'll need to ensure addAdmin handles FormData
      await addAdmin(formData);
      toast({
        title: "Admin Created",
        description: `${data.name} has been added as an Admin.`,
      });
      navigate('/users');
    } catch (error) {
      console.error("Failed to add admin:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create admin.",
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
          <CardHeader>
            <CardTitle>Add New Admin</CardTitle>
            <CardDescription>
              Fill in the details to create a new administrator account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader>
                   {/* ... */}
                </CardHeader>
                <CardContent className="space-y-4">
                   <FormField
                     control={form.control}
                     name="name"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel htmlFor="admin-name">Name</FormLabel>
                         <FormControl>
                           <Input id="admin-name" placeholder="Admin's full name" {...field} />
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
                         <FormLabel htmlFor="admin-email">Email</FormLabel>
                         <FormControl>
                           <Input id="admin-email" type="email" placeholder="admin@example.com" {...field} />
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
                         <FormLabel htmlFor="admin-password">Password</FormLabel>
                         <FormControl>
                           <Input id="admin-password" type="password" placeholder="********" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                      )}
                   />
                   <FormField
                      control={form.control}
                      name="employeeCreationLimit"
                      render={({ field }) => (
                       <FormItem>
                         <FormLabel htmlFor="admin-limit">Employee Creation Limit</FormLabel>
                         <FormControl>
                           <Input id="admin-limit" type="number" placeholder="Enter limit" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                      )}
                   />
                   <FormItem>
                     <FormLabel htmlFor="admin-logo">Logo (Optional)</FormLabel>
                     <FormControl>
                       <Input id="admin-logo" type="file" accept="image/*" onChange={handleFileChange} />
                     </FormControl>
                     <FormMessage />
                     {logoFile && <p className="text-sm text-muted-foreground mt-1">Selected: {logoFile.name}</p>}
                   </FormItem>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                   <Button variant="outline" type="button" onClick={() => navigate('/users')} disabled={isLoading}>
                      Cancel
                   </Button>
                   <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Creating..." : "Create Admin"}
                   </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
} 