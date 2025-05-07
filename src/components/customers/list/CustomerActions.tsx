import { Button } from "@/components/ui/button";
import { Plus, FileUp } from "lucide-react";

interface CustomerActionsProps {
  onAddCustomer: () => void;
  onBulkUpload: () => void;
  currentUserRole: string;
  canCreateCustomers: boolean;
}

export function CustomerActions({
  onAddCustomer,
  onBulkUpload,
  currentUserRole,
  canCreateCustomers,
}: CustomerActionsProps) {
  return (
    <div className="flex space-x-2">
      {canCreateCustomers && (
        <Button
          variant="outline"
          onClick={onAddCustomer}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      )}
      <Button
        variant="outline"
        onClick={onBulkUpload}
      >
        <FileUp className="mr-2 h-4 w-4" />
        Bulk Upload
      </Button>
    </div>
  );
}
