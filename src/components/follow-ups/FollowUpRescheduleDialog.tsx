
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FollowUp } from "@/types";
import { CalendarWithPointerEvents } from "@/components/ui/calendar-with-pointer-events";

interface FollowUpRescheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  followUp: FollowUp;
  onReschedule: (followUp: FollowUp, newDate: Date) => void;
}

const formSchema = z.object({
  nextCallDate: z.date({
    required_error: "Please select a date for the next follow-up",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function FollowUpRescheduleDialog({ 
  isOpen, 
  onClose, 
  followUp, 
  onReschedule 
}: FollowUpRescheduleDialogProps) {
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nextCallDate: followUp ? new Date(followUp.nextCallDate) : new Date(),
    },
  });
  
  React.useEffect(() => {
    if (isOpen && followUp) {
      form.reset({
        nextCallDate: new Date(followUp.nextCallDate),
      });
    }
  }, [isOpen, followUp, form]);
  
  const handleSubmit = (data: FormValues) => {
    onReschedule(followUp, data.nextCallDate);
    
    toast({
      title: "Follow-up rescheduled",
      description: `The follow-up has been rescheduled to ${format(data.nextCallDate, 'PPP')}`,
    });
    
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule Follow-up</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nextCallDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>New Follow-up Date</FormLabel>
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
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Reschedule Follow-up
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
