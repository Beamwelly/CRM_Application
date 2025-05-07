
import { Textarea } from "@/components/ui/textarea";

interface NotesTextareaProps {
  notes: string;
  onChange: (value: string) => void;
}

export function NotesTextarea({ notes, onChange }: NotesTextareaProps) {
  return (
    <Textarea
      placeholder="Call notes"
      value={notes}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-[100px]"
    />
  );
}
