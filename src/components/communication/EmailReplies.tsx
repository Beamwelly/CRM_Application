import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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

interface EmailRepliesProps {
  emailId: string;
}

export function EmailReplies({ emailId }: EmailRepliesProps) {
  const [replies, setReplies] = useState<EmailReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReplies();
  }, [emailId]);

  const fetchReplies = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/email-replies/${emailId}`);
      setReplies(response.data);
    } catch (error) {
      console.error('Error fetching replies:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch email replies',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (replyId: string) => {
    try {
      await api.patch(`/api/email-replies/${replyId}/read`);
      setReplies(replies.map(reply => 
        reply.id === replyId ? { ...reply, is_read: true } : reply
      ));
    } catch (error) {
      console.error('Error marking reply as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark reply as read',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div>Loading replies...</div>;
  }

  if (replies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Replies</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No replies yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Replies</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {replies.map((reply) => (
              <Card key={reply.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{reply.from_email}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(reply.received_at), 'PPpp')}
                    </p>
                  </div>
                  {!reply.is_read && (
                    <Badge variant="secondary">New</Badge>
                  )}
                </div>
                <p className="font-medium mb-2">{reply.subject}</p>
                <p className="whitespace-pre-wrap mb-4">{reply.body}</p>
                {!reply.is_read && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAsRead(reply.id)}
                  >
                    Mark as Read
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 