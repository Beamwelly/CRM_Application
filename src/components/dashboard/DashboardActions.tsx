
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, UserPlus, Calendar } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddLeadDialog } from '@/components/leads/AddLeadDialog';
import { AddCustomerDialog } from '@/components/customers/AddCustomerDialog';

export function DashboardActions() {
  const navigate = useNavigate();
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          className="w-full justify-start text-left"
          onClick={() => setIsAddLeadOpen(true)}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Lead
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start text-left"
          onClick={() => setIsAddCustomerOpen(true)}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add New Customer
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start text-left"
          onClick={() => navigate('/follow-ups')}
        >
          <Calendar className="mr-2 h-4 w-4" />
          View Follow-ups
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start text-left"
          onClick={() => navigate('/renewals')}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Manage Renewals
        </Button>
        
        {/* Dialogs */}
        <AddLeadDialog
          isOpen={isAddLeadOpen}
          onClose={() => setIsAddLeadOpen(false)}
        />
        <AddCustomerDialog
          isOpen={isAddCustomerOpen}
          onClose={() => setIsAddCustomerOpen(false)}
        />
      </CardContent>
    </Card>
  );
}
