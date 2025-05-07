import { Button } from "@/components/ui/button";
import { Mic, Square, PhoneOff } from "lucide-react";

interface CallControlsProps {
  callInProgress: boolean;
  isRecording: boolean;
  onStopRecording: () => void;
  onEndCall: () => void;
}

export function CallControls({
  callInProgress,
  isRecording,
  onStopRecording,
  onEndCall,
}: CallControlsProps) {
  if (!callInProgress) return null;
  return (
    <div className="flex justify-center items-center space-x-4">
      {isRecording && (
        <Button
          variant="outline"
          onClick={onStopRecording}
          size="icon"
          className="h-12 w-12 rounded-full bg-destructive text-destructive-foreground"
        >
          <Square className="h-6 w-6" />
        </Button>
      )}

      <Button
        variant="destructive"
        onClick={onEndCall}
        size="icon"
        className="h-16 w-16 rounded-full"
      >
        <PhoneOff className="h-8 w-8" />
      </Button>
    </div>
  );
}
