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
import { Customer, ServiceType, ServiceTypeEnum, PaymentType, CustomerStatus, CustomerStatusEnum, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface EditCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

const PaymentTypeValues = [
  "full_payment",
  "partial_payment",
  "card",
  "bank_transfer",
  "cash",
  "installment",
] as const;

const PaymentStatusValues = [
  "completed",
  "not_completed",
] as const;

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  mobile: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  city: z.string().min(1, "City is required"),
  address: z.string().optional(),
  status: z.string(),
  assignedTo: z.string().uuid("Invalid user UUID").optional().nullable(),
  startDate: z.date().optional(),
  dob: z.date().optional().nullable(),
  aum: z.string().optional(),
  paymentType: z.enum(PaymentTypeValues).optional(),
  paymentStatus: z.enum(["completed", "not_completed"]).optional(),
  batchNo: z.string().optional(),
  nextRenewal: z.date().optional().nullable(),
  nextReview: z.date().optional().nullable(),
  reviewRemarks: z.string().optional(),
  company: z.string().optional(),
  serviceTypes: z.array(z.string()).min(1, "At least one service type is required"),
  welcomeEmail: z.boolean().optional(),
  community: z.boolean().optional(),
  calls: z.boolean().optional(),
});

const enhancedFormSchema = formSchema.superRefine((data, ctx) => {
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

type FormValues = z.infer<typeof enhancedFormSchema>;

export function EditCustomerDialog({ isOpen, onClose, customer }: EditCustomerDialogProps) {
  const { updateCustomer, users, currentUser } = useCRM();
  const { toast } = useToast();
  
  const assignableUsers = users.filter(user => 
    user.role === 'employee' || user.role === 'admin'
  );

  const serviceTypes: ServiceType[] = ["training", "wealth", "equity", "insurance", "mutual_funds", "pms", "aif", "others"];
  const paymentTypes: PaymentType[] = ['full_payment', 'partial_payment', 'card', 'bank_transfer', 'cash', 'installment'];
  const paymentStatuses: Array<'completed' | 'not_completed'> = ['completed', 'not_completed'];

  const form = useForm<FormValues>({
    resolver: zodResolver(enhancedFormSchema),
    defaultValues: {
      name: customer.name || "",
      email: customer.email || "",
      mobile: customer.mobile || "",
      city: customer.city || "",
      address: customer.address || "",
      status: customer.status || CustomerStatusEnum.ACTIVE,
      assignedTo: customer.assignedTo || null,
      startDate: customer.startDate ? new Date(customer.startDate) : undefined,
      dob: customer.dob ? new Date(customer.dob) : null,
      aum: customer.aum?.toString() || "",
      paymentType: customer.paymentType && paymentTypes.includes(customer.paymentType) ? customer.paymentType : undefined,
      paymentStatus: customer.paymentStatus || undefined,
      batchNo: customer.batchNo || "",
      nextRenewal: customer.nextRenewal ? new Date(customer.nextRenewal) : null,
      nextReview: customer.nextReview ? new Date(customer.nextReview) : null,
      reviewRemarks: customer.reviewRemarks || "",
      company: customer.company || "",
      serviceTypes: customer.serviceTypes || [ServiceTypeEnum.TRAINING] as ServiceType[],
      welcomeEmail: customer.engagementFlags?.welcomeEmail || false,
      community: customer.engagementFlags?.community || false,
      calls: customer.engagementFlags?.calls || false,
    },
  });
  
  React.useEffect(() => {
    if (customer && isOpen) {
      form.reset({
        name: customer.name || "",
        email: customer.email || "",
        mobile: customer.mobile || "",
        city: customer.city || "",
        address: customer.address || "",
        status: customer.status || CustomerStatusEnum.ACTIVE,
        assignedTo: customer.assignedTo || null,
        startDate: customer.startDate ? new Date(customer.startDate) : undefined,
        dob: customer.dob ? new Date(customer.dob) : null,
        aum: customer.aum?.toString() || "",
        paymentType: customer.paymentType && paymentTypes.includes(customer.paymentType) ? customer.paymentType : undefined,
        paymentStatus: customer.paymentStatus || undefined,
        batchNo: customer.batchNo || "",
        nextRenewal: customer.nextRenewal ? new Date(customer.nextRenewal) : null,
        nextReview: customer.nextReview ? new Date(customer.nextReview) : null,
        reviewRemarks: customer.reviewRemarks || "",
        company: customer.company || "",
        serviceTypes: customer.serviceTypes || [ServiceTypeEnum.TRAINING] as ServiceType[],
        welcomeEmail: customer.engagementFlags?.welcomeEmail || false,
        community: customer.engagementFlags?.community || false,
        calls: customer.engagementFlags?.calls || false,
      }, { keepValues: false });
    }
  }, [customer, isOpen, form]);
  
  const getStatusOptions = () => {
    if ((customer?.serviceTypes ?? []).includes("training")) {
      return [
        { value: "email_sent", label: "Email Sent" },
        { value: "form_filled", label: "Form Filled" },
        { value: "payment_made", label: "Payment Made" },
        { value: "documents_submitted", label: "Documents Submitted" },
        { value: "classes_started", label: "Classes Started" },
        { value: "completed", label: "Completed" },
      ];
    } else {
      return [
        { value: "email_sent", label: "Email Sent" },
        { value: "form_filled", label: "Form Filled" },
        { value: "account_started", label: "Account Started" },
        { value: "initial_investment", label: "Initial Investment" },
        { value: "active", label: "Active" },
      ];
    }
  };
  
  const onSubmit = async (data: FormValues) => {
    console.log("Submitting data:", data);
    const aumValue = data.aum ? parseFloat(data.aum) : undefined;
    if (data.aum && isNaN(aumValue)) {
        toast({ title: "Invalid AUM", description: "AUM must be a valid number.", variant: "destructive" });
        return;
    }

    const payload = {
      ...data,
      id: customer.id,
      aum: aumValue,
      address: data.address || "",
      reviewRemarks: data.reviewRemarks || "",
      batchNo: data.batchNo || "",
      company: data.company || "",
      dob: data.dob || undefined,
      nextRenewal: data.nextRenewal || undefined,
      nextReview: data.nextReview || undefined,
      engagementFlags: {
        welcomeEmail: data.welcomeEmail || false,
        community: data.community || false,
        calls: data.calls || false,
      },
      welcomeEmail: undefined,
      community: undefined,
      calls: undefined,
    };

    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    console.log("Update payload:", payload);

    try {
      await updateCustomer(payload as Partial<Omit<Customer, 'createdAt' | 'createdBy'> & { id: string }>);
      toast({ title: "Success", description: "Customer updated successfully." });
      onClose();
    } catch (error) {
      console.error("Failed to update customer:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update customer.", variant: "destructive" });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <p className="text-sm text-muted-foreground capitalize">
            Service Types: {(customer.serviceTypes ?? []).map(type => type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')}
          </p>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Address" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getStatusOptions().map((option) => (
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
              {(currentUser?.role === "developer" || currentUser?.role === "admin") && (
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || null}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {assignableUsers.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.role})
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("serviceTypes")?.includes("training") ? (
              <FormField
                control={form.control}
                name="nextRenewal"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Next Renewal Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="nextReview"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Next Review Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reviewRemarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Review Remarks</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter review remarks" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>
            <FormField
              control={form.control}
              name="aum"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AUM (Optional)</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="AUM" {...field} />
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
                      if (!currentTypes.includes(value as ServiceType)) {
                        field.onChange([...currentTypes, value as ServiceType]);
                      }
                    }}
                    value={undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service types to add" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {serviceTypes.map((type) => (
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
                        <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                        <button
                          type="button"
                          onClick={() => {
                            field.onChange(field.value.filter(t => t !== type));
                          }}
                          className="text-muted-foreground hover:text-foreground text-lg font-bold leading-none ml-1"
                          aria-label={`Remove ${type}`}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch("serviceTypes")?.includes("training") ? (
              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PaymentTypeValues.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="not_completed">Not Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="batchNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch No (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Batch No" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company{(customer?.serviceTypes ?? []).includes('training') ? '' : ' (Optional)'}</FormLabel>
                  <FormControl>
                    <Input placeholder="Company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center space-x-4">
              <FormField control={form.control} name="welcomeEmail" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">Welcome Email Sent</FormLabel></FormItem>)} />
              <FormField control={form.control} name="community" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">Community Joined</FormLabel></FormItem>)} />
              <FormField control={form.control} name="calls" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">Calls Made</FormLabel></FormItem>)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
