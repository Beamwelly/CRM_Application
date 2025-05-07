import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area'; // For email list
import { Separator } from '@/components/ui/separator'; // For visual separation
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Optional: for sender icon
import { Link } from 'react-router-dom'; // For related entity link
import { Button } from "@/components/ui/button"; // Import Button
import { PenSquare, Reply } from 'lucide-react'; // Import Icons
import { api } from '@/services/api';
import { useCRM } from '@/context/hooks';
import { HistoryEntry, User } from '@/types';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs" // Import Tabs components
import { SendEmailDialog } from '@/components/email/SendEmailDialog'; // Import the dialog

export default function EmailHistoryPage() {
  const [sentEmails, setSentEmails] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<HistoryEntry | null>(null);
  // State for the dialog
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  // Store the email being replied to, or null for compose
  const [replyingToEmail, setReplyingToEmail] = useState<HistoryEntry | null>(null);
  
  const { currentUser, users } = useCRM();

  const getUser = (userId?: string): User | undefined => {
    return users.find(u => u.id === userId);
  }
  const getUserName = (userId?: string): string => getUser(userId)?.name || 'Unknown User';
  const getUserInitial = (userId?: string): string => getUser(userId)?.name?.[0]?.toUpperCase() || 'U';

  useEffect(() => {
    const fetchEmails = async () => {
      if (!currentUser) return;
      setIsLoading(true);
      setError(null);
      setSelectedEmail(null);
      try {
        const response = await api.get<HistoryEntry[]>('/communications/emails');
        setSentEmails(response);
      } catch (err) {
        console.error("Failed to fetch sent emails:", err);
        setError(err instanceof Error ? err.message : 'Failed to load email history');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmails();
  }, [currentUser]);

  const handleSelectEmail = (email: HistoryEntry) => {
    setSelectedEmail(email);
  };

  // --- Compose/Reply Handlers ---
  const handleOpenCompose = () => {
    setReplyingToEmail(null); // Ensure it's compose mode
    setIsComposeOpen(true);
  };

  const handleOpenReply = (emailToReply: HistoryEntry | null) => {
    if (!emailToReply) return;
    setReplyingToEmail(emailToReply); 
    setIsComposeOpen(true);
  };
  // --- End Handlers ---

  const getRelatedEntityLink = (email: HistoryEntry): string | null => {
    if (!email.entityType || !email.entityId) return null;
    if (email.entityType === 'lead') return `/leads?id=${email.entityId}`;
    if (email.entityType === 'customer') return `/customers?id=${email.entityId}`;
    return null;
  };
  
  const getRelatedEntityName = (email: HistoryEntry): string => {
     return email.recipientName || `${email.entityType?.toUpperCase()} ID: ${email.entityId}`;
  }

  // --- Prepare props for dialog --- 
  const prepareDialogProps = () => {
    if (!replyingToEmail) { // Compose mode
      return {
        isOpen: isComposeOpen,
        onClose: () => setIsComposeOpen(false),
        // No initial values needed for compose (or add defaults if desired)
      };
    }
    // Reply mode
    const originalSender = getUser(replyingToEmail.createdBy);
    const subjectPrefix = "Re:";
    const replySubject = replyingToEmail.emailSubject?.startsWith(subjectPrefix) 
      ? replyingToEmail.emailSubject 
      : `${subjectPrefix} ${replyingToEmail.emailSubject || ''}`;
      
    const originalBody = replyingToEmail.emailBody || '';
    const originalSentDate = format(new Date(replyingToEmail.date), 'PPpp');
    const quotedBody = `\n\n\n----- Original Message -----
From: ${originalSender?.name || 'Unknown'} <${originalSender?.email || 'N/A'}>
Sent: ${originalSentDate}
To: ${replyingToEmail.recipientName || replyingToEmail.recipient || 'N/A'}
Subject: ${replyingToEmail.emailSubject || '(No Subject)'}\n\n${originalBody}`;

    return {
      isOpen: isComposeOpen,
      onClose: () => setIsComposeOpen(false),
      initialRecipientEmail: originalSender?.email, // Reply TO the original sender
      initialName: originalSender?.name,
      initialSubject: replySubject,
      initialBody: quotedBody,
      isReply: true,
      // Keep related entity context if replying
      entityId: replyingToEmail.leadId || replyingToEmail.customerId,
      entityType: replyingToEmail.leadId ? 'lead' : replyingToEmail.customerId ? 'customer' : undefined,
    };
  };
  // --- End Dialog Props --- 

  return (
    <Layout>
      <Tabs defaultValue="sent" className="flex flex-col h-[calc(100vh-var(--header-height))]">
        <div className="p-4 border-b flex justify-between items-center">
           <div>
            <h1 className="text-2xl font-bold mb-2">Email</h1>
            <TabsList>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="inbox">Inbox</TabsTrigger>
            </TabsList>
          </div>
          {/* Add Compose Button */} 
          <Button onClick={handleOpenCompose}>
             <PenSquare className="mr-2 h-4 w-4" /> Compose
          </Button>
        </div>
        
        {/* Sent Emails Tab Content */}
        <TabsContent value="sent" className="flex-grow flex overflow-hidden m-0 p-0"> 
          <div className="flex flex-grow overflow-hidden">
            {/* Left Pane: Email List */}
            <div className="w-1/3 border-r overflow-hidden flex flex-col">
              <ScrollArea className="flex-grow p-2">
                {isLoading && <p className="p-4 text-center">Loading...</p>}
                {error && <p className="p-4 text-center text-destructive">Error: {error}</p>}
                {!isLoading && !error && sentEmails.length === 0 && (
                  <p className="p-4 text-center text-muted-foreground">No sent emails found.</p>
                )}
                {!isLoading && !error && sentEmails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={`w-full text-left p-3 mb-1 rounded-md hover:bg-accent ${selectedEmail?.id === email.id ? 'bg-accent' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm truncate">{getUserName(email.createdBy)}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(email.date), 'PP')}</span>
                    </div>
                    <p className="text-sm font-medium truncate mb-1">{email.emailSubject || '(No Subject)'}</p>
                    <p className="text-xs text-muted-foreground truncate">To: {email.recipientName || email.recipient || 'N/A'}</p>
                  </button>
                ))}
              </ScrollArea>
            </div>

            {/* Right Pane: Email Detail View */}
            <div className="w-2/3 overflow-hidden flex flex-col">
              {selectedEmail ? (
                <div className="flex-grow flex flex-col">
                  <CardHeader className="border-b">
                    <div className="flex justify-between items-start mb-1">
                      <CardTitle className="text-lg">{selectedEmail.emailSubject || '(No Subject)'}</CardTitle>
                      {/* Add Reply Button */} 
                      <Button variant="outline" size="sm" onClick={() => handleOpenReply(selectedEmail)}>
                        <Reply className="mr-2 h-4 w-4" /> Reply
                      </Button>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{getUserInitial(selectedEmail.createdBy)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span>From: {getUserName(selectedEmail.createdBy)}</span>
                        <span>To: {selectedEmail.recipientName || selectedEmail.recipient || 'N/A'}</span>
                      </div>
                      <span className="ml-auto">{format(new Date(selectedEmail.date), 'PPpp')}</span>
                    </div>
                    {getRelatedEntityLink(selectedEmail) && (
                      <div className="text-xs mt-2">
                        Related To: <Link to={getRelatedEntityLink(selectedEmail)!} className="text-primary hover:underline">{getRelatedEntityName(selectedEmail)}</Link>
                      </div>
                    )}
                  </CardHeader>
                  <ScrollArea className="flex-grow p-4">
                    <div className="whitespace-pre-wrap"> 
                      {selectedEmail.emailBody || '(No Content)'}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select an email to view its content.
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        {/* Inbox Tab Content (Placeholder) */}
        <TabsContent value="inbox" className="flex-grow flex items-center justify-center text-muted-foreground m-0 p-0">
          Inbox functionality will be implemented in the future.
        </TabsContent>
      </Tabs>
      
      {/* Render the SendEmailDialog */} 
      {isComposeOpen && (
        <SendEmailDialog {...prepareDialogProps()} />
      )}
    </Layout>
  );
} 