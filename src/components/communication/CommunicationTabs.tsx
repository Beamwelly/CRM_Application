import { HistoryEntry } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CommunicationItem } from './CommunicationItem';

interface CommunicationTabsProps {
  activeTab: 'all' | 'calls' | 'emails' | 'remarks';
  filteredHistory: HistoryEntry[];
  onTabChange: (value: string) => void;
  getUserName: (id: string) => string;
  formatDuration: (seconds?: number) => string;
  onShowEmailContent: (emailBody?: string) => void;
}

export function CommunicationTabs({
  activeTab,
  filteredHistory,
  onTabChange,
  getUserName,
  formatDuration,
  onShowEmailContent
}: CommunicationTabsProps) {
  
  const renderHistoryList = (historyList: HistoryEntry[]) => {
    if (historyList.length === 0) {
      return <p className="text-center text-muted-foreground pt-4">No items found for this filter.</p>;
    }
    return historyList.map((item) => (
      <CommunicationItem 
        key={item.id} 
        communication={item} 
        getUserName={getUserName} 
        formatDuration={formatDuration}
        onShowEmailContent={onShowEmailContent}
      />
    ));
  };

  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="mb-4">
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="calls">Calls</TabsTrigger>
        <TabsTrigger value="emails">Emails</TabsTrigger>
        <TabsTrigger value="remarks">Remarks</TabsTrigger>
      </TabsList>
      
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {renderHistoryList(filteredHistory)}
        </div>
      </ScrollArea>
    </Tabs>
  );
}
