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
    const dateA = typeof a.followUp.nextCallDate === 'string' ? new Date(a.followUp.nextCallDate) : a.followUp.nextCallDate;
    const dateB = typeof b.followUp.nextCallDate === 'string' ? new Date(b.followUp.nextCallDate) : b.followUp.nextCallDate;
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
            const followUp = item.followUp; // Extract nested followUp for easier access
            const entity = item.entity; // Extract nested entity
            const nextCallDate = typeof followUp.nextCallDate === 'string' ? new Date(followUp.nextCallDate) : followUp.nextCallDate;
            return (
              <div 
                key={followUp.id} // Use id from nested followUp
                className="flex flex-col p-3 border rounded-md"
              >
                <div className="flex justify-between items-start">
                  <span className="font-medium">
                    {entity.name || 'Unknown Contact'} // Use name from nested entity
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {!isNaN(nextCallDate.getTime()) ? format(nextCallDate, 'dd MMM yyyy') : 'Invalid Date'} // Use date from nested followUp
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {followUp.notes} // Use notes from nested followUp
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
