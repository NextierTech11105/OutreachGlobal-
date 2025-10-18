"use client";

import { useState, useRef } from "react";
import { useCallState } from "@/lib/providers/call-state-provider";
import { PowerDialer } from "@/components/power-dialer";
import { AiAssistant } from "@/components/ai-assistant";
import { CallTimer } from "@/components/call-timer";
import {
  X,
  Minimize,
  Maximize,
  PhoneOff,
  Mic,
  MicOff,
  RepeatIcon as Record,
  StopCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallTranscription } from "@/components/call-transcription";
import { formatPhoneNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function CallModal() {
  const {
    isCallActive,
    isCallMinimized,
    phoneNumber,
    contactName,
    contactInfo,
    startTime,
    isMuted,
    minimizeCall,
    maximizeCall,
    endCall,
    toggleMute,
  } = useCallState();
  const [isMaximized, setIsMaximized] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("dialer");
  const { toast } = useToast();

  // Mock audio stream for recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  if (!isCallActive) {
    return null;
  }

  const startRecording = async () => {
    try {
      // In a real implementation, this would use the WebRTC API to record the call
      // For demo purposes, we'll simulate recording

      // Request microphone access (this would be part of the actual implementation)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        // Create MediaRecorder instance
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        // Set up event handlers
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        // Start recording
        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(new Date());

        toast({
          title: "Recording Started",
          description: "Call recording has been started",
        });
      } else {
        // Fallback for demo mode
        setIsRecording(true);
        setRecordingTime(new Date());

        toast({
          title: "Recording Started (Demo)",
          description: "Call recording has been simulated",
        });
      }
    } catch (error) {
      console.error("Error starting recording:", error);

      // Fallback for demo mode
      setIsRecording(true);
      setRecordingTime(new Date());

      toast({
        title: "Recording Started (Demo)",
        description: "Call recording has been simulated",
      });
    }
  };

  const stopRecording = () => {
    try {
      // Stop the MediaRecorder if it exists
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();

        // In a real implementation, we would save the recording
        // For demo purposes, we'll just log it
        console.log("Recording stopped, chunks:", audioChunksRef.current);

        // Create a blob from the chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioUrl = URL.createObjectURL(audioBlob);

        // In a real app, you would save this to a server
        console.log("Recording URL:", audioUrl);

        // Reset recording state
        setIsRecording(false);
        setRecordingTime(null);

        toast({
          title: "Recording Saved",
          description: "Call recording has been saved",
        });
      } else {
        // Fallback for demo mode
        setIsRecording(false);
        setRecordingTime(null);

        toast({
          title: "Recording Saved (Demo)",
          description: "Call recording has been simulated",
        });
      }
    } catch (error) {
      console.error("Error stopping recording:", error);

      // Fallback for demo mode
      setIsRecording(false);
      setRecordingTime(null);

      toast({
        title: "Recording Saved (Demo)",
        description: "Call recording has been simulated",
      });
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Format the lead info for the AI Assistant
  const leadInfo = {
    name: contactName || "Unknown",
    phone: phoneNumber,
    company: contactInfo?.company || "Unknown",
    position: contactInfo?.position || "Unknown",
    location: contactInfo?.location || "Unknown",
    source: contactInfo?.source || "Unknown",
    status: contactInfo?.status || "New",
    campaignId: contactInfo?.campaignId || "Unknown",
  };

  if (isCallMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-64 shadow-lg border-2 border-primary/20 animate-in slide-in-from-bottom-5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm truncate">
                    {contactName || formatPhoneNumber(phoneNumber) || "Unknown"}
                  </span>
                  {startTime && (
                    <CallTimer
                      startTime={startTime}
                      className="text-xs text-muted-foreground"
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {isRecording && (
                  <div className="flex items-center mr-1">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-1"></div>
                    <span className="text-xs text-red-500">REC</span>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <MicOff className="h-4 w-4 text-destructive" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={maximizeCall}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={endCall}
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center">
      <Card
        className={`${isMaximized ? "w-[90vw] h-[90vh]" : "w-[500px]"} shadow-lg border-2 border-primary/20 flex flex-col`}
      >
        <CardHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
            <CardTitle className="text-lg">
              {contactName || formatPhoneNumber(phoneNumber) || "New Call"}
            </CardTitle>
            {startTime && (
              <CallTimer
                startTime={startTime}
                className="text-sm text-muted-foreground ml-2"
              />
            )}

            {isRecording && recordingTime && (
              <div className="flex items-center space-x-1 ml-2">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-xs text-red-500">REC</span>
                <CallTimer
                  startTime={recordingTime}
                  className="text-xs text-red-500"
                />
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant={isRecording ? "destructive" : "outline-solid"}
              size="sm"
              onClick={toggleRecording}
              className="h-8"
            >
              {isRecording ? (
                <>
                  <StopCircle className="h-3.5 w-3.5 mr-1.5" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Record className="h-3.5 w-3.5 mr-1.5" />
                  Record
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMaximized(!isMaximized)}
            >
              {isMaximized ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={minimizeCall}>
              <Minimize className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={endCall}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <div className="flex-1 overflow-hidden">
          <Tabs
            defaultValue="dialer"
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            <TabsList className="mx-4 mt-2 justify-start">
              <TabsTrigger value="dialer">Dialer</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="transcription">Transcription</TabsTrigger>
            </TabsList>
            <div className="flex-1 overflow-auto">
              <TabsContent value="dialer" className="h-full p-4">
                <div className="flex flex-col lg:flex-row gap-4 h-full">
                  {/* Power Dialer - Pass inModal=true and hideTabsNav=true to prevent duplicate tabs */}
                  <div className="flex-1 min-w-0">
                    <PowerDialer
                      inModal={true}
                      hideTabsNav={true}
                      leadName={contactName}
                      leadPhone={phoneNumber}
                      leadCompany={contactInfo?.company}
                      leadPosition={contactInfo?.position}
                      leadLocation={contactInfo?.location}
                      leadSource={contactInfo?.source}
                      leadStatus={contactInfo?.status}
                      campaignId={contactInfo?.campaignId}
                    />
                  </div>

                  {/* AI Assistant */}
                  <div className="w-full lg:w-96">
                    <AiAssistant
                      leadInfo={leadInfo}
                      isCallActive={true}
                      callStatus="in-progress"
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="notes" className="h-full p-4">
                <div className="h-full flex flex-col">
                  <textarea
                    className="flex-1 p-3 border rounded-md resize-none focus:outline-hidden focus:ring-2 focus:ring-primary"
                    placeholder="Add call notes here..."
                  />
                </div>
              </TabsContent>
              <TabsContent value="transcription" className="h-full p-4">
                <CallTranscription
                  isTranscribing={true}
                  callStatus="in-progress"
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}
