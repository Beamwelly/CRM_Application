
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ClearDataButton() {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const { clearAllLeads, clearAllCustomers } = useCRM();
  const { toast } = useToast();

  const handleClearAllData = () => {
    clearAllLeads();
    clearAllCustomers();
    setIsConfirmDialogOpen(false);
    
    toast({
      title: "Data cleared",
      description: "All leads and customers have been removed.",
    });
  };

  return (
    <>
      <Button 
        variant="destructive" 
        onClick={() => setIsConfirmDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <Trash2 className="h-4 w-4" />
        Clear All Data
      </Button>

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete all leads and customers. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAllData}>
              Yes, clear all data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
