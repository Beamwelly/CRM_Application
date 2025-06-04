import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail } from "lucide-react";

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

export function SendEmailDialog({
  isOpen,
  onClose,
}: SendEmailDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Integration Coming Soon
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-muted-foreground">
            We're working on bringing you a powerful email integration feature. 
            This will allow you to send and receive emails directly from the CRM, 
            track email conversations, and manage your communications more effectively.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
