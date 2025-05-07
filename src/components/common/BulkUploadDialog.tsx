import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';
import { parseFile, ParsedRow } from '@/utils/importHelpers';
import { validateLeadData, validateCustomerData } from '@/utils/validation/importValidation';
import { useCRM } from '@/context/hooks';
import { bulkService } from '@/services/bulkService'; // Import bulkService

interface BulkUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type UploadType = 'leads' | 'customers';

export function BulkUploadDialog({ isOpen, onClose }: BulkUploadDialogProps) {
  const { toast } = useToast();
  const { fetchLeads, fetchCustomers } = useCRM(); // Get fetch functions from context
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<UploadType>('leads');
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setValidationErrors([]); // Clear errors when new file selected
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: 'No file selected', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    setValidationErrors([]);

    try {
      const parsedData: ParsedRow[] = await parseFile(selectedFile);
      console.log(`Parsed ${parsedData.length} rows from file.`);

      let errors: string[] = [];
      if (uploadType === 'leads') {
        errors = validateLeadData(parsedData);
      } else {
        errors = validateCustomerData(parsedData);
      }

      if (errors.length > 0) {
        setValidationErrors(errors);
        console.error('Validation errors:', errors);
        toast({ title: 'Validation Failed', description: `Found ${errors.length} errors in the file.`, variant: 'destructive' });
        setIsProcessing(false);
        return;
      }

      console.log('Validation successful. Data ready for backend upload.');
      toast({ title: 'Validation Successful', description: `File validated successfully. Uploading ${parsedData.length} ${uploadType}...` });
      
      // --- Backend Upload --- 
      try {
        let response;
        if (uploadType === 'leads') {
          response = await bulkService.uploadLeads(parsedData);
        } else {
          response = await bulkService.uploadCustomers(parsedData);
        }
        console.log('Bulk upload response:', response);
        toast({ 
          title: 'Upload Complete', 
          description: `${response.insertedCount} ${uploadType} processed.${response.errors?.length > 0 ? ` ${response.errors.length} rows had errors.` : ''}` 
        });

        // Refresh data in UI
        if (uploadType === 'leads') {
          await fetchLeads();
        } else {
          await fetchCustomers();
        }

        onClose(); // Close dialog on success

      } catch (uploadError) {
        console.error('Error during bulk upload API call:', uploadError);
        toast({ title: 'Upload Failed', description: uploadError instanceof Error ? uploadError.message : 'Could not upload data to server.', variant: 'destructive' });
      }
      // --- End Backend Upload --- 

    } catch (error) {
      console.error('Error processing file:', error);
      toast({ title: 'Error Processing File', description: error instanceof Error ? error.message : 'Could not parse or validate file.', variant: 'destructive' });
      setValidationErrors(['An unexpected error occurred during file processing.']);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Upload</DialogTitle>
          <DialogDescription>
            Upload Leads or Customers from an Excel (.xlsx) or CSV (.csv) file.
            Ensure the file matches the required format.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="uploadType">Upload Type</Label>
            <Select value={uploadType} onValueChange={(value: UploadType) => setUploadType(value)} disabled={isProcessing}>
              <SelectTrigger id="uploadType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="customers">Customers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fileUpload">File</Label>
            <Input 
              id="fileUpload" 
              type="file" 
              accept=".xlsx, .csv" 
              onChange={handleFileChange} 
              disabled={isProcessing}
            />
          </div>
          {validationErrors.length > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
              <h4 className="font-semibold text-destructive mb-2">Validation Errors:</h4>
              <ul className="list-disc pl-5 text-sm text-destructive space-y-1 max-h-40 overflow-y-auto">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isProcessing}>
            <Upload className="mr-2 h-4 w-4" />
            {isProcessing ? 'Processing...' : 'Validate & Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 