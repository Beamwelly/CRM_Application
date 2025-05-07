import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Control } from "react-hook-form";

interface FormValues {
  renewalDate?: Date;
  amount?: string;
  status?: "pending" | "renewed" | "cancelled" | "expired";
  notes?: string;
}

interface RenewalAmountInputProps {
  control: Control<FormValues>;
}

export function RenewalAmountInput({ control }: RenewalAmountInputProps) {
  return (
    <FormField
      control={control}
      name="amount"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Amount (₹)</FormLabel>
          <FormControl>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                ₹
              </span>
              <Input
                type="number"
                placeholder="Enter renewal amount"
                {...field}
                value={field.value || ""}
                className="pl-7"
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
