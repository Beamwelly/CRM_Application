import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { useCRM } from '@/context/hooks';

export function DashboardTasks() {
  const { getPendingFollowUps, currentUser } = useCRM();
  
  const followUpItems = currentUser 
    ? getPendingFollowUps(currentUser.id)
    : [];
  
  // Sort by the date within the nested followUp object
  followUpItems.sort((a, b) => {
    const dateA = typeof a.nextCallDate === 'string' ? new Date(a.nextCallDate) : a.nextCallDate;
    const dateB = typeof b.nextCallDate === 'string' ? new Date(b.nextCallDate) : b.nextCallDate;
    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0; 
    return dateA.getTime() - dateB.getTime();
  });
  
  const upcomingFollowUps = followUpItems.slice(0, 5);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Follow-ups</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {upcomingFollowUps.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No upcoming follow-ups
          </p>
        ) : (
          upcomingFollowUps.map((item) => { 
            // Properties are assumed to be directly on 'item'
            const nextCallDate = typeof item.nextCallDate === 'string' ? new Date(item.nextCallDate) : item.nextCallDate;
            return (
              <div 
                key={item.id} // Use id directly from item
                className="flex flex-col p-3 border rounded-md"
              >
                <div className="flex justify-between items-start">
                  <span className="font-medium">
                    {item.leadName || item.customerName || 'Unknown Contact'} // Use leadName or customerName
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {!isNaN(nextCallDate.getTime()) ? format(nextCallDate, 'dd MMM yyyy') : 'Invalid Date'} // Use date from item
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {item.notes} // Use notes directly from item
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
