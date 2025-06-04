import { Button } from "@/components/ui/button";
import { Mail, Phone } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, ServiceType } from "@/types";

interface CommunicationFiltersProps {
  filter: 'all' | 'call' | 'email';
  setFilter: (value: 'all' | 'call' | 'email') => void;
  serviceTypeFilter: 'all' | ServiceType;
  setServiceTypeFilter: (value: 'all' | ServiceType) => void;
  currentUser: User | null;
}

export function CommunicationFilters({
  filter,
  setFilter,
  serviceTypeFilter,
  setServiceTypeFilter,
  currentUser
}: CommunicationFiltersProps) {
  return (
    <div className="flex space-x-2 items-center">
      <div className="flex space-x-2">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button 
          variant={filter === 'call' ? 'default' : 'outline'} 
          onClick={() => setFilter('call')}
        >
          <Phone className="mr-2 h-4 w-4" />
          Calls
        </Button>
        <Button 
          variant={filter === 'email' ? 'default' : 'outline'} 
          onClick={() => setFilter('email')}
        >
          <Mail className="mr-2 h-4 w-4" />
          Emails
        </Button>
      </div>
      
      {(currentUser?.role === 'developer' || currentUser?.role === 'admin') && (
        <div className="ml-auto flex items-center space-x-2">
          <span className="text-sm font-medium">Service Type:</span>
          <Select 
            value={serviceTypeFilter} 
            onValueChange={(value) => setServiceTypeFilter(value as 'all' | ServiceType)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="training">Training</SelectItem>
              <SelectItem value="wealth">Wealth</SelectItem>
              <SelectItem value="equity">Equity</SelectItem>
              <SelectItem value="insurance">Insurance</SelectItem>
              <SelectItem value="mutual_funds">Mutual Funds</SelectItem>
              <SelectItem value="PMS">PMS</SelectItem>
              <SelectItem value="AIF">AIF</SelectItem>
              <SelectItem value="others">Others</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
