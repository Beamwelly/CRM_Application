import React from 'react';
import { HistoryEntry } from '@/types'; // Use HistoryEntry
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Phone, MessageSquare, FileText } from 'lucide-react'; 
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { AudioPlayer } from '../common/AudioPlayer'; // Assuming this exists

interface CommunicationItemProps {
  communication: HistoryEntry; 
  getUserName: (id: string) => string;
  formatDuration: (seconds?: number) => string;
  onShowEmailContent: (emailBody?: string) => void;
}

export function CommunicationItem({ 
  communication, 
  getUserName, 
  formatDuration, 
  onShowEmailContent
}: CommunicationItemProps) {
  
  // Destructure fields from HistoryEntry
  const { type, date, notes, createdBy, duration, recordingUrl, emailSubject, emailBody, remarkText } = communication;
  const userName = getUserName(createdBy);

  const getIcon = () => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'remark': return <FileText className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />; // Fallback icon
    }
  };

  // Determine the text content (use notes for call, remarkText for remark)
  const contentText = type === 'remark' ? remarkText : notes;

  return (
    <Card className="p-4">
      <div className="flex items-start space-x-4">
        <Avatar className="h-8 w-8 border">
          <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-medium">{userName}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(date), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
            <span className="flex items-center text-xs text-muted-foreground capitalize">
              {getIcon()}
              <span className="ml-1">{type}</span>
            </span>
          </div>
          
          {/* Display content text if available */} 
          {contentText && (
             <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contentText}</p>
          )}

          {/* Call specific details */} 
          {type === 'call' && (
            <>
              <p className="text-sm text-muted-foreground">Duration: {formatDuration(duration)}</p>
              {recordingUrl && <AudioPlayer src={recordingUrl} />}
            </>
          )}
          
          {/* Email specific details */} 
          {type === 'email' && (
            <>
              <p className="text-sm font-medium">Subject: {emailSubject}</p>
              {emailBody && (
                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onShowEmailContent(emailBody)}>
                  View Content
                </Button>
              )}
            </>
          )}
          
        </div>
      </div>
    </Card>
  );
}
