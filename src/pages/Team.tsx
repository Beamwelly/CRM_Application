
import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCRM } from '@/context/hooks';

export default function Team() {
  const { users, leads, customers, getLeadsByAssignee, getCustomersByAssignee } = useCRM();
  const [activeTab, setActiveTab] = useState('overview');

  // Filter only executives
  const executives = useMemo(() => 
    users.filter(user => user.role === 'executive'),
    [users]
  );

  // Get performance data for all executives
  const executivePerformanceData = useMemo(() => {
    return executives.map(executive => {
      const executiveLeads = getLeadsByAssignee(executive.id);
      const executiveCustomers = getCustomersByAssignee(executive.id);
      
      return {
        id: executive.id,
        name: executive.name,
        role: executive.role,
        email: executive.email,
        leads: executiveLeads.length,
        customers: executiveCustomers.length,
        conversionRate: executiveLeads.length > 0 
          ? ((executiveCustomers.filter(c => c.leadId).length / executiveLeads.length) * 100).toFixed(1) 
          : '0',
        leadsByStatus: {
          new: executiveLeads.filter(l => l.status === 'new').length,
          follow_up: executiveLeads.filter(l => l.status === 'follow_up').length,
          not_connected: executiveLeads.filter(l => l.status === 'not_connected').length,
          ready_to_attend: executiveLeads.filter(l => l.status === 'ready_to_attend').length,
          attended: executiveLeads.filter(l => l.status === 'attended').length,
          interested: executiveLeads.filter(l => l.status === 'interested').length,
          consultation_done: executiveLeads.filter(l => l.status === 'consultation_done').length,
        },
        customersByServiceType: {
          training: executiveCustomers.filter(c => c.serviceType === 'training').length,
          wealth: executiveCustomers.filter(c => c.serviceType === 'wealth').length,
        }
      };
    });
  }, [executives, getLeadsByAssignee, getCustomersByAssignee]);

  // Create chart data for the overview tab
  const overviewChartData = executivePerformanceData.map(exec => ({
    name: exec.name,
    leads: exec.leads,
    customers: exec.customers,
    conversionRate: parseFloat(exec.conversionRate),
  }));

  // Get lead status distribution for the team
  const leadStatusData = useMemo(() => {
    // Training lead statuses
    const trainingStatuses = ['new', 'not_connected', 'follow_up', 'ready_to_attend', 'attended'];
    const trainingData = trainingStatuses.map(status => ({
      status,
      count: leads.filter(l => l.serviceType === 'training' && l.status === status).length,
    }));

    // Wealth lead statuses
    const wealthStatuses = ['new', 'not_connected', 'follow_up', 'interested', 'consultation_done'];
    const wealthData = wealthStatuses.map(status => ({
      status,
      count: leads.filter(l => l.serviceType === 'wealth' && l.status === status).length,
    }));

    return { trainingData, wealthData };
  }, [leads]);

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Team Management</h1>
        
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="executives">Executives</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Executives</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{executives.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{leads.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{customers.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Conversion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {leads.length > 0 
                      ? `${((customers.filter(c => c.leadId).length / leads.length) * 100).toFixed(1)}%` 
                      : '0%'}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Executive Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={overviewChartData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" orientation="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#8884d8" />
                      <Bar yAxisId="left" dataKey="customers" name="Customers" fill="#82ca9d" />
                      <Bar yAxisId="right" dataKey="conversionRate" name="Conversion Rate (%)" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="executives" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Executive Team</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Lead Count</TableHead>
                      <TableHead>Customer Count</TableHead>
                      <TableHead>Conversion Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executivePerformanceData.map((executive) => (
                      <TableRow key={executive.id}>
                        <TableCell className="font-medium">{executive.name}</TableCell>
                        <TableCell>{executive.email}</TableCell>
                        <TableCell>{executive.leads}</TableCell>
                        <TableCell>{executive.customers}</TableCell>
                        <TableCell>{executive.conversionRate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Lead Status (Training)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={leadStatusData.trainingData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Leads" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Lead Status (Wealth)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={leadStatusData.wealthData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Leads" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Executive Detailed Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Lead Types</TableHead>
                      <TableHead>Lead Statuses</TableHead>
                      <TableHead>Customer Types</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executivePerformanceData.map((executive) => (
                      <TableRow key={executive.id}>
                        <TableCell className="font-medium">{executive.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center">
                              <Badge variant="outline" className="mr-2">Training</Badge>
                              <span>{executive.leadsByStatus.new + executive.leadsByStatus.not_connected + 
                                executive.leadsByStatus.follow_up + executive.leadsByStatus.ready_to_attend + 
                                executive.leadsByStatus.attended}</span>
                            </div>
                            <div className="flex items-center">
                              <Badge variant="outline" className="mr-2">Wealth</Badge>
                              <span>{executive.leadsByStatus.new + executive.leadsByStatus.not_connected + 
                                executive.leadsByStatus.follow_up + executive.leadsByStatus.interested + 
                                executive.leadsByStatus.consultation_done}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center">
                              <Badge variant="outline" className="mr-2">New</Badge>
                              <span>{executive.leadsByStatus.new}</span>
                            </div>
                            <div className="flex items-center">
                              <Badge variant="outline" className="mr-2">Follow-up</Badge>
                              <span>{executive.leadsByStatus.follow_up}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center">
                              <Badge variant="outline" className="mr-2">Training</Badge>
                              <span>{executive.customersByServiceType.training}</span>
                            </div>
                            <div className="flex items-center">
                              <Badge variant="outline" className="mr-2">Wealth</Badge>
                              <span>{executive.customersByServiceType.wealth}</span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
