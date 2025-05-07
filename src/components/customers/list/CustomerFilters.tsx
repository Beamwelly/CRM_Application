
import { Button } from "@/components/ui/button";

interface CustomerFiltersProps {
  filter: 'all' | 'training' | 'wealth';
  onFilterChange: (filter: 'all' | 'training' | 'wealth') => void;
}

export function CustomerFilters({ filter, onFilterChange }: CustomerFiltersProps) {
  return (
    <div className="flex space-x-2">
      <Button 
        variant={filter === 'all' ? 'default' : 'outline'} 
        onClick={() => onFilterChange('all')}
      >
        All
      </Button>
      <Button 
        variant={filter === 'training' ? 'default' : 'outline'} 
        onClick={() => onFilterChange('training')}
        className={filter === 'training' ? "bg-training hover:bg-training-dark text-white" : ""}
      >
        Training
      </Button>
      <Button 
        variant={filter === 'wealth' ? 'default' : 'outline'} 
        onClick={() => onFilterChange('wealth')}
        className={filter === 'wealth' ? "bg-wealth hover:bg-wealth-dark text-white" : ""}
      >
        Wealth
      </Button>
    </div>
  );
}
