import { RemarksList } from "@/components/remarks/RemarksList";
import { Layout } from "@/components/layout/Layout";

export default function RemarksPage() {
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Remarks</h1>
            <p className="text-muted-foreground">
              View and manage all remarks across leads and customers
            </p>
          </div>
        </div>
        <RemarksList />
      </div>
    </Layout>
  );
} 