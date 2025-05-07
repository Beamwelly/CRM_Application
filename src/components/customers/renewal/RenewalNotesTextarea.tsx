import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Control } from "react-hook-form";

interface FormValues {
  renewalDate?: Date;
  amount?: string;
  status?: "pending" | "renewed" | "cancelled" | "expired";
  notes?: string;
}

interface RenewalNotesTextareaProps {
  control: Control<FormValues>;
}

export function RenewalNotesTextarea({ control }: RenewalNotesTextareaProps) {
  return (
    <FormField
      control={control}
      name="notes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Notes (Optional)</FormLabel>
          <FormControl>
            <Textarea
              placeholder="Additional notes about the renewal"
              className="resize-none"
              {...field}
              value={field.value || ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
