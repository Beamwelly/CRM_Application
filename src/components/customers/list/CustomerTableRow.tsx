import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Customer } from "@/types";
import { MoreHorizontal, Calendar, Phone, ClipboardEdit, Mail, Trash, History, FileText, Edit, ClipboardList } from "lucide-react";
import { useState, useEffect } from "react";
import { ManageReviewDialog } from "../ManageReviewDialog";
import { useCRM } from "@/context/hooks";
import { cn } from "@/lib/utils";

interface CustomerTableRowProps {
  customer: Customer;
  showAssignedTo: boolean;
  getUserNameById: (userId: string) => string;
  onEdit: (customer: Customer) => void;
  onFollowUp: (customer: Customer) => void;
  onEmail: (customer: Customer) => void;
  onRenewal: (customer: Customer) => void;
  onCall: (customer: Customer) => void;
  onHistory: () => void;
  onDelete: (customer: Customer) => void;
  onAddRemark: () => void;
  onWhatsapp: (customer: Customer) => void;
  canEdit: boolean;
  canDelete: boolean;
  canCommunicate: boolean;
  canManageRenewal: boolean;
  canManageReview: boolean;
  onReview: (customer: Customer) => void;
}

export function CustomerTableRow({
  customer,
  showAssignedTo,
  getUserNameById,
  onEdit,
  onFollowUp,
  onEmail,
  onRenewal,
  onCall,
  onHistory,
  onDelete,
  onAddRemark,
  onWhatsapp,
  canEdit,
  canDelete,
  canCommunicate,
  canManageRenewal,
  canManageReview,
  onReview,
}: CustomerTableRowProps) {
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const { getPendingFollowUps } = useCRM();
  const [nextFollowUpDate, setNextFollowUpDate] = useState<Date | null>(null);

  useEffect(() => {
    const pending = getPendingFollowUps();
    const customerFollowUp = pending.find(f => f.customerId === customer.id);
    setNextFollowUpDate(customerFollowUp ? new Date(customerFollowUp.date) : null);
  }, [getPendingFollowUps, customer.id]);

  const getStatusBadgeVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'email_sent':
        return 'outline';
      case 'form_filled':
      case 'payment_made':
      case 'account_started':
        return 'secondary';
      case 'documents_submitted':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'email_sent':
        return 'border-info text-info-dark';
      case 'form_filled':
        return 'bg-info-light text-info-dark';
      case 'payment_made':
      case 'account_started':
        return 'bg-success-light text-success-dark';
      case 'documents_submitted':
        return 'bg-warning-light text-warning-dark';
      default:
        return '';
    }
  };

  const getRenewalStatus = (nextRenewal?: Date) => {
    if (!nextRenewal) return { status: 'unknown', label: 'Unknown' };
    
    const now = new Date();
    const renewalDate = new Date(nextRenewal);
    const daysUntilRenewal = Math.floor((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilRenewal < 0) {
      return { status: 'expired', label: 'Expired' };
    } else if (daysUntilRenewal <= 30) {
      return { status: 'upcoming', label: 'Soon' };
    } else {
      return { status: 'active', label: `${daysUntilRenewal} days` };
    }
  };

  const renewalStatus = getRenewalStatus(customer.nextRenewal);
  const isTrainingService = customer.serviceTypes?.includes('training') || false;

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{customer.name}</TableCell>
        <TableCell>
          <Badge 
            variant={getStatusBadgeVariant(customer.status)} 
            className={cn("capitalize", getStatusBadgeClass(customer.status))}
          >
            {customer.status.replace('_', ' ')}
          </Badge>
        </TableCell>
        <TableCell>{customer.email}</TableCell>
        <TableCell>{customer.mobile}</TableCell>
        <TableCell>{customer.city}</TableCell>
        <TableCell className="capitalize">
          {(customer.serviceTypes || []).map(type => type.replace(/_/g, ' ')).join(', ')}
        </TableCell>
        {showAssignedTo && (
          <TableCell>{getUserNameById(customer.assignedTo)}</TableCell>
        )}
        <TableCell>{format(new Date(customer.startDate), 'MMM d, yyyy')}</TableCell>
        <TableCell>
          {isTrainingService ? (
            customer.nextRenewal ? (
              <div className="flex items-center gap-2">
                <span>{format(new Date(customer.nextRenewal), 'MMM d, yyyy')}</span>
                <Badge 
                  variant={
                    renewalStatus.status === 'expired' ? 'destructive' : 
                    renewalStatus.status === 'upcoming' ? 'outline' : 
                    'secondary'
                  }
                  className={
                    renewalStatus.status === 'expired' ? '' : 
                    renewalStatus.status === 'upcoming' ? 'border-warning text-warning-dark' : 
                    'bg-success-light text-success-dark'
                  }
                >
                  {renewalStatus.label}
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">Not set</span>
            )
          ) : (
            customer.nextReview ? format(new Date(customer.nextReview), 'MMM d, yyyy') : 'Not set'
          )}
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={() => onEdit(customer)}>
                  <ClipboardEdit className="mr-2 h-4 w-4" />
                  <span>Edit details</span>
                </DropdownMenuItem>
              )}
              
              {canCommunicate && (
                <>
                  <DropdownMenuItem onClick={() => onFollowUp(customer)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Add follow-up</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEmail(customer)}>
                    <Mail className="mr-2 h-4 w-4" />
                    <span>Send email</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCall(customer)}>
                    <Phone className="mr-2 h-4 w-4" />
                    <span>Call customer</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddRemark()}>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Add Remark</span>
                  </DropdownMenuItem>
                </>
              )}
              
              {isTrainingService ? (
                canManageRenewal && (
                  <DropdownMenuItem onClick={() => onRenewal(customer)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Manage renewal</span>
                  </DropdownMenuItem>
                )
              ) : (
                canManageReview && (
                  <DropdownMenuItem onClick={() => onReview(customer)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Manage review</span>
                  </DropdownMenuItem>
                )
              )}
              
              <DropdownMenuItem onClick={() => onHistory()}>
                <History className="mr-2 h-4 w-4" />
                <span>View history</span>
              </DropdownMenuItem>
              
              {canDelete && (
                <DropdownMenuItem onClick={() => onDelete(customer)} className="text-destructive focus:text-destructive-foreground focus:bg-destructive">
                  <Trash className="mr-2 h-4 w-4" />
                  <span>Delete customer</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {!isTrainingService && (
        <ManageReviewDialog
          isOpen={isReviewDialogOpen}
          onClose={() => setIsReviewDialogOpen(false)}
          customer={customer}
        />
      )}
    </>
  );
}
