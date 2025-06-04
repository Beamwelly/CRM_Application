import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { MoreHorizontal, Calendar, Phone, Plus, UserCheck, FileUp, Edit, Trash, Mail, FileText } from 'lucide-react';
import { useCRM } from '@/context/hooks';
import { Lead, User, ServiceType } from '@/types';
import { AddLeadDialog } from './AddLeadDialog';
import { EditLeadDialog } from './EditLeadDialog';
import { ConvertToCustomerDialog } from './ConvertToCustomerDialog';
import { BulkUploadDialog } from '../import/BulkUploadDialog';
import { FollowUpDialog } from '../follow-ups/FollowUpDialog';
import { SendEmailDialog } from '../email/SendEmailDialog';
import { CallDialog } from '../communication/CallDialog';
import { CommunicationHistory } from '../communication/CommunicationHistory';
import { AddRemarkForm } from '../remarks/AddRemarkForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import React from 'react';
import { cn } from '@/lib/utils';

export function LeadList() {
  const {
    leads,
    users,
    currentUser,
    getLeadsByAssignee,
    deleteLead,
    hasServiceTypeAccess,
    addLead,
    developerAdminFilterId,
    setDeveloperAdminFilter,
    isLoadingUsers
  } = useCRM();
  
  // Define all service types
  const serviceTypes: ServiceType[] = ["training", "wealth", "equity", "insurance", "mutual_funds", "PMS", "AIF", "others"];

  // State for dialogs
  const [filter, setFilter] = useState<'all' | ServiceType>('all');
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isEditLeadOpen, setIsEditLeadOpen] = useState(false);
  const [isConvertLeadOpen, setIsConvertLeadOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAddRemarkOpen, setIsAddRemarkOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // --- Subordinate IDs Calculation (for Developer filter) ---
  const subordinateIds = React.useMemo(() => {
    if (!developerAdminFilterId || !users) return [];
    return users
      .filter(user => user.role === 'employee' && user.createdByAdminId === developerAdminFilterId)
      .map(user => user.id);
  }, [developerAdminFilterId, users]);
  // --- End Subordinate IDs Calculation ---

  // Get leads based on user role and service type access
  const getVisibleLeads = () => {
    // Apply Developer Admin Filter if active
    if (currentUser?.role === 'developer' && developerAdminFilterId) {
      const relevantUserIds = [developerAdminFilterId, ...subordinateIds];
      console.log("[LeadList] Applying Developer filter for Admin ID:", developerAdminFilterId, "Relevant User IDs:", relevantUserIds);
      // Filter all leads fetched by context
      return leads.filter(lead => 
        relevantUserIds.includes(lead.createdBy || '') && // Check creator
        // Check if user has access to *any* of the lead's service types
        (lead.serviceTypes || []).some(type => hasServiceTypeAccess(type))
      );
    }

    // Original logic for other roles or no filter
    const assignedLeads = currentUser?.role === 'employee'
      ? getLeadsByAssignee(currentUser.id)
      : leads;
      
    // Then filter by service type access if needed
    // Check if user has access to *any* of the lead's service types
    return assignedLeads.filter(lead => (lead.serviceTypes || []).some(type => hasServiceTypeAccess(type)));
  };

  const myLeads = getVisibleLeads();
  console.log("[LeadList] Leads before final filter:", myLeads);

  // Apply service type filter
  const filteredLeads = filter === 'all' 
    ? myLeads 
    : myLeads.filter(lead => (lead.serviceTypes || []).includes(filter));

  // Get user name by ID
  const getUserNameById = (userId?: string): string => {
    if (!userId || !users) return "Unassigned";
    const user = users.find(user => user.id === userId);
    // Only include position if it exists
    return user ? (user.position ? `${user.name} (${user.position})` : user.name) : "Unknown"; 
  };

  // Show loading state while users are being fetched
  if (isLoadingUsers) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Leads</h2>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <p>Loading leads data...</p>
        </div>
      </div>
    );
  }

  // Status badge color and styles
  const getStatusBadgeVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'new':
        return 'secondary';
      case 'not_connected':
        return 'outline';
      case 'follow_up':
        return 'destructive';
      case 'ready_to_attend':
      case 'interested':
        return 'secondary';
      case 'attended':
      case 'consultation_done':
        return 'secondary';
      default:
        return 'default';
    }
  };
  
  // Status badge additional classes for custom colors
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'new':
        return 'bg-info-light text-info-dark';
      case 'not_connected':
        return 'border-warning text-warning-dark';
      case 'follow_up':
        return '';
      case 'ready_to_attend':
      case 'interested':
        return 'bg-success-light text-success-dark';
      case 'attended':
      case 'consultation_done':
        return 'bg-muted text-muted-foreground';
      default:
        return '';
    }
  };

  // Dialog handlers
  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEditLeadOpen(true);
  };

  const handleConvertLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsConvertLeadOpen(true);
  };

  const handleAddFollowUp = (lead: Lead) => {
    setSelectedLead(lead);
    setIsFollowUpOpen(true);
  };

  const handleSendEmail = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEmailOpen(true);
  };

  const handleMakeCall = (lead: Lead) => {
    setSelectedLead(lead);
    setIsCallOpen(true);
  };

  const handleViewHistory = (lead: Lead) => {
    setSelectedLead(lead);
    setIsHistoryOpen(true);
  };

  const handleAddRemark = (lead: Lead) => {
    setSelectedLead(lead);
    setIsAddRemarkOpen(true);
  };

  const handleDeleteConfirm = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteLead = () => {
    if (selectedLead) {
      deleteLead(selectedLead.id);
      setIsDeleteConfirmOpen(false);
    }
  };

  // --- Permission Check Helpers ---
  const canCreateLeads = currentUser?.permissions?.createLeads || false;
  const canAssignLeadsFlag = currentUser?.permissions?.assignLeads || false;

  const canEditLead = (lead: Lead): boolean => {
    if (!currentUser) return false;
    // If the user can see the lead, they can attempt to edit it.
    // Backend will perform final authorization.
    return true; 
  };

  const canDeleteLead = (lead: Lead): boolean => {
    if (!currentUser) return false;
    // Always enable the delete button in UI; backend will authorize.
    return true; 
  };
  // --- End Permission Check Helpers ---

  // Add helper functions for lead type badge
  const getLeadTypeBadgeVariant = (type: string): 'default' | 'destructive' | 'outline' | 'secondary' => {
    switch (type) {
      case 'hot': return 'destructive';      // red
      case 'warm': return 'outline';         // yellow/gray
      case 'cold': return 'secondary';       // blue/gray
      case 'not_contacted': return 'default';
      default: return 'default';
    }
  };
  const getLeadTypeBadgeClass = (type: string): string => {
    switch (type) {
      case 'hot': return 'bg-red-500 text-white';
      case 'warm': return 'bg-yellow-400 text-black';
      case 'cold': return 'bg-blue-400 text-white';
      case 'not_contacted': return 'bg-gray-300 text-gray-800';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Leads</h2>
          <p className="text-muted-foreground">
            {currentUser?.role === 'employee' ? 'Your assigned leads' : 'All leads in the system'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setIsAddLeadOpen(true)}
            disabled={!canCreateLeads}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsBulkUploadOpen(true)}
          >
            <FileUp className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
        </div>
      </div>

      <div className="flex space-x-2">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          onClick={() => {
            console.log("[LeadList] Setting filter to: all");
            setFilter('all')
          }}
        >
          All
        </Button>
        {serviceTypes.filter(type => hasServiceTypeAccess(type)).map(type => (
          <Button
            key={type}
            variant={filter === type ? 'default' : 'outline'}
            onClick={() => {
              console.log(`[LeadList] Setting filter to: ${type}`);
              setFilter(type)
            }}
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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Service Types</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={(currentUser?.role === 'admin' || currentUser?.role === 'developer') ? 8 : 7} className="text-center">
                  No leads found
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>{lead.name}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.mobile}</TableCell>
                  <TableCell>{lead.city}</TableCell>
                  <TableCell>
                    <Badge variant={getLeadTypeBadgeVariant(lead.lead_status)} className={cn('capitalize', getLeadTypeBadgeClass(lead.lead_status))}>
                      {(lead.lead_status ?? 'not_contacted').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(lead.status)} className={cn('capitalize', getStatusBadgeClass(lead.status))}>
                      {lead.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{getUserNameById(lead.assignedTo)}</TableCell>
                  <TableCell>{getUserNameById(lead.createdBy)}</TableCell>
                  <TableCell>{format(new Date(lead.createdAt), 'PP')}</TableCell>
                  <TableCell className="capitalize">
                    {(lead.serviceTypes || []).map(type => type.replace(/_/g, ' ')).join(', ')}
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
                        <DropdownMenuItem onClick={() => handleEditLead(lead)} disabled={!canEditLead(lead)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddFollowUp(lead)}>
                          <Calendar className="mr-2 h-4 w-4" />
                          Add follow-up
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMakeCall(lead)}>
                          <Phone className="mr-2 h-4 w-4" />
                          Call
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSendEmail(lead)}>
                          <Mail className="mr-2 h-4 w-4" />
                          Send email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddRemark(lead)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Add Remark
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewHistory(lead)}>
                          <Calendar className="mr-2 h-4 w-4" />
                          View history
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleConvertLead(lead)}>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Convert to Customer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteConfirm(lead)} disabled={!canDeleteLead(lead)} className="text-destructive focus:text-destructive">
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Lead Dialog */}
      {isAddLeadOpen && (
        <AddLeadDialog 
          isOpen={isAddLeadOpen} 
          onClose={() => setIsAddLeadOpen(false)} 
        />
      )}

      {/* Edit Lead Dialog */}
      {selectedLead && isEditLeadOpen && (
        <EditLeadDialog 
          isOpen={isEditLeadOpen} 
          onClose={() => setIsEditLeadOpen(false)} 
          lead={selectedLead} 
        />
      )}

      {/* Convert to Customer Dialog */}
      {selectedLead && (
        <ConvertToCustomerDialog
          isOpen={isConvertLeadOpen}
          onClose={() => setIsConvertLeadOpen(false)}
          lead={selectedLead}
        />
      )}

      {/* Follow-up Dialog */}
      {selectedLead && (
        <FollowUpDialog
          isOpen={isFollowUpOpen}
          onClose={() => setIsFollowUpOpen(false)}
          leadId={selectedLead.id}
        />
      )}

      {/* Email Dialog */}
      {selectedLead && (
        <SendEmailDialog
          isOpen={isEmailOpen}
          onClose={() => setIsEmailOpen(false)}
          initialRecipientEmail={selectedLead.email}
          initialName={selectedLead.name}
          entityId={selectedLead.id}
          entityType="lead"
        />
      )}

      {/* Call Dialog */}
      {selectedLead && (
        <CallDialog
          isOpen={isCallOpen}
          onClose={() => setIsCallOpen(false)}
          entityId={selectedLead.id}
          entityType="lead"
          phoneNumber={selectedLead.mobile}
          name={selectedLead.name}
        />
      )}

      {/* Communication History Dialog */}
      {selectedLead && (
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Communication History - {selectedLead.name}</DialogTitle>
            </DialogHeader>
            <CommunicationHistory 
              entityId={selectedLead.id}
              entityType="lead"
              onRemarkAdded={() => {
                setIsAddRemarkOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Add Remark Dialog */}
      {selectedLead && (
        <Dialog open={isAddRemarkOpen} onOpenChange={setIsAddRemarkOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Remark for {selectedLead.name}</DialogTitle>
            </DialogHeader>
            <AddRemarkForm 
              entityType="lead"
              entityId={selectedLead.id}
              onRemarkAdded={() => {
                setIsAddRemarkOpen(false);
                // Optionally refresh history here if needed, although context update might suffice
              }}
              onCancel={() => setIsAddRemarkOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the lead "{selectedLead?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedLead(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLead} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
