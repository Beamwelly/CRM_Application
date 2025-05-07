
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ImportInstructionsProps {
  type: 'leads' | 'customers';
}

export function ImportInstructions({ type }: ImportInstructionsProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a CSV or Excel file with {type} information. The file must include columns for 
        {type === 'leads' ? ' name, email, mobile, city, and serviceType.' : ' name, email, mobile, city, serviceType, and startDate.'}
      </p>
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Required columns</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside text-sm">
            <li>name (string) - Full name</li>
            <li>email (string) - Email address</li>
            <li>mobile (string) - Mobile number</li>
            <li>city (string) - City name</li>
            <li>serviceType (string) - Must be "training" or "wealth"</li>
            {type === 'customers' && <li>startDate (date) - Start date in DD-MM-YYYY format</li>}
          </ul>
          <p className="text-sm mt-2">
            Optional columns: {type === 'leads' ? 'leadSource, referredBy, company, aum' : 'batchNo, paymentType, address, aum, welcomeEmail, community, calls'}
          </p>
          {type === 'customers' && (
            <p className="text-sm mt-2 font-medium text-warning-dark">
              Important: All dates must be in DD-MM-YYYY format
            </p>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
