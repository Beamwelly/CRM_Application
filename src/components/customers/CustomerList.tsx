import { useState } from 'react';
import { Table, TableBody } from '@/components/ui/table';
import { useCRM } from '@/context/hooks';
import { Customer, ServiceType, User } from '@/types';
import { AddCustomerDialog } from './AddCustomerDialog';
import { EditCustomerDialog } from './EditCustomerDialog';
import { BulkUploadDialog } from '../import/BulkUploadDialog';
import { FollowUpDialog } from '../follow-ups/FollowUpDialog';
import { SendEmailDialog } from '../email/SendEmailDialog';
import { RenewalManagementDialog } from './RenewalManagementDialog';
import { CallDialog } from '../communication/CallDialog';
import { CommunicationHistory } from '../communication/CommunicationHistory';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { CustomerActions } from './list/CustomerActions';
import { CustomerFilters } from './list/CustomerFilters';
import { CustomerTableHeader } from './list/CustomerTableHeader';
import { CustomerTableRow } from './list/CustomerTableRow';
import { AddRemarkForm } from '../remarks/AddRemarkForm';
import { FileText, MessageSquare } from 'lucide-react';
import React from 'react';
import { WhatsAppDialog } from '../communication/WhatsAppDialog';
import { ManageReviewDialog } from "./ManageReviewDialog";

export function CustomerList() {
  const {
    customers,
    users,
    currentUser,
    getCustomersByAssignee,
    deleteCustomer,
    hasServiceTypeAccess,
    developerAdminFilterId,
    setDeveloperAdminFilter
  } = useCRM();
  const { toast } = useToast();
  
  // Define all service types
  const serviceTypes: ServiceType[] = ["training", "wealth", "equity", "insurance", "mutual_funds", "PMS", "AIF", "others"];

  const [filter, setFilter] = useState<'all' | ServiceType>('all');
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRenewalDialogOpen, setIsRenewalDialogOpen] = useState(false);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAddRemarkOpen, setIsAddRemarkOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // --- Subordinate IDs Calculation (for Developer filter) ---
  const subordinateIds = React.useMemo(() => {
    if (!developerAdminFilterId) return [];
    return users
      .filter(user => user.role === 'employee' && user.createdByAdminId === developerAdminFilterId)
      .map(user => user.id);
  }, [developerAdminFilterId, users]);
  // --- End Subordinate IDs Calculation ---

  const getVisibleCustomers = () => {
    console.log("[CustomerList] Current User:", currentUser, "DeveloperAdminFilterId:", developerAdminFilterId);
    console.log("[CustomerList] All Customers from context:", customers);
    
    // Apply Developer Admin Filter if active
    if (currentUser?.role === 'developer' && developerAdminFilterId) {
      const relevantUserIds = [developerAdminFilterId, ...subordinateIds];
      console.log("[CustomerList] Developer Filter Active. Admin ID:", developerAdminFilterId, "Relevant User IDs (Admin + Subordinates):", relevantUserIds);
      
      const devFilteredCustomers = customers.filter(customer => 
        (relevantUserIds.includes(customer.createdBy || '') || relevantUserIds.includes(customer.assignedTo || '')) &&
        (customer.serviceTypes || []).some(type => hasServiceTypeAccess(type))
      );
      console.log("[CustomerList] Customers after Developer Filter (before UI service type filter):", devFilteredCustomers);
      return devFilteredCustomers;
    }

    // Original logic for other roles or no filter
    const assignedCustomers = currentUser?.role === 'employee' 
      ? getCustomersByAssignee(currentUser.id)
      : customers;
      
    console.log("[CustomerList] Customers for non-developer or no filter (before UI service type filter):", assignedCustomers);
    
    return assignedCustomers;
  };

  const myCustomers = getVisibleCustomers();

  // Apply service type filter
  const filteredCustomers = filter === 'all' 
    ? myCustomers 
    : myCustomers.filter(customer => 
        customer.serviceTypes && 
        customer.serviceTypes.includes(filter)
      );

  console.log("[CustomerList] Filtered by service type:", filter, filteredCustomers);

  const getUserNameById = (userId: string): string => {
    const user = users.find(user => user.id === userId);
    // Only include position if it exists
    return user ? (user.position ? `${user.name} (${user.position})` : user.name) : "Unknown"; 
  };

  const getStatusBadgeVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'email_sent':
        return 'outline';
      case 'form_filled':
        return 'secondary';
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

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditCustomerOpen(true);
  };

  const handleAddFollowUp = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsFollowUpOpen(true);
  };

  const handleEmail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEmailDialogOpen(true);
  };

  const handleDeleteConfirm = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteConfirmOpen(true);
  };

  const handleManageRenewal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsRenewalDialogOpen(true);
  };

  const handleManageReview = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsReviewDialogOpen(true);
  };

  const handleMakeCall = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCallDialogOpen(true);
  };

  const handleViewHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsHistoryOpen(true);
  };

  const handleAddRemark = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsAddRemarkOpen(true);
  };

  const handleWhatsappClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setWhatsappDialogOpen(true);
  };

  const handleDeleteCustomer = () => {
    if (selectedCustomer) {
      deleteCustomer(selectedCustomer.id);
      setIsDeleteConfirmOpen(false);
      
      toast({
        title: "Customer deleted",
        description: `${selectedCustomer.name} has been removed from the system.`,
      });
    }
  };

  // --- Permission Check Functions --- TODO: Move to a helper/context?
  const checkScopePermission = (
    scope: 'all' | 'assigned' | 'created' | 'subordinates' | 'none' | undefined,
    entity: { assignedTo?: string | null, createdBy?: string | null },
    userId: string
  ): boolean => {
    if (!scope || scope === 'none') return false;
    if (scope === 'all') return true;
    if (scope === 'assigned' && entity.assignedTo === userId) return true;
    if (scope === 'created' && entity.createdBy === userId) return true;
    // Simplified frontend check for subordinates (backend enforces fully)
    if (scope === 'subordinates' && currentUser?.role === 'admin') return true; 
    return false;
  };

  const checkBooleanPermission = (permission?: boolean): boolean => {
    return permission ?? false;
  };
  // --- End Permission Check Functions ---

  // --- Define permissions based on currentUser ---
  const canCreateCustomers = checkBooleanPermission(currentUser?.permissions?.createCustomers);
  
  const canEditCustomer = (customer: Customer): boolean => {
    if (!currentUser) return false;
    // If the user can see the customer, they can attempt to edit it.
    // Backend will perform final authorization.
    return true;
  };
  
  const canDeleteCustomerPermission = (customer: Customer): boolean => {
    if (!currentUser) return false;
    // Always enable the delete button in UI; backend will authorize.
    return true;
  };
  
  const canCommunicateWithCustomer = (customer: Customer): boolean => {
    if (!currentUser) return false;
    // If the user can see the customer, they can attempt to communicate.
    // Backend/service will handle actual communication capabilities.
    return true;
  };
  
  const canManageRenewalPermission = (customer: Customer): boolean => {
    if (!currentUser) return false;
    // If the user can see the customer, they can attempt to manage renewals.
    // Backend will perform final authorization.
    return true;
  };
  
   const canManageReviewPermission = (customer: Customer): boolean => {
    if (!currentUser) return false;
    // If the user can see the customer, they can attempt to manage reviews.
    // Backend will perform final authorization.
    return true;
  };
  // --- End Define permissions ---

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">
            {currentUser?.role === 'employee' ? 'Your assigned customers' : 'Accessible customers in the system'}
          </p>
        </div>
        <CustomerActions 
          onAddCustomer={() => setIsAddCustomerOpen(true)}
          onBulkUpload={() => setIsBulkUploadOpen(true)}
          currentUserRole={currentUser?.role || ''}
          canCreateCustomers={canCreateCustomers}
        />
      </div>

      <div className="flex space-x-2">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        {serviceTypes.filter(type => hasServiceTypeAccess(type)).map(type => (
          <Button
            key={type}
            variant={filter === type ? 'default' : 'outline'}
            onClick={() => setFilter(type)}
            className={`capitalize ${filter === type ? 'bg-primary text-primary-foreground' : ''}`}
          >
            {type.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Display and clear filter button for developer */}
      {currentUser?.role === 'developer' && developerAdminFilterId && (
        <div className="mb-4 flex items-center justify-between p-3 bg-secondary rounded-md">
          <p className="text-sm text-secondary-foreground">
            Showing data for Admin: <strong>{users.find(u => u.id === developerAdminFilterId)?.name || 'Unknown Admin'}</strong>
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDeveloperAdminFilter(null)}
          >
            Clear Filter
          </Button>
        </div>
      )}

      <Table>
        <CustomerTableHeader showAssignedTo={currentUser?.role === 'developer' || currentUser?.role === 'admin'} />
        <TableBody>
          {filteredCustomers.length === 0 ? (
            <tr>
              <td colSpan={(currentUser?.role === 'developer' || currentUser?.role === 'admin') ? 10 : 9} className="text-center p-4">
                No customers found
              </td>
            </tr>
          ) : (
            filteredCustomers.map((customer) => (
              <CustomerTableRow
                key={customer.id}
                customer={customer}
                showAssignedTo={currentUser?.role === 'developer' || currentUser?.role === 'admin'}
                getUserNameById={getUserNameById}
                onEdit={handleEditCustomer}
                onFollowUp={handleAddFollowUp}
                onEmail={handleEmail}
                onRenewal={handleManageRenewal}
                onReview={handleManageReview}
                onCall={handleMakeCall}
                onHistory={() => handleViewHistory(customer)}
                onDelete={handleDeleteConfirm}
                onAddRemark={() => handleAddRemark(customer)}
                onWhatsapp={() => handleWhatsappClick(customer)}
                canEdit={canEditCustomer(customer)}
                canDelete={canDeleteCustomerPermission(customer)}
                canCommunicate={canCommunicateWithCustomer(customer)}
                canManageRenewal={canManageRenewalPermission(customer)}
                canManageReview={canManageReviewPermission(customer)}
              />
            ))
          )}
        </TableBody>
      </Table>

      <AddCustomerDialog 
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
      />

      {selectedCustomer && (
        <EditCustomerDialog
          isOpen={isEditCustomerOpen}
          onClose={() => setIsEditCustomerOpen(false)}
          customer={selectedCustomer}
        />
      )}

      {selectedCustomer && (
        <FollowUpDialog
          isOpen={isFollowUpOpen}
          onClose={() => setIsFollowUpOpen(false)}
          customerId={selectedCustomer.id}
        />
      )}

      {selectedCustomer && (
        <SendEmailDialog
          isOpen={isEmailDialogOpen}
          onClose={() => setIsEmailDialogOpen(false)}
          initialRecipientEmail={selectedCustomer.email}
          initialName={selectedCustomer.name}
          entityId={selectedCustomer.id}
          entityType="customer"
        />
      )}

      {selectedCustomer && (
        <RenewalManagementDialog
          isOpen={isRenewalDialogOpen}
          onClose={() => setIsRenewalDialogOpen(false)}
          customer={selectedCustomer}
        />
      )}

      {selectedCustomer && (
        <CallDialog
          isOpen={isCallDialogOpen}
          onClose={() => setIsCallDialogOpen(false)}
          entityId={selectedCustomer.id}
          entityType="customer"
          phoneNumber={selectedCustomer.mobile}
          name={selectedCustomer.name}
        />
      )}

      {selectedCustomer && (
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Communication History - {selectedCustomer.name}</DialogTitle>
            </DialogHeader>
            <CommunicationHistory 
              entityId={selectedCustomer.id}
              entityType="customer"
            />
          </DialogContent>
        </Dialog>
      )}

      {selectedCustomer && (
        <Dialog open={isAddRemarkOpen} onOpenChange={setIsAddRemarkOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Remark for {selectedCustomer.name}</DialogTitle>
            </DialogHeader>
            <AddRemarkForm 
              entityType="customer"
              entityId={selectedCustomer.id}
              onRemarkAdded={() => {
                setIsAddRemarkOpen(false);
                // Optionally refresh history here if needed
              }}
              onCancel={() => setIsAddRemarkOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      <BulkUploadDialog
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
      />

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the customer "{selectedCustomer?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WhatsAppDialog
        isOpen={whatsappDialogOpen}
        onClose={() => setWhatsappDialogOpen(false)}
        customer={selectedCustomer || undefined}
      />

      {selectedCustomer && isReviewDialogOpen && (
        <ManageReviewDialog
          isOpen={isReviewDialogOpen}
          onClose={() => {
            setIsReviewDialogOpen(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
        />
      )}
    </div>
  );
}
