import { useState } from 'react';
import { format, addMonths, parse } from 'date-fns';
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
import { MoreHorizontal, Mail, Calendar, PhoneCall } from 'lucide-react';
import { useCRM } from '@/context/hooks';
import { Customer } from '@/types';
import { RenewalManagementDialog } from '@/components/customers/RenewalManagementDialog';
import { SendEmailDialog } from '@/components/email/SendEmailDialog';

export default function Renewals() {
  const { customers, currentUser, users } = useCRM();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isRenewalDialogOpen, setIsRenewalDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  
  // Get the customers that have a renewal date
  const customersWithRenewal = customers.filter(c => c.nextRenewal !== undefined);
  
  // Helper to determine if a renewal is upcoming (within 30 days) or overdue
  const getRenewalStatus = (customer: Customer) => {
    if (!customer.nextRenewal) return 'unknown';
    
    const now = new Date();
    const renewalDate = new Date(customer.nextRenewal);
    const daysUntilRenewal = Math.floor((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilRenewal < 0) {
      return 'overdue';
    } else if (daysUntilRenewal <= 30) {
      return 'upcoming';
    } else {
      return 'active';
    }
  };
  
  // Filter customers based on renewal status
  const filteredCustomers = customersWithRenewal.filter(customer => {
    if (filter === 'all') return true;
    const status = getRenewalStatus(customer);
    return status === filter;
  });
  
  // Sort customers by next renewal date, earliest first
  filteredCustomers.sort((a, b) => {
    if (!a.nextRenewal) return 1;
    if (!b.nextRenewal) return -1;
    return new Date(a.nextRenewal).getTime() - new Date(b.nextRenewal).getTime();
  });
  
  // Only show customers assigned to current executive if user is an executive
  const visibleCustomers = currentUser?.role === 'executive' 
    ? filteredCustomers.filter(c => c.assignedTo === currentUser.id)
    : filteredCustomers;
  
  // Get user name by ID
  const getUserNameById = (userId: string): string => {
    const user = users.find(user => user.id === userId);
    return user ? `${user.name} (${user.position})` : "Unassigned";
  };
  
  // Handle opening renewal management dialog
  const handleManageRenewal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsRenewalDialogOpen(true);
  };
  
  // Handle opening email dialog
  const handleSendEmail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEmailDialogOpen(true);
  };
  
  // Handle mock phone call
  const handleMakeCall = (customer: Customer) => {
    // In a real app, this would initiate a call
    // For now, we'll just show a toast message
    console.log(`Calling ${customer.name}...`);
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Renewals
          </h1>
          <p className="text-muted-foreground">
            Track upcoming and overdue customer renewals
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={filter === 'upcoming' ? 'default' : 'outline'} 
            onClick={() => setFilter('upcoming')}
            className={filter === 'upcoming' ? "bg-warning text-warning-foreground hover:bg-warning/90" : ""}
          >
            Upcoming
          </Button>
          <Button 
            variant={filter === 'overdue' ? 'default' : 'outline'} 
            onClick={() => setFilter('overdue')}
            className={filter === 'overdue' ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            Overdue
          </Button>
        </div>
        
        {visibleCustomers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No renewals found in this category</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Renewal Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Renewal</TableHead>
                <TableHead>Amount</TableHead>
                {currentUser?.role === 'manager' && (
                  <TableHead>Assigned To</TableHead>
                )}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCustomers.map(customer => {
                const renewalStatus = getRenewalStatus(customer);
                const lastRenewal = customer.renewalHistory && customer.renewalHistory.length > 0 
                  ? customer.renewalHistory[customer.renewalHistory.length - 1] 
                  : null;
                
                return (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="capitalize">{customer.serviceTypes}</TableCell>
                    <TableCell>
                      {customer.nextRenewal && format(new Date(customer.nextRenewal), 'dd-MM-yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          renewalStatus === 'overdue' ? 'destructive' : 
                          renewalStatus === 'upcoming' ? 'outline' : 
                          'secondary'
                        }
                        className={
                          renewalStatus === 'overdue' ? '' : 
                          renewalStatus === 'upcoming' ? 'border-warning text-warning-dark' : 
                          'bg-success-light text-success-dark'
                        }
                      >
                        {renewalStatus === 'overdue' 
                          ? 'Overdue' 
                          : renewalStatus === 'upcoming' 
                          ? 'Upcoming' 
                          : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lastRenewal && format(new Date(lastRenewal.date), 'dd-MM-yyyy')}
                    </TableCell>
                    <TableCell>
                      {lastRenewal && `₹${lastRenewal.amount.toLocaleString('en-IN')}`}
                    </TableCell>
                    {currentUser?.role === 'manager' && (
                      <TableCell>{getUserNameById(customer.assignedTo)}</TableCell>
                    )}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleManageRenewal(customer)}>
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>Manage renewal</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMakeCall(customer)}>
                            <PhoneCall className="mr-2 h-4 w-4" />
                            <span>Call customer</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendEmail(customer)}>
                            <Mail className="mr-2 h-4 w-4" />
                            <span>Send email</span>
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
      
      {/* Renewal Management Dialog */}
      {selectedCustomer && (
        <RenewalManagementDialog
          isOpen={isRenewalDialogOpen}
          onClose={() => setIsRenewalDialogOpen(false)}
          customer={selectedCustomer}
        />
      )}
      
      {/* Email Dialog */}
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
    </Layout>
  );
}
