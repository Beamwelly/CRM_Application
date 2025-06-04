import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCRM } from '@/context/hooks';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SettingsPage() {
  const { currentUser, refreshUser } = useCRM();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log('[Settings] Received message event:', event.data);
      if (event.data.type === 'GMAIL_CONNECTED') {
        console.log('[Settings] Gmail connected successfully');
        setIsConnecting(false);
        await refreshUser();
        toast({
          title: "Success",
          description: "Gmail account connected successfully",
        });
      } else if (event.data.type === 'GMAIL_CONNECTED_ERROR') {
        console.log('[Settings] Gmail connection failed');
        setIsConnecting(false);
        toast({
          title: "Error",
          description: "Failed to connect Gmail account",
          variant: "destructive",
        });
      }
    };

    console.log('[Settings] Adding message event listener');
    window.addEventListener('message', handleMessage);
    return () => {
      console.log('[Settings] Removing message event listener');
      window.removeEventListener('message', handleMessage);
    };
  }, [toast, refreshUser]);

  const handleConnectGmail = async () => {
    console.log('[Settings] Starting Gmail connection process');
    setIsConnecting(true);
    
    try {
      console.log('[Settings] Testing backend connection...');
      // Test backend connection
      const pingResponse = await fetch('/api/ping', {
        credentials: 'include'
      });
      console.log('[Settings] Ping response:', pingResponse.status);
      if (!pingResponse.ok) {
        throw new Error('Backend is not responding');
      }

      console.log('[Settings] Testing auth endpoint...');
      // Test auth endpoint
      const authResponse = await fetch('/auth/test', {
        credentials: 'include'
      });
      console.log('[Settings] Auth response:', authResponse.status);
      if (!authResponse.ok) {
        throw new Error('Auth endpoint is not responding');
      }

      console.log('[Settings] Opening popup window...');
      // Open popup for Google authentication
      const popup = window.open(
        '/auth/google',
        'Google Auth',
        'width=600,height=600,left=' + (window.innerWidth - 600) / 2 + ',top=' + (window.innerHeight - 600) / 2
      );

      if (!popup) {
        console.error('[Settings] Popup window was blocked');
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      console.log('[Settings] Popup window opened successfully');

      // Listen for the message from the popup
      window.addEventListener('message', async (event) => {
        console.log('[Settings] Received message from popup:', event.data);
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          console.log('[Settings] Google auth successful');
          popup.close();
          setIsConnecting(false);
          await refreshUser();
          toast({
            title: "Success",
            description: "Gmail account connected successfully",
          });
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          console.error('[Settings] Google auth error:', event.data.error);
          popup.close();
          setIsConnecting(false);
          toast({
            title: "Error",
            description: event.data.error || "Failed to connect Gmail account",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error('[Settings] Error in handleConnectGmail:', error);
      setIsConnecting(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect Gmail",
        variant: "destructive",
      });
    }
  };

  const isGmailConnected = currentUser?.gmailConnected;

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gmail Integration
            </CardTitle>
            <CardDescription>
              Connect your Gmail account to enable email sending functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {isGmailConnected ? 'Gmail Connected' : 'Gmail Not Connected'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isGmailConnected 
                    ? 'You can now send emails through the system'
                    : 'Connect your Gmail account to send emails'}
                </p>
              </div>
              {isGmailConnected ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Connected</span>
                </div>
              ) : (
                <Button
                  onClick={handleConnectGmail}
                  disabled={isConnecting}
                >
                  {isConnecting ? 'Connecting...' : 'Connect Gmail'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
} 