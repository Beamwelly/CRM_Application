
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PaymentType } from "@/types";

interface PaymentTypeSelectProps {
  control: any;
}

export function PaymentTypeSelect({ control }: PaymentTypeSelectProps) {
  return (
    <FormField
      control={control}
      name="paymentType"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Payment Method</FormLabel>
          <Select 
            onValueChange={field.onChange} 
            value={field.value || "full_payment"}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="full_payment">Full Payment</SelectItem>
              <SelectItem value="installment">Installment</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
