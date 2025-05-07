
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
import { useToast } from '@/hooks/use-toast';
import { Phone, PhoneCall } from 'lucide-react';

const apiKeySchema = z.object({
  twilioAccountSid: z.string().min(1, "Twilio Account SID is required"),
  twilioAuthToken: z.string().min(1, "Twilio Auth Token is required"),
  twilioPhoneNumber: z.string().min(1, "Twilio Phone Number is required"),
});

const testCallSchema = z.object({
  to: z.string().min(10, "Please enter a valid phone number"),
});

type ApiKeyFormValues = z.infer<typeof apiKeySchema>;
type TestCallFormValues = z.infer<typeof testCallSchema>;

export function CallSettings() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const { toast } = useToast();

  const apiKeyForm = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      twilioAccountSid: "",
      twilioAuthToken: "",
      twilioPhoneNumber: "",
    },
  });

  const testCallForm = useForm<TestCallFormValues>({
    resolver: zodResolver(testCallSchema),
    defaultValues: {
      to: "",
    },
  });

  const handleApiKeySave = (data: ApiKeyFormValues) => {
    // Save API keys to localStorage
    localStorage.setItem('twilioAccountSid', data.twilioAccountSid);
    localStorage.setItem('twilioAuthToken', data.twilioAuthToken);
    localStorage.setItem('twilioPhoneNumber', data.twilioPhoneNumber);
    
    setIsConfigured(true);
    
    toast({
      title: "Settings saved",
      description: "Your Twilio API settings have been saved.",
    });
  };

  const handleTestCall = async (data: TestCallFormValues) => {
    setIsCalling(true);
    
    // Get API keys from localStorage
    const accountSid = localStorage.getItem('twilioAccountSid');
    const authToken = localStorage.getItem('twilioAuthToken');
    const phoneNumber = localStorage.getItem('twilioPhoneNumber');
    
    if (!accountSid || !authToken || !phoneNumber) {
      toast({
        title: "Missing configuration",
        description: "Please configure your Twilio API settings first.",
        variant: "destructive",
      });
      setIsCalling(false);
      return;
    }
    
    try {
      // In a real app, this would call your backend API
      // Here we're simulating a successful API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Call initiated",
        description: `Calling ${data.to} successfully.`,
      });
    } catch (error) {
      toast({
        title: "Failed to initiate call",
        description: "There was an error initiating the call.",
        variant: "destructive",
      });
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <Tabs defaultValue="settings">
      <TabsList>
        <TabsTrigger value="settings">API Settings</TabsTrigger>
        <TabsTrigger value="test" disabled={!isConfigured}>Test Call</TabsTrigger>
      </TabsList>
      
      <TabsContent value="settings" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="mr-2 h-5 w-5" />
              Twilio Integration
              {isConfigured && <Badge className="ml-2">Configured</Badge>}
            </CardTitle>
            <CardDescription>
              Configure your Twilio API settings to make calls from the CRM.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...apiKeyForm}>
              <form onSubmit={apiKeyForm.handleSubmit(handleApiKeySave)} className="space-y-4">
                <FormField
                  control={apiKeyForm.control}
                  name="twilioAccountSid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twilio Account SID</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="AC1234567890abcdef" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Your Twilio Account SID to authenticate API requests.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={apiKeyForm.control}
                  name="twilioAuthToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twilio Auth Token</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="your-auth-token" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Your Twilio Auth Token to authenticate API requests.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={apiKeyForm.control}
                  name="twilioPhoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twilio Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+1234567890" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Your Twilio phone number to make calls from.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
              <PhoneCall className="mr-2 h-5 w-5" />
              Make Test Call
            </CardTitle>
            <CardDescription>
              Make a test call to verify your Twilio integration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...testCallForm}>
              <form onSubmit={testCallForm.handleSubmit(handleTestCall)} className="space-y-4">
                <FormField
                  control={testCallForm.control}
                  name="to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+1234567890" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        The phone number to call. Include country code.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <CardFooter className="px-0 pt-5">
                  <Button type="submit" disabled={isCalling}>
                    {isCalling ? "Calling..." : "Make Test Call"}
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
