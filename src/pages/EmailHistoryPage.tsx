import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail } from 'lucide-react';

export default function EmailHistoryPage() {
  return (
    <Layout>
      <Tabs defaultValue="sent" className="flex flex-col h-[calc(100vh-var(--header-height))]">
        <div className="p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold mb-2">Email</h1>
            <TabsList>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="inbox">Inbox</TabsTrigger>
            </TabsList>
          </div>
        </div>
        
        <TabsContent value="sent" className="flex-grow flex items-center justify-center">
          <Card className="w-[600px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Integration Coming Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We're working on bringing you a powerful email integration feature. 
                This will allow you to send and receive emails directly from the CRM, 
                track email conversations, and manage your communications more effectively.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="inbox" className="flex-grow flex items-center justify-center">
          <Card className="w-[600px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Integration Coming Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We're working on bringing you a powerful email integration feature. 
                This will allow you to send and receive emails directly from the CRM, 
                track email conversations, and manage your communications more effectively.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
} 