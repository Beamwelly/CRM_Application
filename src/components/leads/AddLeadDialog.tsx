import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRM } from "@/context/hooks";
import { ServiceType, User, TrainingLeadStatus, WealthLeadStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface AddLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// Define base schema without cross-field validation
const baseFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'),
  city: z.string().min(1, 'City is required'),
  serviceTypes: z.array(z.enum(["training", "wealth", "equity", "insurance", "mutual_funds", "pms", "aif", "others"] as const)).min(1, "At least one service type is required"),
  leadSource: z.enum(["walk_in", "reference"]), 
  referredBy: z.string().optional(),
  company: z.string().optional(),
  // Keep AUM as string for form input, refine later
  aum: z.string().optional(), 
  assignedTo: z.string().uuid("Invalid user UUID").optional().nullable(),
});

// Use the base schema and add superRefine for conditional validation
const formSchema = baseFormSchema.superRefine((data, ctx) => {
  if (data.serviceTypes.includes('training')) {
    if (!data.company || data.company.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Company is required for Training',
        path: ['company'],
      });
    }
    if (!data.aum || data.aum.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'AUM is required for Training',
        path: ['aum'],
      });
    }
  }
});

type FormValues = z.infer<typeof formSchema>;

export function AddLeadDialog({ isOpen, onClose }: AddLeadDialogProps) {
  const { addLead, users, currentUser } = useCRM();
  const { toast } = useToast();
  
  // Get available roles based on current user
  const availableUsers = React.useMemo(() => {
    if (!currentUser) return [];
    
    if (currentUser.role === 'developer' || currentUser.role === 'admin') {
      return users.filter(u => u.role === 'employee');
    }
    
    if (currentUser.role === 'employee') {
      return [currentUser];
    }
    
    return [];
  }, [users, currentUser]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema), // Use reverted schema
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      city: "",
      serviceTypes: ["training"],
      leadSource: "walk_in",
      referredBy: "",
      company: "",
      aum: "",
      assignedTo: currentUser?.role === "employee" ? currentUser.id : "",
    },
  });
  
  const leadSource = form.watch("leadSource");

  const handleSubmit = (data: FormValues) => {
    const numericAum = data.aum ? parseFloat(data.aum) : undefined;
    
    const leadPayload = {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        city: data.city,
        serviceTypes: data.serviceTypes,
        leadSource: data.leadSource,
        referredBy: data.referredBy,
        company: data.company,
        aum: (numericAum && !isNaN(numericAum)) ? numericAum : undefined,
        assignedTo: data.assignedTo || undefined,
        status: "new" as TrainingLeadStatus | WealthLeadStatus,
    };

    addLead(leadPayload);
    
    toast({
      title: "Lead added",
      description: `${data.name} has been added as a ${data.serviceTypes.join(', ')} lead.`,
    });
    
    form.reset();
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        placeholder="Mobile number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serviceTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Types</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const currentTypes = field.value || [];
                        if (!currentTypes.includes(value as ServiceType)) {
                          field.onChange([...currentTypes, value as ServiceType]);
                        }
                      }}
                      value={undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service types" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["training","wealth", "equity", "insurance", "mutual_funds", "pms", "aif", "others"].map((type) => (
                          <SelectItem key={type} value={type} disabled={field.value?.includes(type as ServiceType)}>
                            {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                          <span>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
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
              
              {form.watch('serviceTypes').includes('training') && (
                <FormField
                  control={form.control}
                  name="aum"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AUM</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Assets Under Management" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="leadSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Source</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select lead source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="walk_in">Walk-in</SelectItem>
                        <SelectItem value="reference">Reference</SelectItem>
                      </SelectContent>
                    </Select>
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
                      value={field.value || ""}
                      disabled={currentUser?.role === 'employee'}
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

            {leadSource === "reference" && (
              <FormField
                control={form.control}
                name="referredBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referred By</FormLabel>
                    <FormControl>
                      <Input placeholder="Name of person who referred" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company{form.watch('serviceTypes').includes('training') ? '' : ' (Optional)'}</FormLabel>
                  <FormControl>
                    <Input placeholder="Company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full">Add Lead</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
