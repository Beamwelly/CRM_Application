import { Layout } from "@/components/layout/Layout";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { DashboardTasks } from "@/components/dashboard/DashboardTasks";
import { useCRM } from "@/context/hooks";
import { DeveloperDashboard } from "@/components/dashboard/DeveloperDashboard";

export default function Dashboard() {
  const { currentUser } = useCRM();

  return (
    <Layout>
      <div className="flex flex-col gap-4 md:gap-8">
        {currentUser?.role === 'developer' ? (
          <DeveloperDashboard />
        ) : (
          <DashboardMetrics />
        )}
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="col-span-2">
            <DashboardCharts />
          </div>
          <div>
            <DashboardTasks />
          </div>
        </div>
      </div>
    </Layout>
  );
}
