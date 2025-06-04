import { useState, useEffect } from "react";
import { useCRM } from "@/context/hooks";
import { format, isValid } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter } from "lucide-react";

interface Remark {
  id: string;
  content: string;
  entityType: "lead" | "customer";
  entityId: string;
  entityName: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
}

export function RemarksList() {
  const { currentUser, remarksRefreshTrigger, leads, customers, users } = useCRM();
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "lead" | "customer">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    console.log("RemarksList: remarksRefreshTrigger changed, fetching remarks...");
    fetchRemarks();
  }, [remarksRefreshTrigger]);

  const getEntityName = (entityType: string, entityId: string) => {
    if (entityType === 'lead') {
      const lead = leads.find(l => l.id === entityId);
      return lead?.name || 'Unknown Lead';
    } else if (entityType === 'customer') {
      const customer = customers.find(c => c.id === entityId);
      return customer?.name || 'Unknown Customer';
    }
    return 'Unknown Entity';
  };

  const getCreatorName = (creatorId: string) => {
    const creator = users.find(u => u.id === creatorId);
    return creator?.name || 'Unknown User';
  };

  const fetchRemarks = async () => {
    try {
      console.log("RemarksList: Starting to fetch remarks...");
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/communications?type=remark`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("Failed to fetch remarks");
      }
      const data = await response.json();
      console.log("RemarksList: Raw remarks data:", JSON.stringify(data, null, 2));
      
      // Transform the data to ensure all required fields are present
      const transformedData = data.map((remark: any) => {
        // Get the entity type and ID
        const entityType = remark.leadId ? 'lead' : remark.customerId ? 'customer' : 'unknown';
        const entityId = remark.leadId || remark.customerId || '';
        
        // Get the content from either notes or remarkText
        const content = remark.notes || remark.remarkText || '';
        
        // Get the creator ID
        const creatorId = typeof remark.createdBy === 'string' 
          ? remark.createdBy 
          : remark.createdBy?.id || '';

        return {
          id: remark.id,
          content,
          entityType,
          entityId,
          entityName: getEntityName(entityType, entityId),
          createdAt: remark.date || remark.createdAt || new Date().toISOString(),
          createdBy: {
            id: creatorId,
            name: getCreatorName(creatorId)
          }
        };
      });
      
      console.log("RemarksList: Transformed remarks data:", JSON.stringify(transformedData, null, 2));
      setRemarks(transformedData);
    } catch (err) {
      console.error("RemarksList: Error fetching remarks:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) {
      console.warn("No date string provided");
      return "No date";
    }
    
    try {
      const date = new Date(dateString);
      if (!isValid(date)) {
        console.warn("Invalid date received:", dateString);
        return "Invalid date";
      }
      return format(date, "PPp");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  const filteredRemarks = remarks.filter((remark) => {
    const matchesFilter = filter === "all" || remark.entityType === filter;
    const matchesSearch = searchQuery === "" || 
      remark.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      remark.entityName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return <div className="text-center py-4">Loading remarks...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Select value={filter} onValueChange={(value: "all" | "lead" | "customer") => setFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Remarks</SelectItem>
            <SelectItem value="lead">Lead Remarks</SelectItem>
            <SelectItem value="customer">Customer Remarks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Remark</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRemarks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No remarks found
                </TableCell>
              </TableRow>
            ) : (
              filteredRemarks.map((remark) => (
                <TableRow key={remark.id}>
                  <TableCell className="font-medium">{remark.entityName}</TableCell>
                  <TableCell>
                    <Badge variant={remark.entityType === "lead" ? "secondary" : "default"}>
                      {remark.entityType}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md">{remark.content}</TableCell>
                  <TableCell>{remark.createdBy.name}</TableCell>
                  <TableCell>{formatDate(remark.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 