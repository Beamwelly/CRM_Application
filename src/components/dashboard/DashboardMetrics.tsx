import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCRM } from '@/context/hooks';

export function DashboardMetrics() {
  // Get leads and customers already filtered by backend/context based on user role/permissions
  const { leads, customers } = useCRM(); 
  
  // Calculate metrics directly from the provided, filtered data
  const totalLeads = leads.length;
  const totalCustomers = customers.length;
  
  // Pending Renewals calculation uses the reverted `nextRenewal` field
  const pendingRenewals = customers.filter(c => {
    // Use the original property name: nextRenewal
    if (!c.nextRenewal) return false; 
    const now = new Date();
    // Use the original property name: nextRenewal
    const renewalDate = new Date(c.nextRenewal); 
    const daysUntilRenewal = Math.floor((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilRenewal <= 30 && daysUntilRenewal >= 0;
  }).length;
  
  // Conversion rate calculation remains the same
  const conversionRate = totalLeads > 0 
    ? Math.round((totalCustomers / totalLeads) * 100) 
    : 0;
    
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalLeads}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCustomers}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Renewals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingRenewals}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{conversionRate}%</div>
        </CardContent>
      </Card>
    </div>
  );
}
