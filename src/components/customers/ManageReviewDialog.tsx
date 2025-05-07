import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { useCRM } from "@/context/hooks";
import { Customer } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ManageReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

const formSchema = z.object({
  nextReview: z.date().optional(),
  reviewRemarks: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function ManageReviewDialog({ isOpen, onClose, customer }: ManageReviewDialogProps) {
  const { updateCustomer } = useCRM();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nextReview: customer.nextReview ? new Date(customer.nextReview) : undefined,
      reviewRemarks: customer.reviewRemarks || "",
    },
  });

  const handleSubmit = async (data: FormValues) => {
    try {
      // Adjust the date to preserve the selected day
      const adjustedDate = data.nextReview ? new Date(data.nextReview.setHours(12, 0, 0, 0)) : undefined;
      
      await updateCustomer({
        id: customer.id,
        nextReview: adjustedDate,
        reviewRemarks: data.reviewRemarks,
      });
      
      toast({
        title: "Review updated",
        description: "Customer review details have been updated successfully.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update review details",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Review</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nextReview"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Next Review Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
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
                    <Input placeholder="Enter review remarks" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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