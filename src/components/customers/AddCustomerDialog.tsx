import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCRM } from "@/context/hooks";
import { useToast } from "@/hooks/use-toast";
import { ServiceType, User } from "@/types";
import { DatePicker } from "@/components/ui/date-picker";

interface AddCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  mobile: z.string().min(10, 'Mobile number must be at least 10 digits'),
  city: z.string().min(1, 'City is required'),
  serviceTypes: z.array(z.enum(["training", "wealth", "equity", "insurance", "mutual_funds", "pms", "aif", "others"] as const)).min(1, "At least one service type is required"),
  startDate: z.date(),
  assignedTo: z.string().optional(),
  dob: z.date().optional(),
  address: z.string().optional(),
  paymentType: z.enum(['full_payment', 'partial_payment']).optional(),
  paymentStatus: z.enum(['Completed', 'Not Completed']).optional(),
  aum: z.string().optional(),
  nextRenewal: z.date().optional(),
  nextReview: z.date().optional(),
  reviewRemarks: z.string().optional(),
  batchNo: z.string().optional(),
  company: z.string().optional(),
  welcomeEmail: z.boolean(),
  community: z.boolean(),
  calls: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddCustomerDialog({ isOpen, onClose }: AddCustomerDialogProps) {
  const { addCustomer, users, currentUser, isLoadingUsers } = useCRM();
  const { toast } = useToast();

  // Get available roles based on current user
  const availableUsers = React.useMemo(() => {
    console.log("Calculating available users. Current user:", currentUser);
    console.log("All users:", users);
    
    if (!currentUser || !users) {
      console.log("No current user or users array is empty");
      return [];
    }
    
    let filteredUsers: User[] = [];
    
    if (currentUser.role === 'developer' || currentUser.role === 'admin') {
      // Show all users except developers for admin/developer
      filteredUsers = users.filter(u => u.role !== 'developer');
    } else if (currentUser.role === 'employee') {
      // For employees, show only themselves if they have assignCustomers permission
      if (currentUser.permissions?.assignCustomers) {
        filteredUsers = [currentUser];
      }
    }
    
    console.log("Filtered users:", filteredUsers);
    return filteredUsers;
  }, [users, currentUser]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      city: "",
      serviceTypes: ["training"],
      startDate: new Date(),
      assignedTo: currentUser?.id || "", // Default to current user's ID
      dob: undefined,
      address: "",
      paymentType: "full_payment",
      aum: "",
      nextRenewal: undefined,
      nextReview: undefined,
      reviewRemarks: "",
      batchNo: "",
      company: "",
      welcomeEmail: false,
      community: false,
      calls: false,
    },
  });

  // Show loading state while users are being fetched
  if (isLoadingUsers) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center">
            <p>Loading user data...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSubmit = async (data: FormValues) => {
    try {
      const numericAum = data.aum ? parseFloat(data.aum) : undefined;
      
      const customerPayload = {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        city: data.city,
        serviceTypes: data.serviceTypes.map(type => 
          type === "pms" ? "PMS" : 
          type === "aif" ? "AIF" : 
          type
        ),
        startDate: data.startDate || new Date(),
        assignedTo: data.assignedTo || undefined,
        dob: data.dob,
        address: data.address,
        engagementFlags: {
          welcomeEmail: data.welcomeEmail,
          community: data.community,
          calls: data.calls,
        },
        status: "active",
        aum: (numericAum && !isNaN(numericAum)) ? numericAum : undefined,
        paymentType: data.paymentType,
        nextRenewal: data.nextRenewal,
        nextReview: data.nextReview,
        reviewRemarks: data.reviewRemarks,
        batchNo: data.batchNo,
        company: data.company,
      };

      console.log('Sending customer payload:', customerPayload);
      await addCustomer(customerPayload);
      
      toast({
        title: "Customer added",
        description: `${data.name} has been added as a ${data.serviceTypes.join(', ')} customer.`,
      });
      
      form.reset();
      onClose();
    } catch (error) {
      console.error('Error adding customer:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add customer. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Basic Information */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Customer name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl>
                      <Input placeholder="Mobile number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="serviceTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Types</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const currentTypes = field.value || [];
                        if (!currentTypes.includes(value as typeof currentTypes[0])) {
                          field.onChange([...currentTypes, value as typeof currentTypes[0]]);
                        }
                      }}
                      value={undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(["training", "wealth", "equity", "insurance", "mutual_funds", "pms", "aif", "others"] as const).map((type) => (
                          <SelectItem key={type} value={type} disabled={field.value?.includes(type)}>
                            {type === "pms" ? "PMS" : type === "aif" ? "AIF" : type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {field.value?.map((type) => (
                        <div
                          key={type}
                          className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md text-sm"
                        >
                          <span>{type === "pms" ? "PMS" : type === "aif" ? "AIF" : type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')}</span>
                          <button
                            type="button"
                            onClick={() => {
                              field.onChange(field.value.filter(t => t !== type));
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <DatePicker
                      date={field.value}
                      setDate={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!['developer', 'admin'].includes(currentUser?.role || '')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.position})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
                    <DatePicker
                      date={field.value}
                      setDate={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="full_payment">Full Payment</SelectItem>
                        <SelectItem value="partial_payment">Partial Payment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="aum"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AUM</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="AUM value" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Engagement Flags */}
            <div className="space-y-2">
              <FormLabel>Engagement Status</FormLabel>
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="welcomeEmail"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Welcome Email</FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="community"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Community</FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="calls"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Calls</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button type="submit" className="w-full">Add Customer</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
