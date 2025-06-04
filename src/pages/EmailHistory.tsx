import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { EmailReplies } from '@/components/communication/EmailReplies';

interface EmailRecord {
  id: string;
  type: string;
  emailSubject: string;
  emailBody: string;
  date: string;
  emailSent: boolean;
  leadId?: string;
  customerId?: string;
}

interface EmailReply {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  received_at: string;
  is_read: boolean;
  original_subject: string;
  original_body: string;
}

export default function EmailHistory() {
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);
  const [unreadReplies, setUnreadReplies] = useState<EmailReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmails();
    fetchUnreadReplies();
  }, []);

  const fetchEmails = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/communications/sent-emails');
      setSentEmails(response.data);
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch email history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnreadReplies = async () => {
    try {
      const response = await api.get('/api/email-replies/unread');
      setUnreadReplies(response.data);
    } catch (error) {
      console.error('Error fetching unread replies:', error);
    }
  };

  if (isLoading) {
    return <div>Loading email history...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Email History</h1>
      
      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <Card>
            <CardHeader>
              <CardTitle>Inbox</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {unreadReplies.map((reply) => (
                    <Card key={reply.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{reply.from_email}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(reply.received_at), 'PPpp')}
                          </p>
                        </div>
                        <Badge variant="secondary">New</Badge>
                      </div>
                      <p className="font-medium mb-2">{reply.subject}</p>
                      <p className="whitespace-pre-wrap mb-4">{reply.body}</p>
                      <div className="text-sm text-muted-foreground">
                        <p>In reply to: {reply.original_subject}</p>
                      </div>
                    </Card>
                  ))}
                  {unreadReplies.length === 0 && (
                    <p className="text-muted-foreground">No new replies</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle>Sent Emails</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {sentEmails.map((email) => (
                    <Card key={email.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{email.emailSubject}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(email.date), 'PPpp')}
                          </p>
                        </div>
                        {email.emailSent ? (
                          <Badge variant="success">Sent</Badge>
                        ) : (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap mb-4">{email.emailBody}</p>
                      <EmailReplies emailId={email.id} />
                    </Card>
                  ))}
                  {sentEmails.length === 0 && (
                    <p className="text-muted-foreground">No sent emails</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 