import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCRM } from "@/context/hooks";
import { CallStatus } from "@/types/communication";
import { Phone, Mic, Square, PhoneOff, MicOff, CircleDot } from "lucide-react";
import { CallControls } from "./CallControls";
import { RecordingSection } from "./RecordingSection";
import { NotesTextarea } from "./NotesTextarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string | number;
  entityType: 'lead' | 'customer';
  phoneNumber: string;
  name: string;
}

export function CallDialog({ isOpen, onClose, entityId, entityType, phoneNumber, name }: CallDialogProps) {
  const { toast } = useToast();
  const { currentUser, addCommunication } = useCRM();
  
  // --- State Declarations ---
  const [phoneNumberState, setPhoneNumberState] = useState(phoneNumber);
  const [localName, setLocalName] = useState(name);
  const [notes, setNotes] = useState("");
  const [callStatus, setCallStatus] = useState<CallStatus>("completed");
  const [callInProgress, setCallInProgress] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDataBase64, setRecordingDataBase64] = useState<string | undefined>(undefined);
  const [finalCallDuration, setFinalCallDuration] = useState(0);
  
  // --- Refs ---
  const timerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // --- Callback Definitions ---
  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);
  
  const saveCommunicationRecord = useCallback(async (durationToSave: number, base64Data: string | undefined) => {
    const leadId = entityType === 'lead' ? entityId : undefined;
    const customerId = entityType === 'customer' ? entityId : undefined;
    
    try {
      const creatorId = currentUser?.id;
      if (!creatorId) {
        toast({ title: "Error", description: "User not logged in", variant: "destructive" });
        return;
      }

      console.log(`Saving communication with Duration: ${durationToSave}, Notes: ${notes.substring(0,20)}..., Base64 present: ${!!base64Data}`);
      await addCommunication({
        type: 'call',
        leadId: leadId?.toString(),
        customerId: customerId?.toString(),
        notes: notes,
        duration: durationToSave,
        recordingData: base64Data,
      });
      
      toast({ title: "Call Ended & Saved", description: `Duration: ${formatDuration(durationToSave)}` });
      onClose();

    } catch (error) {
      console.error("Error adding communication record:", error);
      toast({ title: "Error Saving Call", variant: "destructive" });
    }
  }, [entityType, entityId, currentUser, addCommunication, notes, toast, onClose, formatDuration]);

  const stopRecording = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => { // Simplified error handling for now
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          blobToBase64(audioBlob)
            .then(base64String => {
              setRecordingDataBase64(base64String); // Set state for potential display
              console.log("stopRecording: onstop finished, Base64 captured.");
              resolve(base64String);
            })
            .catch(error => {
              console.error("stopRecording: Error converting blob to Base64 on stop:", error);
              toast({ title: "Error processing recording", variant: "destructive" });
              resolve(null);
            });

          // Ensure tracks are stopped only once
          const stream = mediaRecorderRef.current?.stream;
          stream?.getTracks().forEach(track => track.stop());
        };
        
        // Simplified error handling
        mediaRecorderRef.current.onerror = (event) => {
           console.error("MediaRecorder error:", event);
           resolve(null);
        };

        mediaRecorderRef.current.stop();
        setIsRecording(false);
        console.log("stopRecording: mediaRecorder.stop() called.");

      } else {
        console.log("stopRecording: No active recording to stop.");
        resolve(null);
      }
    });
  }, [toast]); // Dependency: toast

  const startRecording = useCallback(async () => {
    if (isRecording || mediaRecorderRef.current?.state === 'recording') {
      console.warn("Recording is already in progress.");
      return;
    }
    setRecordingDataBase64(undefined);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        blobToBase64(audioBlob)
          .then(base64String => {
            setRecordingDataBase64(base64String); // Capture Base64 data
            console.log("Recording stopped, Base64 data captured.");
          })
          .catch(error => {
            console.error("Error converting blob to Base64 on stop:", error);
            toast({ title: "Error processing recording", variant: "destructive" });
          });
          
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Error",
        description: "Could not start recording. Check mic permissions.",
        variant: "destructive",
      });
      setIsRecording(false);
    }
  }, [isRecording, toast]);

  const startCall = useCallback(async () => {
    if (!currentUser) {
      toast({ title: "Error", description: "Login required", variant: "destructive" });
      return;
    }
    
    setCallInProgress(true);
    setNotes("");
    setCallStatus("completed");
    const startTime = new Date();
    setCallStartTime(startTime);
    setCallDuration(0);
    setFinalCallDuration(0);
    setRecordingDataBase64(undefined);
    
    // Restore timer start
    timerRef.current = window.setInterval(() => {
      setCallDuration(prevDuration => {
        const now = new Date();
        return startTime ? Math.floor((now.getTime() - startTime.getTime()) / 1000) : 0;
      });
    }, 1000);
    
    // Restore start recording and toast
    await startRecording();
    toast({ title: "Call Started", description: `Calling ${localName}...` });

  }, [currentUser, toast, localName, startRecording]);

  const endCall = useCallback(async () => {
    const currentDuration = callDuration;
    setFinalCallDuration(currentDuration);

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallInProgress(false);
    
    let finalBase64Data: string | null = null;
    if (isRecording && mediaRecorderRef.current) {
        console.log("endCall: Awaiting stopRecording...");
        finalBase64Data = await stopRecording();
        console.log(`endCall: stopRecording finished. Base64 received=${!!finalBase64Data}`);
    } else {
       console.log("endCall: No recording was active.");
       if (isRecording) setIsRecording(false);
    }

    // Now save directly, using the awaited data
    console.log(`endCall: Proceeding to save record. Duration=${currentDuration}, Status=${callStatus}`);
    await saveCommunicationRecord(currentDuration, finalBase64Data ?? undefined);

  }, [
    callDuration, isRecording, stopRecording, saveCommunicationRecord, callStatus
  ]);

  // --- Effects ---
  useEffect(() => {
    if (isOpen) {
      setPhoneNumberState(phoneNumber);
      setLocalName(name);
      setNotes("");
      setCallStatus("completed");
      setCallInProgress(false);
      setCallDuration(0);
      setIsRecording(false);
      setRecordingDataBase64(undefined);
      setFinalCallDuration(0);
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    }
  }, [isOpen, phoneNumber, name]);
  
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
         mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
         mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // --- Render Logic ---
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Call Feature</DialogTitle>
          <DialogDescription>
            We are implementing this part Soon
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="text-center text-muted-foreground">
            The call feature is currently under development. Please check back later for updates.
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // Result includes the data URL prefix 'data:audio/wav;base64,', remove it
      const base64String = reader.result?.toString().split(',')[1];
      if (base64String) {
        resolve(base64String);
      } else {
        reject(new Error("Failed to convert blob to Base64: result is empty"));
      }
    };
    reader.onerror = (error) => {
      reject(new Error(`FileReader error: ${error}`));
    };
    reader.readAsDataURL(blob);
  });
};