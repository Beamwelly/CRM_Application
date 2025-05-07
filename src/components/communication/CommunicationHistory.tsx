import { useState, useEffect } from 'react';
import { useCRM } from '@/context/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CommunicationTabs } from './CommunicationTabs';
import { HistoryEntry } from '@/types';

interface CommunicationHistoryProps {
  entityId: string | number;
  entityType: 'lead' | 'customer';
}

export function CommunicationHistory({ entityId, entityType }: CommunicationHistoryProps) {
  const { getCommunicationHistoryForEntity, users } = useCRM();
  const [activeTab, setActiveTab] = useState<'all' | 'calls' | 'emails' | 'remarks'>('all');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedHistory = await getCommunicationHistoryForEntity(entityId);
        setHistory(fetchedHistory);
      } catch (err) {
        console.error("Failed to fetch communication history:", err);
        setError(err instanceof Error ? err.message : "Failed to load history");
        toast({ variant: 'destructive', title: 'Error loading history' });
        setHistory([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (entityId) {
      fetchHistory();
    } else {
      setHistory([]);
      setIsLoading(false);
    }
  }, [entityId, getCommunicationHistoryForEntity, toast]);
  
  const filteredHistory: HistoryEntry[] = history.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'calls') return item.type === 'call';
    if (activeTab === 'emails') return item.type === 'email';
    if (activeTab === 'remarks') return item.type === 'remark';
    return true;
  });
  
  const getUserNameById = (userId: string): string => {
    const user = users.find(user => user.id === userId);
    return user ? user.name : "Unknown";
  };
  
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const showEmailContent = (emailBody?: string) => {
    if (!emailBody) return;
    
    toast({
      title: "Email Content",
      description: emailBody,
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p>Loading history...</p>}
        {error && <p className="text-destructive">Error: {error}</p>}
        {!isLoading && !error && (
          <CommunicationTabs
            activeTab={activeTab}
            filteredHistory={filteredHistory}
            onTabChange={(value) => setActiveTab(value as 'all' | 'calls' | 'emails' | 'remarks')}
            getUserName={getUserNameById}
            formatDuration={formatDuration}
            onShowEmailContent={showEmailContent}
          />
        )}
      </CardContent>
    </Card>
  );
}
