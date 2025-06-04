import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCRM } from "@/context/hooks";
import { useToast } from "@/hooks/use-toast";
import { CalendarWithPointerEvents } from "@/components/ui/calendar-with-pointer-events";
import { NewFollowUpData } from "@/context/slices/followUpSlice";

interface FollowUpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leadId?: string | number;
  customerId?: string | number;
}

const formSchema = z.object({
  notes: z.string().min(5, { message: "Notes must be at least 5 characters" }),
  nextCallDate: z.date({
    required_error: "Please select a date for the next follow-up",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function FollowUpDialog({ isOpen, onClose, leadId, customerId }: FollowUpDialogProps) {
  const { addFollowUp, currentUser } = useCRM();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: "",
      nextCallDate: new Date(),
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        notes: "",
        nextCallDate: new Date(),
      });
    }
  }, [isOpen, form]);
  
  const handleSubmit = (data: FormValues) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to add a follow-up",
        variant: "destructive",
      });
      return;
    }
    
    const entityType = leadId ? 'lead' : 'customer';
    const entityId = leadId || customerId;

    if (!entityId) {
      toast({
        title: "Error",
        description: "Cannot add follow-up without a lead or customer ID.",
        variant: "destructive",
      });
      return;
    }

    // Create the follow-up data object with the correct type
    const followUpData: NewFollowUpData = {
      nextCallDate: data.nextCallDate.toISOString(),
      notes: data.notes,
    };

    // Call addFollowUp with the correct arguments
    addFollowUp(entityType, entityId, followUpData);
    
    toast({
      title: "Follow-up added",
      description: "The follow-up has been scheduled successfully",
    });
    
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Follow-up</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nextCallDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Next Follow-up Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarWithPointerEvents
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter details about the follow-up"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                <Check className="mr-2 h-4 w-4" />
                Schedule Follow-up
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
