import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useCRM } from "@/context/hooks";

interface SendEmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialRecipientEmail?: string;
  initialName?: string;
  entityId?: string | number;
  entityType?: 'lead' | 'customer';
  initialSubject?: string;
  initialBody?: string;
  isReply?: boolean;
}

const formSchema = z.object({
  to: z.string().email({ message: "Invalid email address" }),
  subject: z.string().min(5, { message: "Subject must be at least 5 characters" }),
  message: z.string().min(10, { message: "Message must be at least 10 characters" }),
});

type FormValues = z.infer<typeof formSchema>;

export function SendEmailDialog({
  isOpen,
  onClose,
  initialRecipientEmail,
  initialName,
  entityId,
  entityType,
  initialSubject,
  initialBody,
  isReply = false
}: SendEmailDialogProps) {
  const { toast } = useToast();
  const { currentUser, addCommunication } = useCRM();
  const [isSending, setIsSending] = useState(false);
  
  const defaultSubject = initialSubject || (initialName ? `Hello ${initialName}` : '');
  const defaultMessage = initialBody || (initialName ? `Dear ${initialName},\n\nI hope this email finds you well.\n\nBest regards,` : '');
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      to: initialRecipientEmail || '',
      subject: defaultSubject,
      message: defaultMessage,
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
      const currentSubject = initialSubject || (initialName ? `Hello ${initialName}` : '');
      const currentMessage = initialBody || (initialName ? `Dear ${initialName},\n\nI hope this email finds you well.\n\nBest regards,` : '');
      form.reset({
        to: initialRecipientEmail || '',
        subject: currentSubject,
        message: currentMessage,
      });
    }
  }, [isOpen, form, initialRecipientEmail, initialName, initialSubject, initialBody]);
  
  const handleSubmit = (data: FormValues) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to send emails",
        variant: "destructive",
      });
      return;
    }
    
    setIsSending(true);
    
    if (entityId && entityType) {
      const leadId = entityType === 'lead' ? entityId : undefined;
      const customerId = entityType === 'customer' ? entityId : undefined;
      
      addCommunication({
        type: 'email',
        leadId,
        customerId,
        createdBy: currentUser.id,
        recipient: data.to,
        emailSubject: data.subject,
        emailBody: data.message,
        notes: undefined
      });
    }
    
    toast({
      title: "Sending email...",
      description: "Your email is being sent.",
    });
    
    setTimeout(() => {
      setIsSending(false);
      toast({
        title: "Email sent",
        description: `Your email has been sent to ${data.to}`,
      });
      onClose();
    }, 1500);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" type="button" onClick={onClose} disabled={isSending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSending}>
                <Send className="mr-2 h-4 w-4" />
                {isSending ? "Sending..." : "Send Email"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
