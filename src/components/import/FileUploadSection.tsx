
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FileUploadSectionProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FileUploadSection({ onFileChange }: FileUploadSectionProps) {
  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="file">Upload File</Label>
      <Input
        id="file"
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={onFileChange}
      />
      <p className="text-sm text-muted-foreground">Supported formats: .xlsx, .xls, .csv</p>
    </div>
  );
}
