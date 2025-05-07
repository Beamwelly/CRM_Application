import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useCRM } from "@/context/hooks";
import { Customer, RenewalStatus, RenewalHistory } from "@/types";
import { useToast } from "@/hooks/use-toast";

// Refactored form fields:
import { RenewalDatePicker } from "./renewal/RenewalDatePicker";
import { RenewalAmountInput } from "./renewal/RenewalAmountInput";
import { RenewalStatusSelect } from "./renewal/RenewalStatusSelect";
import { RenewalNotesTextarea } from "./renewal/RenewalNotesTextarea";

interface RenewalManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

const formSchema = z.object({
  renewalDate: z.date({
    required_error: "Renewal date is required",
  }),
  amount: z.string().min(1, { message: "Amount is required" }),
  status: z.enum(["pending", "renewed", "cancelled", "expired"]),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function RenewalManagementDialog({ isOpen, onClose, customer }: RenewalManagementDialogProps) {
  const { addRenewalHistory, updateCustomer } = useCRM();
  const { toast } = useToast();

  const defaultRenewalDate = React.useMemo(() => 
    customer.nextRenewal
      ? new Date(customer.nextRenewal)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    [customer.nextRenewal]
  );

  const lastRenewalAmount = customer.renewalHistory && customer.renewalHistory.length > 0
    ? customer.renewalHistory[customer.renewalHistory.length - 1].amount?.toString() || "0"
    : "0";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      renewalDate: defaultRenewalDate,
      amount: lastRenewalAmount,
      status: "pending",
      notes: "",
    },
  });

  // Update form values when customer changes or dialog opens
  React.useEffect(() => {
    if (customer && isOpen) {
      form.reset({
        renewalDate: defaultRenewalDate,
        amount: lastRenewalAmount,
        status: "pending",
        notes: "",
      });
    }
  }, [customer, isOpen, form, defaultRenewalDate, lastRenewalAmount]);

  const handleSubmit = async (data: FormValues) => {
    try {
      const amount = parseFloat(data.amount);

      if (isNaN(amount)) {
        toast({
          title: "Invalid amount",
          description: "Please enter a valid amount",
          variant: "destructive",
        });
        return;
      }

      const renewalHistoryEntry: RenewalHistory = {
        date: new Date(),
        amount,
        status: data.status as RenewalStatus,
        notes: data.notes || "",
        nextRenewalDate: data.renewalDate
      };

      addRenewalHistory(customer.id, renewalHistoryEntry);

      // ALSO update the main customer record with the new nextRenewal date
      updateCustomer({ 
        id: customer.id,
        nextRenewal: data.renewalDate // Set the new renewal date
      });

      toast({
        title: "Renewal updated",
        description: `Renewal for ${customer.name} has been updated successfully.`,
      });

      onClose();
    } catch (error) {
      console.error("Error updating renewal:", error);
      toast({
        title: "Error",
        description: "Failed to update renewal. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Renewal</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <RenewalDatePicker control={form.control} />
            <RenewalAmountInput control={form.control} />
            <RenewalStatusSelect control={form.control} />
            <RenewalNotesTextarea control={form.control} />
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
