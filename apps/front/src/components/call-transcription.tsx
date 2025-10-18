"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Copy, Download, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface CallTranscriptionProps {
  transcription: string;
  isTranscribing: boolean;
  callStatus: string;
}

export function CallTranscription({
  transcription,
  isTranscribing,
  callStatus,
}: CallTranscriptionProps) {
  const transcriptionRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to the bottom of the transcription
  useEffect(() => {
    if (transcriptionRef.current && isTranscribing) {
      transcriptionRef.current.scrollTop =
        transcriptionRef.current.scrollHeight;
    }
  }, [transcription, isTranscribing]);

  const handleCopyTranscription = () => {
    if (!transcription) return;

    navigator.clipboard.writeText(transcription);
    toast({
      title: "Copied",
      description: "Transcription copied to clipboard",
    });
  };

  const handleDownloadTranscription = () => {
    if (!transcription) return;

    const element = document.createElement("a");
    const file = new Blob([transcription], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `call-transcription-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!isTranscribing && !transcription) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <Mic className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Call Transcription</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Live transcription will appear here when a call is in progress.
        </p>
      </div>
    );
  }

  if (callStatus === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium mb-2">Transcription Error</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          There was an error with the transcription service. Please try again
          later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Live Transcription</h3>
        {isTranscribing && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-xs text-muted-foreground">Recording</span>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div
            ref={transcriptionRef}
            className="h-[300px] overflow-y-auto text-sm whitespace-pre-wrap"
          >
            {transcription ? (
              <div className="space-y-2">
                {transcription.split(/(?<=\. )/).map((sentence, index) => (
                  <p key={index}>{sentence}</p>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyTranscription}
          disabled={!transcription}
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadTranscription}
          disabled={!transcription}
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    </div>
  );
}
