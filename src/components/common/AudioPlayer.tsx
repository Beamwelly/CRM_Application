import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Play, Pause, Download } from "lucide-react";

interface AudioPlayerProps {
  src?: string | null;
}

export function AudioPlayer({ src }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Construct the full audio URL
  const apiUrl = import.meta.env.VITE_API_URL || ''; // e.g., http://localhost:3001/api
  let baseUrl = '';
  try {
    // Extract the base part (scheme + host + port) from the API URL
    const urlObject = new URL(apiUrl);
    baseUrl = urlObject.origin; // e.g., http://localhost:3001
  } catch (e) {
    console.error("Invalid VITE_API_URL format:", apiUrl);
    // Fallback or handle error appropriately
  }
  
  // Prepend the derived base URL only if src is relative (starts with /)
  const fullAudioUrl = src && src.startsWith('/') && baseUrl
      ? `${baseUrl}${src}` // e.g., http://localhost:3001/uploads/recording.wav
      : src; // Use src as is if it's already a full URL or relative path couldn't be handled

  // Cleanup audio element on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const handlePlayPause = () => {
    setError(null);
    if (!fullAudioUrl) {
        setError('No audio source provided.');
        return;
    }

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      // audioRef.current.currentTime = 0; // Optionally reset time on pause
      setIsPlaying(false);
    } else {
      // Use existing audioRef if URL hasn't changed, otherwise create new
      if (!audioRef.current || audioRef.current.src !== fullAudioUrl) {
        // Log the URL being used
        console.log('[AudioPlayer] Attempting to load audio from:', fullAudioUrl);
        audioRef.current = new Audio(fullAudioUrl);

        audioRef.current.onended = () => {
          setIsPlaying(false);
          // if (audioRef.current) audioRef.current.currentTime = 0; // Optionally reset time on end
        };

        audioRef.current.onerror = (e) => {
          console.error("Error playing audio:", e);
          setError("Could not load or play audio.");
          setIsPlaying(false);
        };
      }

      audioRef.current.play().catch(err => {
        console.error("Error attempting to play audio:", err);
        setError(`Playback failed: ${err.message}`);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!fullAudioUrl) return;

    const link = document.createElement('a');
    link.href = fullAudioUrl;
    const filename = `recording-${new Date().toISOString()}.wav`; // Simple filename
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center gap-2 mt-1">
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePlayPause}
            className="flex items-center"
            disabled={!fullAudioUrl}
            title={isPlaying ? "Pause Recording" : "Play Recording"}
        >
            {isPlaying ? (
                <Pause className="h-4 w-4" />
            ) : (
                <Play className="h-4 w-4" /> 
            )}
            <span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>
        </Button>
        <Button 
            variant="outline"
            size="icon" 
            onClick={handleDownload}
            disabled={!fullAudioUrl}
            title="Download Recording" 
        >
            <Download className="h-4 w-4" />
            <span className="sr-only">Download</span>
        </Button>
        {error && <p className="text-xs text-destructive ml-2">{error}</p>}
    </div>
  );
} 