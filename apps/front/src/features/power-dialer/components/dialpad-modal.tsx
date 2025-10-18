"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PhoneOff,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  X,
  Circle,
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface DialpadModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  contactPhone: string;
  callDuration: number;
  callSid: string | null;
  onHangup: () => void;
  onSendDTMF?: (digit: string) => void;
}

interface SentimentData {
  overallSentiment: "positive" | "negative" | "neutral" | "analyzing";
  sentimentScore: number;
  emotions: string[];
  keyPhrases: string[];
  callQuality: any;
  timestamp: string;
}

interface Recording {
  sid: string;
  status: string;
  duration: string;
  playbackUrl: string;
  startTime: string;
}

const dialpadButtons = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "*", letters: "" },
  { digit: "0", letters: "+" },
  { digit: "#", letters: "" },
];

export function DialpadModal({
  isOpen,
  onClose,
  contactName,
  contactPhone,
  callDuration,
  callSid,
  onHangup,
  onSendDTMF,
}: DialpadModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [dtmfInput, setDtmfInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [activeTab, setActiveTab] = useState("dialpad");

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDigitPress = (digit: string) => {
    setDtmfInput((prev) => prev + digit);
    onSendDTMF?.(digit);

    // Visual feedback
    console.log(`📞 DTMF tone sent: ${digit}`);

    // Auto-clear DTMF input after 3 seconds
    setTimeout(() => {
      setDtmfInput((prev) => prev.replace(digit, ""));
    }, 3000);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    console.log(`🎤 Microphone ${!isMuted ? "muted" : "unmuted"}`);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    console.log(`🔊 Speaker ${!isSpeakerOn ? "on" : "off"}`);
  };

  const handleRecordingControl = async (
    action: "start" | "stop" | "pause" | "resume",
  ) => {
    if (!callSid) return;

    try {
      const response = await fetch("/api/twilio/recording-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callSid, action }),
      });

      if (!response.ok) {
        console.error(
          "Recording control API error:",
          response.status,
          response.statusText,
        );
        return;
      }

      const data = await response.json();
      if (data.success) {
        switch (action) {
          case "start":
            setIsRecording(true);
            setRecordingPaused(false);
            console.log("📹 Recording started");
            break;
          case "stop":
            setIsRecording(false);
            setRecordingPaused(false);
            console.log("📹 Recording stopped");
            break;
          case "pause":
            setRecordingPaused(true);
            console.log("📹 Recording paused");
            break;
          case "resume":
            setRecordingPaused(false);
            console.log("📹 Recording resumed");
            break;
        }
      } else {
        console.error("Recording control failed:", data.error);
      }
    } catch (error) {
      console.error("Recording control failed:", error);
    }
  };

  const handleHangup = () => {
    onHangup();
    onClose();
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      case "neutral":
        return "text-gray-600";
      default:
        return "text-blue-600";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="w-4 h-4" />;
      case "negative":
        return <TrendingDown className="w-4 h-4" />;
      case "neutral":
        return <Minus className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-lg">
        <Card className="shadow-2xl max-h-[90vh] overflow-hidden">
          <CardHeader className="text-center space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 border-green-200"
                >
                  Call in Progress
                </Badge>
                {isRecording && (
                  <Badge variant="destructive" className="gap-1 animate-pulse">
                    <Circle className="w-2 h-2 fill-current" />
                    {recordingPaused ? "Paused" : "Recording"}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-1">
              <CardTitle className="text-xl">{contactName}</CardTitle>
              <p className="text-sm text-muted-foreground font-mono">
                {contactPhone}
              </p>
              <div className="flex items-center justify-center gap-2 text-lg font-mono text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {formatTime(callDuration)}
              </div>
            </div>

            {/* DTMF Display */}
            {dtmfInput && (
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-sm text-muted-foreground">DTMF Tones:</p>
                <p className="font-mono text-lg">{dtmfInput}</p>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Call Controls */}
            <div className="flex justify-center gap-4">
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="lg"
                onClick={toggleMute}
                className="h-12 w-12 rounded-full p-0"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>

              <Button
                variant={isSpeakerOn ? "default" : "outline"}
                size="lg"
                onClick={toggleSpeaker}
                className="h-12 w-12 rounded-full p-0"
                title={isSpeakerOn ? "Speaker Off" : "Speaker On"}
              >
                {isSpeakerOn ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </Button>
            </div>

            {/* Dialpad */}
            <div className="space-y-4">
              <h3 className="text-center text-sm font-medium text-muted-foreground">
                Tap to send DTMF tones
              </h3>

              <div className="grid grid-cols-3 gap-3">
                {dialpadButtons.map((button) => (
                  <Button
                    key={button.digit}
                    variant="outline"
                    size="lg"
                    onClick={() => handleDigitPress(button.digit)}
                    className="h-16 flex flex-col items-center justify-center hover:bg-primary/10 active:bg-primary/20 transition-colors"
                  >
                    <span className="text-2xl font-bold">{button.digit}</span>
                    {button.letters && (
                      <span className="text-xs text-muted-foreground mt-1">
                        {button.letters}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Hang Up Button */}
            <div className="flex justify-center pt-4 border-t">
              <Button
                variant="destructive"
                size="lg"
                onClick={handleHangup}
                className="h-14 w-14 rounded-full p-0 bg-red-500 hover:bg-red-600"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>

            {/* Call Info */}
            <div className="text-center space-y-2 pt-2">
              <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                <span className={isMuted ? "text-red-500" : "text-green-500"}>
                  {isMuted ? "Muted" : "Unmuted"}
                </span>
                <span
                  className={
                    isSpeakerOn ? "text-blue-500" : "text-muted-foreground"
                  }
                >
                  {isSpeakerOn ? "Speaker On" : "Speaker Off"}
                </span>
                {isRecording && (
                  <span className="text-red-500">
                    {recordingPaused ? "Rec Paused" : "Recording"}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
