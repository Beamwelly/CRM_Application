
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmailContentDialogProps {
  selectedEmailContent: { subject: string; body: string } | null;
  setSelectedEmailContent: (content: { subject: string; body: string } | null) => void;
}

export function EmailContentDialog({
  selectedEmailContent,
  setSelectedEmailContent
}: EmailContentDialogProps) {
  return (
    <Dialog 
      open={!!selectedEmailContent} 
      onOpenChange={(open) => !open && setSelectedEmailContent(null)}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{selectedEmailContent?.subject}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 whitespace-pre-wrap">
            {selectedEmailContent?.body}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
