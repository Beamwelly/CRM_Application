import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useEffect, useState } from 'react';
import { api } from '@/services/api';

// Define the expected data structure from the API
interface ServiceTypeDistributionData {
  serviceType: string;
  count: number;
}

// --- Add adminId prop and title prop ---
interface DashboardChartsProps {
  selectedAdminId?: string | null; 
  title?: string; // New title prop
}

export function DashboardCharts({ selectedAdminId, title }: DashboardChartsProps) { // Add title to destructuring
  // State to hold the fetched distribution data
  const [distributionData, setDistributionData] = useState<ServiceTypeDistributionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // --- Modify API endpoint to include selectedAdminId ---
        let apiUrl = '/dashboard/service-distribution';
        if (selectedAdminId) {
          apiUrl += `?adminId=${selectedAdminId}`;
        }
        const response = await api.get(apiUrl);
        // --- End modification ---
        const responseData = response as ServiceTypeDistributionData[];
        
        if (!Array.isArray(responseData)) {
           console.error("API response is not an array:", responseData);
           throw new Error("Invalid data format received from server.");
        }

        const formattedData = responseData.map(item => ({
          ...item,
          name: item.serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Use 'name' for XAxis
        }));
        setDistributionData(formattedData);
      } catch (err) {
        console.error("Failed to fetch service type distribution:", err);
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedAdminId]); // --- Add selectedAdminId to dependency array ---
  
  // Display loading or error state
  if (isLoading) {
    return <Card className="col-span-1"><CardHeader><CardTitle>{title || 'Service Type Distribution'}</CardTitle></CardHeader><CardContent>Loading...</CardContent></Card>;
  }

  if (error) {
    return <Card className="col-span-1"><CardHeader><CardTitle>{title || 'Service Type Distribution'}</CardTitle></CardHeader><CardContent>Error loading data: {error}</CardContent></Card>;
  }

  // Render the chart with fetched data
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>{title || 'Service Type Distribution'}</CardTitle> {/* Use title prop or default */}
      </CardHeader>
      <CardContent className="h-[300px]">
        {distributionData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={distributionData} // Use fetched data
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <XAxis dataKey="name" /> {/* Use the formatted 'name' */}
              <YAxis />
              <Tooltip />
              <Legend />
              {/* Use 'count' from fetched data */}
              <Bar dataKey="count" fill="#8884d8" name="Total Count" /> 
              {/* Remove the second Bar for customers if data is combined */}
              {/* <Bar dataKey="customers" fill="#82ca9d" name="Customers" /> */}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p>No service type data available.</p>
        )}
      </CardContent>
    </Card>
  );
}
