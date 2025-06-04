import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { communicationService } from '@/services/communicationService';
import { useCRM } from '@/context/hooks';
import { format } from 'date-fns';
import { Mail, Reply, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CommunicationRecord } from '@/types';

interface EmailThread {
  thread_id: string;
  emails: Array<{
    id: string;
    email_type: 'sent' | 'reply' | 'thread';
    emailSubject: string;
    emailBody: string;
    date: Date;
    sender_name: string;
    recipientEmail: string;
    is_reply: boolean;
  }>;
}

export function EmailHistory() {
  const { currentUser } = useCRM();

  const { data: emails, isLoading } = useQuery<CommunicationRecord[]>({
    queryKey: ['emails'],
    queryFn: () => communicationService.getSentEmails(currentUser!),
    enabled: !!currentUser,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Group emails by thread
  const emailThreads = React.useMemo(() => {
    if (!emails) return [];
    
    const threads = new Map<string, EmailThread>();
    
    emails.forEach(email => {
      const threadId = email.parent_email_id || email.id;
      if (!threads.has(threadId)) {
        threads.set(threadId, {
          thread_id: threadId,
          emails: []
        });
      }
      threads.get(threadId)!.emails.push({
        id: email.id,
        email_type: email.is_reply ? 'reply' : 'sent',
        emailSubject: email.email_subject || '',
        emailBody: email.email_body || '',
        date: new Date(email.date),
        sender_name: email.sender_name || '',
        recipientEmail: email.recipient_email || '',
        is_reply: email.is_reply || false
      });
    });

    return Array.from(threads.values()).sort((a, b) => 
      new Date(b.emails[0].date).getTime() - new Date(a.emails[0].date).getTime()
    );
  }, [emails]);

  if (isLoading) {
    return <div>Loading emails...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Email History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          {emailThreads.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No emails found</div>
          ) : (
            emailThreads.map(thread => (
              <div key={thread.thread_id} className="mb-6 border rounded-lg p-4">
                {thread.emails.map((email, index) => (
                  <div key={email.id} className={`mb-4 ${index > 0 ? 'ml-8 border-l-2 pl-4' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {email.email_type === 'reply' ? (
                        <Reply className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Send className="h-4 w-4 text-green-500" />
                      )}
                      <Badge variant={email.email_type === 'reply' ? 'secondary' : 'default'}>
                        {email.email_type === 'reply' ? 'Reply' : 'Sent'}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {format(email.date, 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <div className="mb-2">
                      <div className="font-semibold">{email.emailSubject}</div>
                      <div className="text-sm text-gray-600">
                        From: {email.sender_name}
                        <br />
                        To: {email.recipientEmail}
                      </div>
                    </div>
                    <div 
                      className="text-sm whitespace-pre-wrap p-4 bg-gray-50 rounded-lg"
                      dangerouslySetInnerHTML={{ __html: email.emailBody || 'No content' }}
                    />
                  </div>
                ))}
              </div>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 