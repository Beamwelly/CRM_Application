import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout/Layout';
import { MoreHorizontal, Check, Clock, CalendarX, UserCircle, Phone } from 'lucide-react';
import { useCRM } from '@/context/hooks';
import { Lead, Customer, FollowUp as BasicFollowUp } from '@/types';
import { ExtendedFollowUp } from '@/types/followUp';
import { useToast } from '@/hooks/use-toast';
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
import { FollowUpRescheduleDialog } from '@/components/follow-ups/FollowUpRescheduleDialog';

export default function FollowUps() {
  const { 
    getPendingFollowUps, 
    leads,
    customers,
    currentUser, 
    markFollowUpAsDone,
    updateLead,
    updateCustomer,
  } = useCRM();
  const { toast } = useToast();
  
  const [isMarkAsDoneDialogOpen, setIsMarkAsDoneDialogOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<ExtendedFollowUp | null>(null);
  
  const followUpItems: ExtendedFollowUp[] = currentUser?.role === 'employee'
    ? getPendingFollowUps(currentUser.id)
    : getPendingFollowUps();
  
  const getEntityNameById = (type: 'lead' | 'customer', id?: string | number): string => {
    if (!id) return 'Unknown';
    
    if (type === 'lead') {
      const lead = leads.find(l => String(l.id) === String(id));
      return lead?.name || 'Unknown Lead';
    } else {
      const customer = customers.find(c => String(c.id) === String(id));
      return customer?.name || 'Unknown Customer';
    }
  };
  
  const handleOpenMarkAsDoneDialog = (followUp: ExtendedFollowUp) => {
    setSelectedFollowUp(followUp);
    setIsMarkAsDoneDialogOpen(true);
  };
  
  const handleMarkAsDone = async () => {
    if (!selectedFollowUp) return;

    const { id: followUpId, entityType, entityId } = selectedFollowUp;

    if (!entityType || !entityId) {
        console.error("Follow-up item is missing entityType or entityId", selectedFollowUp);
        toast({
            title: "Error",
            description: "Could not mark follow-up as done. Missing entity information.",
            variant: "destructive"
        });
        setIsMarkAsDoneDialogOpen(false);
        return;
    }

    try {
      await markFollowUpAsDone(followUpId, entityType, entityId);
      toast({
        title: "Follow-up completed",
        description: "The follow-up has been marked as done and removed from the list."
      });
    } catch (error) {
      console.error("Failed to mark follow-up as done:", error);
      toast({
        title: "Error",
        description: `Failed to mark follow-up as done: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
    
    setIsMarkAsDoneDialogOpen(false);
    setSelectedFollowUp(null);
  };
  
  const handleOpenRescheduleDialog = (followUp: ExtendedFollowUp) => {
    setSelectedFollowUp(followUp);
    setIsRescheduleDialogOpen(true);
  };
  
  const handleReschedule = (followUp: BasicFollowUp, newDate: Date) => {
    if (!followUp) return;
    
    if (followUp.leadId) {
      const lead = leads.find(l => String(l.id) === String(followUp.leadId));
      if (lead) {
        const updatedFollowUps = (lead.followUps || []).map(f => 
          f.id === followUp.id ? { ...f, nextCallDate: newDate } : f
        );
        updateLead({ ...lead, followUps: updatedFollowUps });
        toast({ title: "Follow-up rescheduled", description: `Next call for ${lead.name} set to ${format(newDate, 'PP')}.` });
      }
    } else if (followUp.customerId) {
      const customer = customers.find(c => String(c.id) === String(followUp.customerId));
      if (customer) {
        const updatedFollowUps = (customer.followUps || []).map(f => 
          f.id === followUp.id ? { ...f, nextCallDate: newDate } : f
        );
        updateCustomer({ ...customer, followUps: updatedFollowUps });
        toast({ title: "Follow-up rescheduled", description: `Next call for ${customer.name} set to ${format(newDate, 'PP')}.` });
      }
    }
    setIsRescheduleDialogOpen(false);
  };
  
  const handleMakeCall = (followUp: ExtendedFollowUp) => {
    const entityName = followUp.leadId 
      ? getEntityNameById('lead', followUp.leadId)
      : getEntityNameById('customer', followUp.customerId);
    
    toast({
      title: "Initiating call",
      description: `Calling ${entityName}...`,
    });
    
    setTimeout(() => {
      toast({
        title: "Call connected",
        description: `You are now connected with ${entityName}.`,
      });
    }, 1500);
  };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayFollowUps = followUpItems.filter(item => {
    const followupDate = new Date(item.nextCallDate);
    followupDate.setHours(0, 0, 0, 0);
    return followupDate.getTime() === today.getTime();
  });
  
  const upcomingFollowUps = followUpItems.filter(item => {
    const followupDate = new Date(item.nextCallDate);
    followupDate.setHours(0, 0, 0, 0);
    return followupDate.getTime() > today.getTime();
  });
  
  const overdueFollowUps = followUpItems.filter(item => {
    const followupDate = new Date(item.nextCallDate);
    followupDate.setHours(0, 0, 0, 0);
    return followupDate.getTime() < today.getTime();
  });

  const followUpSections = [
    { title: 'Due Today', items: todayFollowUps, variant: 'default' as const },
    { title: 'Overdue', items: overdueFollowUps, variant: 'destructive' as const },
    { title: 'Upcoming', items: upcomingFollowUps, variant: 'outline' as const },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Follow-ups
          </h1>
          <p className="text-muted-foreground">
            Manage your pending follow-ups
          </p>
        </div>
        
        {followUpSections.map(section => (
          <div key={section.title} className="space-y-4">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <Badge variant={section.variant} className="ml-2">
                {section.items.length}
              </Badge>
            </div>
            
            {section.items.length === 0 ? (
              <p className="text-muted-foreground">No follow-ups {section.title.toLowerCase()}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.items.map(item => {
                    const contactName = item.entityType === 'lead' ? item.leadName : item.customerName;
                    const entityType = item.entityType;
                    const nextCallDate = typeof item.nextCallDate === 'string' ? new Date(item.nextCallDate) : item.nextCallDate;
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          {!isNaN(nextCallDate.getTime()) ? format(nextCallDate, 'MMM d, yyyy') : 'Invalid Date'}
                        </TableCell>
                        <TableCell className="font-medium">{contactName || 'N/A'}</TableCell>
                        <TableCell className="capitalize">{entityType || 'N/A'}</TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {item.notes}
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
                              <DropdownMenuItem onClick={() => handleOpenMarkAsDoneDialog(item)}>
                                <Check className="mr-2 h-4 w-4" />
                                <span>Mark as done</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenRescheduleDialog(item)}>
                                <Clock className="mr-2 h-4 w-4" />
                                <span>Reschedule</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMakeCall(item)}>
                                <Phone className="mr-2 h-4 w-4" />
                                <span>Call customer</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        ))}
      </div>
      
      <AlertDialog open={isMarkAsDoneDialogOpen} onOpenChange={setIsMarkAsDoneDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the follow-up as completed and remove it from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsDone}>
              Mark as Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {selectedFollowUp && (
        <FollowUpRescheduleDialog
          isOpen={isRescheduleDialogOpen}
          onClose={() => setIsRescheduleDialogOpen(false)}
          followUp={selectedFollowUp as BasicFollowUp}
          onReschedule={handleReschedule}
        />
      )}
    </Layout>
  );
}
