import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useCRM } from '@/context/hooks';
import { useToast } from '@/hooks/use-toast';
import { CommunicationFilters } from '@/components/communication/CommunicationFilters';
import { CommunicationsTable } from '@/components/communication/CommunicationsTable';
import { EmailContentDialog } from '@/components/communication/EmailContentDialog';
import { ServiceType, HistoryEntry } from "@/types";
import React from 'react';

export default function Communications() {
  const { getAllCommunicationHistory, users, currentUser, leads, customers } = useCRM();
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'call' | 'email'>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<'all' | ServiceType>('all');
  const [selectedEmailContent, setSelectedEmailContent] = useState<{subject: string, body: string} | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch communication history on mount and when filters change (if needed)
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        // Correctly call getAllCommunicationHistory with no args
        const fetchedHistory = await getAllCommunicationHistory();
        
        // --- Apply Filtering based on Role and Service Type --- 
        // Filter based on employee assignment (if applicable)
        let userFilteredHistory = fetchedHistory;
        if (currentUser?.role === 'employee') {
          userFilteredHistory = fetchedHistory.filter(comm => 
            (comm.leadId && leads.find(l => l.id === comm.leadId)?.assignedTo === currentUser.id) ||
            (comm.customerId && customers.find(c => c.id === comm.customerId)?.assignedTo === currentUser.id)
          );
          // TODO: This relies on leads/customers being available in context. Might need adjustment.
          // A backend filter might be more robust if not already implemented.
        }

        // Filter based on selected service type (if not 'all')
        let serviceFilteredHistory = userFilteredHistory;
        if (serviceTypeFilter !== 'all') {
          serviceFilteredHistory = userFilteredHistory.filter(comm => {
            const lead = leads.find(l => l.id === comm.leadId);
            const customer = customers.find(c => c.id === comm.customerId);
            const serviceType = lead?.serviceType || customer?.serviceType;
            return serviceType === serviceTypeFilter;
          });
          // TODO: This also relies on leads/customers being available in context.
        }
        
        setHistory(serviceFilteredHistory);
        
      } catch (error) {
        console.error("Error fetching communication history:", error);
        toast({ title: "Error", description: "Could not fetch communication history." });
        setHistory([]); // Clear history on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [getAllCommunicationHistory, serviceTypeFilter, currentUser, toast, leads, customers]);
  
  // Apply type filter (call/email) to the fetched & role/service-filtered history
  const filteredHistory = history.filter(comm => {
    if (filter === 'all') return true;
    return comm.type === filter;
  });
  
  // Map to the type expected by CommunicationsTable (add madeBy)
  const extendedFilteredHistory = filteredHistory.map((comm: HistoryEntry) => ({ ...comm, madeBy: comm.createdBy }));
  
  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Get user name by ID
  const getUserNameById = (userId: string): string => {
    const user = users.find(user => user.id === userId);
    return user ? `${user.name} (${user.position})` : "Unknown";
  };
  
  // View full email content
  const viewEmailContent = (subject: string, body?: string) => {
    if (!body) {
      toast({
        title: "No content available",
        description: "This email doesn't have any content.",
      });
      return;
    }
    
    setSelectedEmailContent({
      subject,
      body
    });
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Communication History
          </h1>
          <p className="text-muted-foreground">
            View all calls and emails with leads and customers
          </p>
        </div>
        
        <CommunicationFilters
          filter={filter}
          setFilter={setFilter}
          serviceTypeFilter={serviceTypeFilter}
          setServiceTypeFilter={setServiceTypeFilter}
          currentUser={currentUser}
        />
        
        <CommunicationsTable
          filteredHistory={extendedFilteredHistory}
          getUserNameById={getUserNameById}
          formatDuration={formatDuration}
          viewEmailContent={viewEmailContent}
        />
        
        <EmailContentDialog
          selectedEmailContent={selectedEmailContent}
          setSelectedEmailContent={setSelectedEmailContent}
        />
      </div>
    </Layout>
  );
}
