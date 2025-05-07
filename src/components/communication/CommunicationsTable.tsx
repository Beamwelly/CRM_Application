import { format } from 'date-fns';
import { HistoryEntry } from '@/types';
import { Mail, Phone, FileText } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CommunicationsTableProps {
  filteredHistory: HistoryEntry[];
  getUserNameById: (userId: string) => string;
  formatDuration: (seconds?: number) => string;
  viewEmailContent: (subject: string, body?: string) => void;
}

export function CommunicationsTable({
  filteredHistory,
  getUserNameById,
  formatDuration,
  viewEmailContent
}: CommunicationsTableProps) {
  if (filteredHistory.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No communication history found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-220px)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Made By</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Content</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredHistory.map((comm) => (
            <TableRow key={comm.id}>
              <TableCell>
                <div className="flex items-center">
                  {comm.type === 'call' ? (
                    <Phone className="mr-2 h-4 w-4 text-blue-500" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4 text-green-500" />
                  )}
                  <span className="capitalize">{comm.type}</span>
                  
                  {comm.type === 'call' && comm.callStatus && (
                    <Badge 
                      variant={
                        comm.callStatus === 'completed' ? 'outline' : 
                        comm.callStatus === 'missed' ? 'destructive' : 
                        'secondary'
                      }
                      className="ml-2"
                    >
                      {comm.callStatus}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{format(new Date(comm.date), 'MMM d, yyyy h:mm a')}</TableCell>
              <TableCell>
                <div>
                  <span className="font-medium">
                    {comm.leadId ? `Lead ${comm.leadId}` : comm.customerId ? `Cust ${comm.customerId}` : 'N/A'}
                  </span> 
                  <span className="ml-2 text-xs text-muted-foreground capitalize">
                    ({comm.leadId ? 'lead' : comm.customerId ? 'customer' : '-'}) 
                  </span>
                </div>
              </TableCell>
              <TableCell>{getUserNameById(comm.createdBy)}</TableCell>
              <TableCell>
                {comm.type === 'call' && comm.duration && (
                  <span>Duration: {formatDuration(comm.duration)}</span>
                )}
                {comm.type === 'email' && comm.emailSubject && (
                  <span>Subject: {comm.emailSubject}</span>
                )}
                {comm.type === 'remark' && (
                  <span className="text-muted-foreground italic">Remark</span>
                )}
              </TableCell>
              <TableCell>
                {comm.type === 'email' && comm.emailBody ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => viewEmailContent(comm.emailSubject || "No Subject", comm.emailBody)}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    View Content
                  </Button>
                ) : comm.type === 'remark' ? (
                  <span className="text-sm text-muted-foreground whitespace-pre-wrap">{comm.notes}</span>
                ) : comm.type === 'call' ? (
                  <span className="text-sm text-muted-foreground whitespace-pre-wrap">{comm.notes || 'No notes'}</span>
                ) : (
                  <span className="text-muted-foreground text-sm">No content</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
