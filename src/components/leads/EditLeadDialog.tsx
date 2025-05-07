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
import { Lead, ServiceType, TrainingLeadStatus, WealthLeadStatus, User } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface EditLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
}

// Base schema - Reverted state
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'),
  city: z.string().min(1, 'City is required'),
  // serviceType is read-only, no need in schema for edit
  leadSource: z.enum(["walk_in", "reference"]), 
  referredBy: z.string().optional(),
  company: z.string().optional(),
  // Revert: AUM is simple optional string
  aum: z.string().optional(), 
  assignedTo: z.string().uuid("Invalid user UUID").optional().nullable(),
  status: z.string(), // Keep status dropdown value
  serviceTypes: z.array(z.enum(["training", "wealth", "equity", "insurance", "mutual_funds", "pms", "aif", "others"] as const)).min(1, "At least one service type is required"),
});

type FormValues = z.infer<typeof formSchema>;

export function EditLeadDialog({ isOpen, onClose, lead }: EditLeadDialogProps) {
  const { updateLead, users, currentUser } = useCRM();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema), // Use reverted static schema
    defaultValues: {
      name: lead.name || "",
      email: lead.email || "",
      mobile: lead.mobile || "",
      city: lead.city || "",
      leadSource: lead.leadSource || "walk_in",
      referredBy: lead.referredBy || "",
      company: lead.company || "",
      // Revert: Convert number back to string for input
      aum: lead.aum ? String(lead.aum) : "", 
      assignedTo: lead.assignedTo || "",
      status: lead.status || "new",
      serviceTypes: lead.serviceTypes || [],
    },
  });

  // Reverted useEffect - reset based on static schema defaults
  React.useEffect(() => {
    if (lead && isOpen) {
      form.reset({
        name: lead.name || "",
        email: lead.email || "",
        mobile: lead.mobile || "",
        city: lead.city || "",
        leadSource: lead.leadSource || "walk_in",
        referredBy: lead.referredBy || "",
        company: lead.company || "",
        aum: lead.aum ? String(lead.aum) : "", // Revert: Convert number to string
        assignedTo: lead.assignedTo || "",
        status: lead.status || "new",
        serviceTypes: lead.serviceTypes || [],
      });
    }
  }, [lead, isOpen, form]);

  const leadSource = form.watch("leadSource");
  
  const getStatusOptions = () => {
    if (lead.serviceTypes && lead.serviceTypes.includes("training")) {
      return [
        { value: "new", label: "New" },
        { value: "not_connected", label: "Not Connected" },
        { value: "follow_up", label: "Follow Up" },
        { value: "ready_to_attend", label: "Ready to Attend" },
        { value: "attended", label: "Attended" },
      ];
    } else {
      return [
        { value: "new", label: "New" },
        { value: "not_connected", label: "Not Connected" },
        { value: "follow_up", label: "Follow Up" },
        { value: "interested", label: "Interested" },
        { value: "consultation_done", label: "Consultation Done" },
      ];
    }
  };
  
  const handleSubmit = (data: FormValues) => {
    // Revert: Simple AUM conversion
    const numericAum = data.aum ? parseFloat(data.aum) : undefined;

    updateLead({
      ...lead, // Spread existing lead data
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      city: data.city,
      leadSource: data.leadSource,
      referredBy: data.referredBy,
      company: data.company,
      // Revert: Include AUM if valid number
      aum: (numericAum && !isNaN(numericAum)) ? numericAum : undefined,
      assignedTo: data.assignedTo || undefined,
      status: data.status as TrainingLeadStatus | WealthLeadStatus, 
      serviceTypes: data.serviceTypes || [],
    });
    
    toast({
      title: "Lead updated",
      description: `${data.name}'s information has been updated.`,
    });
    
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
          <p className="text-sm text-muted-foreground capitalize">
            Service Type: {lead.serviceTypes.join(", ")} {/* Service Type is not editable */}
          </p>
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
            
            {/* Conditionally render AUM field based on original lead serviceType */}            
            {lead.serviceTypes && lead.serviceTypes.includes("training") && (
              <FormField
                control={form.control}
                name="aum"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AUM (Optional)</FormLabel>
                    <FormControl>
                      {/* Input type text matches schema string */}
                      <Input type="text" placeholder="Assets Under Management" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getStatusOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
              
              {/* Show Assign To only for Developer/Admin */}
              {(currentUser?.role === "developer" || currentUser?.role === "admin") && (
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        // Use null for the value of "Not assigned"
                        value={field.value || undefined} 
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Assign to Employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users
                            .filter(user => user.role === 'employee')
                            .map((user) => (
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
              )}
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
                    <FormLabel>Company (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Company name" {...field} />
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
                      // Ensure field.value is always an array
                      const currentTypes = field.value || [];
                      if (!currentTypes.includes(value as ServiceType)) {
                        field.onChange([...currentTypes, value as ServiceType]);
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
                      {["training", "equity", "insurance", "mutual_funds", "pms", "aif", "others"].map((type) => (
                        <SelectItem key={type} value={type} disabled={field.value && field.value.includes(type as ServiceType)}>
                          {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {field.value && field.value.map((type) => (
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
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
