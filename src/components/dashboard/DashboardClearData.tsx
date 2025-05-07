import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { useCRM } from "@/context/hooks";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function DashboardClearData() {
  const { clearAllLeads, clearAllCustomers, currentUser } = useCRM();
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);
  
  const canClearData = currentUser?.permissions?.clearSystemData ?? false;
  
  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      await clearAllLeads();
      await clearAllCustomers();
      
      toast({
        title: "Data cleared",
        description: "All leads and customers have been removed from the system.",
      });
    } catch (error) {
      console.error("Error clearing data:", error);
      toast({
        title: "Error",
        description: "Failed to clear all data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };
  
  if (!canClearData) {
    return null;
  }
  
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="mt-4">
          <Trash className="mr-2 h-4 w-4" />
          Clear All Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will permanently delete all leads and customers from the system.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleClearAllData} 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isClearing}
          >
            {isClearing ? "Clearing..." : "Clear All Data"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
