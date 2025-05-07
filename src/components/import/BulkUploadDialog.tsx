import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { useCRM } from "@/context/hooks";
import { useToast } from "@/hooks/use-toast";
import { ServiceType, Lead, Customer } from "@/types";
import { FileUploadSection } from "./FileUploadSection";
import { ValidationTable } from "./ValidationTable";
import { ImportInstructions } from "./ImportInstructions";
import { validateLeadData, validateCustomerData } from "@/utils/validation/importValidation";
import { parseFile, prepareLeadData, prepareCustomerData, ParsedRow } from "@/utils/importHelpers";

type ParsedData = ParsedRow;

interface BulkUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkUploadDialog({ isOpen, onClose }: BulkUploadDialogProps) {
  const { addLead, addCustomer, currentUser } = useCRM();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState("leads");
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedData, setParsedData] = React.useState<ParsedData[]>([]);
  const [validationErrors, setValidationErrors] = React.useState<string[]>([]);
  const [validationSuccess, setValidationSuccess] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<"idle" | "validating" | "uploading" | "success" | "error">("idle");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedData([]);
      setValidationErrors([]);
      setValidationSuccess(false);
      setUploadStatus("idle");
    }
  };

  const validateAndParseFile = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploadStatus("validating");
    setValidationErrors([]);

    try {
      const jsonData = await parseFile(file);
      const errors = activeTab === "leads" 
        ? validateLeadData(jsonData)
        : validateCustomerData(jsonData);

      if (errors.length > 0) {
        setValidationErrors(errors);
        setValidationSuccess(false);
        setUploadStatus("error");
      } else {
        setParsedData(jsonData);
        setValidationSuccess(true);
        setUploadStatus("idle");
      }
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : "An unexpected error occurred"]);
      setUploadStatus("error");
    }
  };

  const handleImport = async () => {
    if (!validationSuccess || parsedData.length === 0) {
      toast({
        title: "Validation required",
        description: "Please validate the file first.",
        variant: "destructive",
      });
      return;
    }

    setUploadStatus("uploading");

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      if (activeTab === "leads") {
        for (const row of parsedData) {
          try {
            const leadData = prepareLeadData(row);
            if (currentUser && currentUser.role === 'executive') {
              leadData.assignedTo = currentUser.id;
            }
            addLead(leadData);
            successCount++;
          } catch (error) {
            console.error("Error adding lead:", error);
            errorCount++;
            errors.push(`Failed to import lead: ${row.name || 'Unknown'}`);
          }
        }
      } else {
        for (const row of parsedData) {
          try {
            const customerData = prepareCustomerData(row);
            if (currentUser && currentUser.role === 'executive') {
              customerData.assignedTo = currentUser.id;
            }
            addCustomer(customerData);
            successCount++;
          } catch (error) {
            console.error("Error adding customer:", error);
            errorCount++;
            errors.push(`Failed to import customer: ${row.name || 'Unknown'}`);
          }
        }
      }

      if (errorCount > 0) {
        setValidationErrors(errors);
        setUploadStatus("error");
        toast({
          title: "Import completed with errors",
          description: `Successfully imported ${successCount} ${activeTab}. ${errorCount} records failed.`,
          variant: "destructive",
        });
      } else {
        setUploadStatus("success");
        toast({
          title: "Import completed",
          description: `Successfully imported ${successCount} ${activeTab}.`,
        });
      }

      setTimeout(() => {
        onClose();
        // Reset state
        setFile(null);
        setParsedData([]);
        setValidationErrors([]);
        setValidationSuccess(false);
        setUploadStatus("idle");
      }, 1500);
    } catch (error) {
      setUploadStatus("error");
      toast({
        title: "Import failed",
        description: "An error occurred during import. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import</DialogTitle>
          <DialogDescription>
            Import multiple {activeTab} at once from a spreadsheet or CSV file
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="leads" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="leads">Import Leads</TabsTrigger>
            <TabsTrigger value="customers">Import Customers</TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <ImportInstructions type="leads" />
          </TabsContent>

          <TabsContent value="customers">
            <ImportInstructions type="customers" />
          </TabsContent>

          <div className="mt-6 space-y-6">
            <FileUploadSection onFileChange={handleFileChange} />

            {file && (
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={validateAndParseFile}
                  disabled={uploadStatus === "validating" || uploadStatus === "uploading"}
                >
                  {uploadStatus === "validating" ? "Validating..." : "Validate File"}
                </Button>

                <Button
                  onClick={handleImport}
                  disabled={!validationSuccess || uploadStatus === "uploading" || uploadStatus === "validating"}
                >
                  {uploadStatus === "uploading" ? "Importing..." : "Import Data"}
                </Button>
              </div>
            )}

            {(uploadStatus === "error" || validationErrors.length > 0) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation errors</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {uploadStatus === "success" && (
              <Alert variant="default" className="bg-success-light text-success-dark border-success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  Successfully imported {parsedData.length} {activeTab}.
                </AlertDescription>
              </Alert>
            )}

            {validationSuccess && parsedData.length > 0 && (
              <div className="space-y-4">
                <Alert variant="default">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validation successful</AlertTitle>
                  <AlertDescription>
                    Found {parsedData.length} valid records. Click "Import Data" to proceed.
                  </AlertDescription>
                </Alert>
                <ValidationTable data={parsedData} />
              </div>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
