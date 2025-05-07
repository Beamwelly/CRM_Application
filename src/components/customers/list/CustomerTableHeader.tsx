import {
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";

interface CustomerTableHeaderProps {
  showAssignedTo: boolean;
}

export function CustomerTableHeader({ showAssignedTo }: CustomerTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Phone</TableHead>
        <TableHead>City</TableHead>
        <TableHead>Service Types</TableHead>
        {showAssignedTo && (
          <TableHead>Assigned To</TableHead>
        )}
        <TableHead>Start Date</TableHead>
        <TableHead>Next Review/Renewal</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
