
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Mail, Send } from 'lucide-react';

const apiKeySchema = z.object({
  sendgridApiKey: z.string().min(1, "SendGrid API key is required"),
  fromEmail: z.string().email("Please enter a valid email"),
  fromName: z.string().min(1, "From name is required"),
});

const testEmailSchema = z.object({
  to: z.string().email("Please enter a valid email"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

type ApiKeyFormValues = z.infer<typeof apiKeySchema>;
type TestEmailFormValues = z.infer<typeof testEmailSchema>;

export function EmailSettings() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const apiKeyForm = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      sendgridApiKey: "",
      fromEmail: "",
      fromName: "",
    },
  });

  const testEmailForm = useForm<TestEmailFormValues>({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      to: "",
      subject: "Test Email from CRM",
      message: "This is a test email sent from the CRM system.",
    },
  });

  const handleApiKeySave = (data: ApiKeyFormValues) => {
    // Save API keys to localStorage
    localStorage.setItem('sendgridApiKey', data.sendgridApiKey);
    localStorage.setItem('fromEmail', data.fromEmail);
    localStorage.setItem('fromName', data.fromName);
    
    setIsConfigured(true);
    
    toast({
      title: "Settings saved",
      description: "Your SendGrid API settings have been saved.",
    });
  };

  const handleSendTestEmail = async (data: TestEmailFormValues) => {
    setIsSending(true);
    
    // Get API keys from localStorage
    const apiKey = localStorage.getItem('sendgridApiKey');
    const fromEmail = localStorage.getItem('fromEmail');
    const fromName = localStorage.getItem('fromName');
    
    if (!apiKey || !fromEmail || !fromName) {
      toast({
        title: "Missing configuration",
        description: "Please configure your SendGrid API settings first.",
        variant: "destructive",
      });
      setIsSending(false);
      return;
    }
    
    try {
      // In a real app, this would call your backend API
      // Here we're simulating a successful API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Test email sent",
        description: `Email sent to ${data.to} successfully.`,
      });
    } catch (error) {
      toast({
        title: "Failed to send email",
        description: "There was an error sending the test email.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Tabs defaultValue="settings">
      <TabsList>
        <TabsTrigger value="settings">API Settings</TabsTrigger>
        <TabsTrigger value="test" disabled={!isConfigured}>Test Email</TabsTrigger>
      </TabsList>
      
      <TabsContent value="settings" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              SendGrid Integration
              {isConfigured && <Badge className="ml-2">Configured</Badge>}
            </CardTitle>
            <CardDescription>
              Configure your SendGrid API settings to send emails from the CRM.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...apiKeyForm}>
              <form onSubmit={apiKeyForm.handleSubmit(handleApiKeySave)} className="space-y-4">
                <FormField
                  control={apiKeyForm.control}
                  name="sendgridApiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SendGrid API Key</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="SG.XXXXXXX" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Your SendGrid API key to authenticate email sending requests.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={apiKeyForm.control}
                    name="fromEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="noreply@example.com" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={apiKeyForm.control}
                    name="fromName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Your Company Name" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <CardFooter className="px-0 pt-5">
                  <Button type="submit">Save Settings</Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="test" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Send className="mr-2 h-5 w-5" />
              Send Test Email
            </CardTitle>
            <CardDescription>
              Send a test email to verify your SendGrid integration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...testEmailForm}>
              <form onSubmit={testEmailForm.handleSubmit(handleSendTestEmail)} className="space-y-4">
                <FormField
                  control={testEmailForm.control}
                  name="to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="recipient@example.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={testEmailForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Email subject" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={testEmailForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Your email message"
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <CardFooter className="px-0 pt-5">
                  <Button type="submit" disabled={isSending}>
                    {isSending ? "Sending..." : "Send Test Email"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
