"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { twilioService, type CallDetails } from "@/lib/services/twilio-service";

export function CallHistory() {
  const [calls, setCalls] = useState<CallDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallDetails | null>(null);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        setLoading(true);
        const recentCalls = await twilioService.getRecentCalls(20);
        setCalls(recentCalls);
      } catch (error) {
        console.error("Error fetching call history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, []);

  const getCallIcon = (call: CallDetails) => {
    if (call.direction === "inbound") {
      return <PhoneIncoming className="h-4 w-4 text-blue-500" />;
    } else {
      return <PhoneOutgoing className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Completed
          </Badge>
        );
      case "in-progress":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            In Progress
          </Badge>
        );
      case "busy":
      case "no-answer":
      case "failed":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            {status === "busy"
              ? "Busy"
              : status === "no-answer"
                ? "No Answer"
                : "Failed"}
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleViewDetails = async (callSid: string) => {
    try {
      const callDetails = await twilioService.getCallDetails(callSid);
      setSelectedCall(callDetails);
    } catch (error) {
      console.error("Error fetching call details:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center space-x-4 p-3 rounded-md border"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-8">
        <Phone className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No call history available</p>
      </div>
    );
  }

  if (selectedCall) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedCall(null)}
          className="mb-2"
        >
          ← Back to History
        </Button>

        <div className="space-y-4 p-4 rounded-md border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {selectedCall.direction === "inbound"
                ? "Incoming Call"
                : "Outgoing Call"}
            </h3>
            {getStatusBadge(selectedCall.status)}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">From:</span>
            </div>
            <div>{selectedCall.from}</div>

            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">To:</span>
            </div>
            <div>{selectedCall.to}</div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Date:</span>
            </div>
            <div>{formatDate(selectedCall.startTime)}</div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Duration:</span>
            </div>
            <div>{formatDuration(selectedCall.duration)}</div>
          </div>

          {selectedCall.transcriptionText && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Transcription</h4>
              <div className="p-3 bg-muted rounded-md text-sm">
                {selectedCall.transcriptionText}
              </div>
            </div>
          )}

          {selectedCall.sentimentScore !== undefined && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Sentiment Analysis</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      selectedCall.sentimentScore > 0.5
                        ? "bg-green-500"
                        : selectedCall.sentimentScore > 0
                          ? "bg-blue-500"
                          : "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.abs(selectedCall.sentimentScore) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {selectedCall.sentimentScore > 0.5
                    ? "Positive"
                    : selectedCall.sentimentScore > 0
                      ? "Neutral"
                      : "Negative"}
                </span>
              </div>
            </div>
          )}

          {selectedCall.recordingUrl && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Recording</h4>
              <audio controls className="w-full">
                <source src={selectedCall.recordingUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {calls.map((call) => (
        <div
          key={call.sid}
          className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 cursor-pointer"
          onClick={() => handleViewDetails(call.sid)}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              {getCallIcon(call)}
            </div>
            <div>
              <p className="font-medium">
                {call.direction === "inbound" ? call.from : call.to}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatDate(call.startTime)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge(call.status)}
            {call.duration > 0 && (
              <span className="text-xs text-muted-foreground">
                {formatDuration(call.duration)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
