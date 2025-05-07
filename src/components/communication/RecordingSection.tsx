
interface RecordingSectionProps {
  recordingUrl: string | null;
}

export function RecordingSection({ recordingUrl }: RecordingSectionProps) {
  if (!recordingUrl) return null;
  return (
    <div className="mt-4">
      <p className="text-sm font-medium mb-2">Call Recording:</p>
      <audio controls src={recordingUrl} className="w-full" />
    </div>
  );
}
