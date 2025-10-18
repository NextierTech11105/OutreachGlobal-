"use client";

import { useState, useEffect, useRef } from "react";
import {
  Phone,
  Save,
  Copy,
  RefreshCw,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { twilioService } from "@/lib/services/twilio-service";
import { DialPad } from "./dial-pad";
import { CallTimer } from "./call-timer";
import { useToast } from "@/hooks/use-toast";
import { AiAssistant } from "./ai-assistant";
import { cn } from "@/lib/utils";
import { CallTransfer } from "./call-transfer";
import { CallControls } from "./call-controls";
import { CallTranscription } from "./call-transcription";
import { useCallState } from "@/lib/providers/call-state-provider";
import { Badge } from "@/components/ui/badge";

interface PowerDialerProps {
  leadName?: string;
  leadPhone?: string;
  leadPhoneLineType?: string;
  leadPhoneCarrier?: string;
  leadCompany?: string;
  leadPosition?: string;
  leadLocation?: string;
  leadSource?: string;
  leadStatus?: string;
  campaignId?: string;
  onCallComplete?: (duration: number, notes: string) => void;
  onClose?: () => void;
  inModal?: boolean;
  hideTabsNav?: boolean;
}

export function PowerDialer({
  leadName,
  leadPhone,
  leadPhoneLineType,
  leadPhoneCarrier,
  leadCompany,
  leadPosition,
  leadLocation,
  leadSource,
  leadStatus,
  campaignId,
  onCallComplete,
  onClose,
  inModal = false,
  hideTabsNav = false,
}: PowerDialerProps) {
  const [phoneNumber, setPhoneNumber] = useState(leadPhone || "");
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<string>("idle");
  const [error, setError] = useState<string | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [isDeviceReady, setIsDeviceReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [useMockCalls, setUseMockCalls] = useState(false);
  const [notes, setNotes] = useState("");
  const [callDisposition, setCallDisposition] = useState("");
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState("dialer");
  const [showTransferPanel, setShowTransferPanel] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);

  const deviceRef = useRef<any>(null);
  const connectionRef = useRef<any>(null);
  const { toast } = useToast();

  // Lead information for AI context
  const leadInfo = {
    name: leadName || "Unknown",
    phone: leadPhone || phoneNumber,
    phoneLineType: leadPhoneLineType || "unknown",
    phoneCarrier: leadPhoneCarrier,
    company: leadCompany || "Unknown",
    position: leadPosition || "Unknown",
    location: leadLocation || "Unknown",
    source: leadSource || "Unknown",
    status: leadStatus || "New",
    campaignId: campaignId || "Unknown",
  };

  // Conditionally initialize call state
  const callState = useCallState();

  // Initialize Twilio device
  useEffect(() => {
    let twilioScriptLoaded = false;
    let twilioDevice: any = null;
    let cleanup = false;

    const loadTwilioScript = () => {
      return new Promise<void>((resolve, reject) => {
        // Check if Twilio script is already loaded
        if (window.Twilio) {
          twilioScriptLoaded = true;
          resolve();
          return;
        }

        // Create script element
        const script = document.createElement("script");
        script.src =
          "https://sdk.twilio.com/js/client/releases/1.14.0/twilio.js";
        script.async = true;

        script.onload = () => {
          twilioScriptLoaded = true;
          resolve();
        };

        script.onerror = () => {
          reject(new Error("Failed to load Twilio script"));
        };

        document.body.appendChild(script);
      });
    };

    const initDevice = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        // First load the Twilio script
        await loadTwilioScript();

        if (cleanup) return;

        // Get token from server
        try {
          const tokenResponse = await twilioService.getToken(
            "user-" + Date.now(),
          );

          if (cleanup) return;

          // Check if we got a mock token (for development without Twilio credentials)
          if (tokenResponse.token === "mock-token-for-development-only") {
            console.log("Using mock calling mode");
            setUseMockCalls(true);
            setIsDeviceReady(true);
            setIsInitializing(false);
            return;
          }

          // Create device using the global Twilio object
          if (window.Twilio && window.Twilio.Device) {
            twilioDevice = window.Twilio.Device;

            // Initialize the device with the token
            twilioDevice.setup(tokenResponse.token, {
              debug: true,
            });

            // Set up event handlers
            twilioDevice.ready(() => {
              console.log("Twilio device is ready");
              if (!cleanup) {
                setIsDeviceReady(true);
                setIsInitializing(false);
              }
            });

            twilioDevice.error((error: any) => {
              console.error("Twilio device error:", error);
              if (!cleanup) {
                setError(`Call error: ${error.message}`);
                setIsCallActive(false);
                setCallStatus("error");
                toast({
                  title: "Call Error",
                  description: error.message,
                  variant: "destructive",
                });
              }
            });

            twilioDevice.connect((conn: any) => {
              connectionRef.current = conn;
              if (!cleanup) {
                setIsCallActive(true);
                setCallStatus("in-progress");
                setCallStartTime(new Date());
                // Start transcription
                startTranscription();
                // Switch to notes tab when call connects
                setActiveTab("notes");
              }
            });

            twilioDevice.disconnect(() => {
              connectionRef.current = null;
              if (!cleanup) {
                setIsCallActive(false);
                setCallStatus("completed");
                // Stop transcription
                stopTranscription();

                // Call the onCallComplete callback if provided
                if (onCallComplete && callStartTime) {
                  const duration = Math.floor(
                    (new Date().getTime() - callStartTime.getTime()) / 1000,
                  );
                  onCallComplete(duration, notes);
                }

                setCallStartTime(null);
              }
            });

            deviceRef.current = twilioDevice;
          } else {
            throw new Error("Twilio Client not available");
          }
        } catch (tokenError: any) {
          console.error("Token error:", tokenError);

          if (cleanup) return;

          // Fall back to mock mode for development
          console.log("Falling back to mock calling mode");
          setUseMockCalls(true);
          setIsDeviceReady(true);
          setIsInitializing(false);

          toast({
            title: "Using Demo Mode",
            description:
              "Twilio integration is not available. Using demo mode for calls.",
            variant: "default",
          });
        }
      } catch (error: any) {
        console.error("Error initializing Twilio device:", error);

        if (cleanup) return;

        setError("Phone system initialization failed. Using demo mode.");
        setUseMockCalls(true);
        setIsDeviceReady(true);
        setIsInitializing(false);

        toast({
          title: "Using Demo Mode",
          description:
            "Phone system could not be initialized. Using demo mode for calls.",
          variant: "default",
        });
      }
    };

    initDevice();

    // Cleanup
    return () => {
      cleanup = true;
      if (deviceRef.current && !useMockCalls) {
        try {
          deviceRef.current.destroy();
        } catch (e) {
          console.error("Error destroying Twilio device:", e);
        }
      }
    };
  }, [onCallComplete, toast]);

  // Start transcription
  const startTranscription = () => {
    if (useMockCalls) {
      // Simulate transcription for demo mode
      setIsTranscribing(true);
      const mockTranscriptionInterval = setInterval(() => {
        setTranscription((prev) => {
          const mockPhrases = [
            "Hello, this is a test transcription.",
            " I'm calling about your property.",
            " We have some interesting opportunities to discuss.",
            " Our data shows your property might be eligible for our program.",
            " Would you be interested in learning more about our services?",
            " Great, let me tell you about what we offer.",
            " We specialize in real estate data and analytics.",
            " Our platform can help you make better investment decisions.",
            " Based on our analysis, your property has significant potential.",
            " I'd be happy to schedule a follow-up meeting to discuss further.",
          ];

          if (prev.length > 500) {
            return prev + mockPhrases[Math.floor(Math.random() * 3) + 7];
          } else {
            return prev + mockPhrases[Math.floor(Math.random() * 7)];
          }
        });
      }, 5000);

      return () => clearInterval(mockTranscriptionInterval);
    } else {
      // In a real implementation, this would connect to a real-time transcription service
      setIsTranscribing(true);
      // Implementation would depend on the specific transcription service being used
    }
  };

  // Stop transcription
  const stopTranscription = () => {
    setIsTranscribing(false);
    // In a real implementation, this would disconnect from the transcription service
  };

  // Mock call functionality for development
  const handleMockCall = () => {
    setCallStatus("connecting");

    // Simulate connecting delay
    setTimeout(() => {
      setIsCallActive(true);
      setCallStatus("in-progress");
      setCallStartTime(new Date());
      setCallSid("mock-call-" + Date.now());
      // Start transcription
      startTranscription();
      // Switch to notes tab when call connects
      setActiveTab("notes");

      toast({
        title: "Demo Call Started",
        description: `Calling ${phoneNumber} (demo mode)`,
        variant: "default",
      });
    }, 1500);
  };

  const handleEndMockCall = () => {
    setIsCallActive(false);
    setCallStatus("completed");
    // Stop transcription
    stopTranscription();

    // Call the onCallComplete callback if provided
    if (onCallComplete && callStartTime) {
      const duration = Math.floor(
        (new Date().getTime() - callStartTime.getTime()) / 1000,
      );
      onCallComplete(duration, notes);
    }

    setCallStartTime(null);
    setCallSid(null);

    toast({
      title: "Demo Call Ended",
      description: "Call has ended (demo mode)",
      variant: "default",
    });
  };

  // Handle making a call
  const handleMakeCall = async () => {
    try {
      if (!phoneNumber) {
        setError("Please enter a phone number");
        return;
      }

      if (!isDeviceReady) {
        setError(
          "Phone system is not ready yet. Please wait a moment and try again.",
        );
        return;
      }

      setError(null);
      setCallStatus("connecting");

      // If in modal mode, update the call state
      if (inModal && callState) {
        callState.activateCall(phoneNumber, leadName, {
          company: leadCompany,
          position: leadPosition,
          location: leadLocation,
          source: leadSource,
          status: leadStatus,
          campaignId: campaignId,
        });
      }

      // If in mock mode, use mock call functionality
      if (useMockCalls) {
        handleMockCall();
        return;
      }

      // Format phone number
      const formattedNumber = phoneNumber.replace(/\D/g, "");

      if (deviceRef.current) {
        // Make the call
        deviceRef.current.connect({ phone: formattedNumber });
      } else {
        throw new Error("Phone system not initialized");
      }
    } catch (error: any) {
      console.error("Error making call:", error);
      setError("Failed to make call. Please try again.");
      setCallStatus("error");
      toast({
        title: "Call Failed",
        description: error.message || "Failed to make call",
        variant: "destructive",
      });
    }
  };

  // Handle ending a call
  const handleEndCall = () => {
    if (useMockCalls) {
      handleEndMockCall();
      return;
    }

    if (deviceRef.current) {
      deviceRef.current.disconnectAll();
      setCallSid(null);
    }

    // If in modal mode, update the call state
    if (inModal && callState) {
      callState.endCall();
    }
  };

  // Handle muting/unmuting
  const handleToggleMute = () => {
    if (useMockCalls) {
      setIsMuted(!isMuted);

      // If in modal mode, update the call state
      if (inModal && callState) {
        callState.toggleMute();
      }

      toast({
        title: isMuted ? "Unmuted" : "Muted",
        description: `Microphone ${isMuted ? "unmuted" : "muted"} (demo mode)`,
        variant: "default",
      });
      return;
    }

    if (connectionRef.current) {
      if (isMuted) {
        connectionRef.current.mute(false);
      } else {
        connectionRef.current.mute(true);
      }
      setIsMuted(!isMuted);

      // If in modal mode, update the call state
      if (inModal && callState) {
        callState.toggleMute();
      }
    }
  };

  // Handle dial pad input
  const handleDialPadInput = (digit: string) => {
    if (useMockCalls && isCallActive) {
      toast({
        title: "DTMF Tone",
        description: `Sent tone: ${digit} (demo mode)`,
        variant: "default",
      });
      return;
    }

    if (connectionRef.current && isCallActive) {
      // Send DTMF tone
      connectionRef.current.sendDigits(digit);
    } else {
      // Add to phone number
      setPhoneNumber((prev) => prev + digit);
    }
  };

  // Generate AI notes based on the call
  const generateAiNotes = async () => {
    setIsGeneratingNotes(true);

    try {
      // In a real implementation, this would call an API to generate notes based on the transcription
      // For demo purposes, we'll simulate a delay and return mock notes
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Use the transcription if available, otherwise generate generic notes
      const aiGeneratedNotes = transcription
        ? `Call Summary with ${leadName || "customer"} from ${leadCompany || "Unknown Company"}\n\n` +
          `Based on the transcription, here are the key points:\n` +
          `- Customer expressed interest in our real estate data services\n` +
          `- They're looking for property data in ${leadLocation || "their area"}\n` +
          `- Main concerns: data accuracy and integration\n` +
          `- Action items: Follow up on pricing, schedule demo\n\n` +
          `Sentiment: Positive`
        : `Call with ${leadName} from ${leadCompany || "Unknown Company"}\n\n` +
          `- Discussed their interest in our real estate data services\n` +
          `- They mentioned they're looking for property data in ${leadLocation || "their area"}\n` +
          `- Current pain points: data accuracy and integration with existing systems\n` +
          `- Follow up needed on pricing for enterprise tier\n` +
          `- Overall positive call, interested in scheduling a demo next week`;

      setNotes(aiGeneratedNotes);

      toast({
        title: "Notes Generated",
        description: "AI has generated call notes based on the conversation",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // Copy notes to clipboard
  const copyNotes = () => {
    navigator.clipboard.writeText(notes);
    toast({
      title: "Copied",
      description: "Notes copied to clipboard",
    });
  };

  // Handle call transfer
  const handleTransferCall = (agentId: string) => {
    setIsTransferring(true);

    // In a real implementation, this would call an API to transfer the call
    // For demo purposes, we'll simulate a delay and success
    setTimeout(() => {
      setIsTransferring(false);
      setShowTransferPanel(false);

      // End the call from this agent's perspective
      setIsCallActive(false);
      setCallStatus("transferred");

      if (callStartTime) {
        const duration = Math.floor(
          (new Date().getTime() - callStartTime.getTime()) / 1000,
        );
        if (onCallComplete) {
          onCallComplete(
            duration,
            notes + "\n\n[Call transferred to another agent]",
          );
        }
      }

      setCallStartTime(null);
      setCallSid(null);

      toast({
        title: "Call Transferred",
        description: "The call has been transferred to another agent",
      });
    }, 1500);
  };

  // Render the dialer content without tabs when hideTabsNav is true
  const renderDialerContent = () => (
    <div className="p-4 flex-1 overflow-auto">
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3 mb-4">
        <Label htmlFor="phoneNumber" className="text-sm font-medium">
          Phone Number
        </Label>
        <Input
          id="phoneNumber"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Enter phone number"
          disabled={isCallActive}
          className="font-mono text-base"
        />
        {leadPhoneLineType && (
          <div className="mt-1 flex items-center gap-2">
            <Badge
              variant="outline"
              className={`
              ${leadPhoneLineType === "mobile" ? "bg-green-100 text-green-800" : ""}
              ${leadPhoneLineType === "landline" ? "bg-blue-100 text-blue-800" : ""}
              ${leadPhoneLineType === "voip" ? "bg-purple-100 text-purple-800" : ""}
              ${leadPhoneLineType === "toll_free" ? "bg-yellow-100 text-yellow-800" : ""}
              ${leadPhoneLineType === "premium" ? "bg-red-100 text-red-800" : ""}
            `}
            >
              {leadPhoneLineType.charAt(0).toUpperCase() +
                leadPhoneLineType.slice(1)}
            </Badge>
            {leadPhoneCarrier && (
              <span className="text-xs text-muted-foreground">
                {leadPhoneCarrier}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <DialPad
          onDigitPress={handleDialPadInput}
          disabled={isCallActive && !connectionRef.current && !useMockCalls}
          className="mx-auto max-w-xs"
        />
      </div>
    </div>
  );

  // Render the notes content
  const renderNotesContent = () => (
    <div className="p-4 flex-1 overflow-auto">
      <div className="flex justify-between items-center mb-3">
        <Label htmlFor="callNotes" className="text-sm font-medium">
          Call Notes
        </Label>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateAiNotes}
            disabled={isGeneratingNotes}
            className="h-8 text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${isGeneratingNotes ? "animate-spin" : ""}`}
            />
            {isGeneratingNotes ? "Generating..." : "AI Notes"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={copyNotes}
            disabled={!notes}
            className="h-8 text-xs"
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this call..."
          className="resize-none h-[120px] overflow-y-auto"
        />
      </div>

      <div className="mt-4 space-y-3">
        <Label htmlFor="callDisposition" className="text-sm font-medium">
          Call Disposition
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            {
              value: "interested",
              label: "Interested",
              color: "bg-green-100 text-green-800 border-green-200",
            },
            {
              value: "callback",
              label: "Callback",
              color: "bg-blue-100 text-blue-800 border-blue-200",
            },
            {
              value: "not_interested",
              label: "Not Interested",
              color: "bg-red-100 text-red-800 border-red-200",
            },
            {
              value: "meeting_scheduled",
              label: "Meeting Set",
              color: "bg-purple-100 text-purple-800 border-purple-200",
            },
            {
              value: "wrong_number",
              label: "Wrong Number",
              color: "bg-gray-100 text-gray-800 border-gray-200",
            },
            {
              value: "voicemail",
              label: "Voicemail",
              color: "bg-amber-100 text-amber-800 border-amber-200",
            },
            {
              value: "no_answer",
              label: "No Answer",
              color: "bg-gray-100 text-gray-800 border-gray-200",
            },
            {
              value: "follow_up",
              label: "Follow Up",
              color: "bg-blue-100 text-blue-800 border-blue-200",
            },
          ].map((option) => (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              className={cn(
                "justify-start text-xs h-9 px-3",
                callDisposition === option.value && option.color,
              )}
              onClick={() => setCallDisposition(option.value)}
            >
              {callDisposition === option.value && (
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  // Render the transcription content
  const renderTranscriptionContent = () => (
    <div className="p-4 flex-1 overflow-auto">
      <CallTranscription
        transcription={transcription}
        isTranscribing={isTranscribing}
        callStatus={callStatus}
      />
    </div>
  );

  // Render the call controls
  const renderCallControls = () => (
    <div className="p-4 border-t">
      <div className="flex justify-center space-x-3">
        {!isCallActive ? (
          <Button
            onClick={handleMakeCall}
            className="bg-green-600 hover:bg-green-700 text-white w-full max-w-xs"
            disabled={
              callStatus === "connecting" ||
              !phoneNumber ||
              (!isDeviceReady && !useMockCalls) ||
              isInitializing
            }
            size="lg"
          >
            <Phone className="mr-2 h-5 w-5" />
            {isInitializing
              ? "Initializing..."
              : callStatus === "connecting"
                ? "Connecting..."
                : "Call"}
          </Button>
        ) : (
          <CallControls
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onHangup={handleEndCall}
            onTransferCall={() => setShowTransferPanel(true)}
          />
        )}
      </div>

      {useMockCalls && (
        <div className="mt-3 text-xs text-center text-muted-foreground">
          Running in demo mode. Calls are simulated and not connected to a real
          phone system.
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full max-w-6xl mx-auto">
      {/* Main dialer and notes section */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col h-full rounded-lg bg-background border shadow-xs">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold">
                  {isCallActive ? "Call in Progress" : "Power Dialer"}{" "}
                  {useMockCalls && "(Demo)"}
                </h3>
                {leadName && (
                  <p className="text-sm text-muted-foreground">
                    {isCallActive ? "Connected with" : "Contact"}: {leadName}
                  </p>
                )}
              </div>
            </div>
            {isCallActive && callStartTime && (
              <div className="flex items-center space-x-2 bg-primary/10 px-3 py-1 rounded-full">
                <Clock className="h-4 w-4 text-primary" />
                <CallTimer
                  startTime={callStartTime}
                  className="text-sm font-medium text-primary"
                />
              </div>
            )}
          </div>

          {showTransferPanel ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-4 flex-1 overflow-auto">
                <CallTransfer
                  onTransfer={handleTransferCall}
                  onCancel={() => setShowTransferPanel(false)}
                  isTransferring={isTransferring}
                />
              </div>
            </div>
          ) : hideTabsNav ? (
            // When hideTabsNav is true, just render the dialer content without tabs
            <div className="flex-1 overflow-hidden flex flex-col">
              {renderDialerContent()}
              {renderCallControls()}
            </div>
          ) : (
            // Otherwise, render with tabs
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col"
            >
              <div className="px-4 pt-2 border-b">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="dialer" className="rounded-md">
                    Dialer
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="rounded-md">
                    Notes{" "}
                    {isCallActive && <span className="ml-1.5 text-xs">•</span>}
                  </TabsTrigger>
                  <TabsTrigger value="transcription" className="rounded-md">
                    Transcription{" "}
                    {isTranscribing && (
                      <span className="ml-1.5 text-xs">•</span>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden">
                <TabsContent
                  value="dialer"
                  className="h-full flex flex-col overflow-hidden"
                >
                  {renderDialerContent()}
                  {renderCallControls()}
                </TabsContent>

                <TabsContent
                  value="notes"
                  className="h-full flex flex-col overflow-hidden"
                >
                  {renderNotesContent()}
                  <div className="p-4 border-t">
                    <div className="flex justify-center space-x-3">
                      {isCallActive ? (
                        <CallControls
                          isMuted={isMuted}
                          onToggleMute={handleToggleMute}
                          onHangup={handleEndCall}
                          onTransferCall={() => setShowTransferPanel(true)}
                        />
                      ) : callStatus === "completed" ||
                        callStatus === "transferred" ? (
                        <Button
                          onClick={onClose}
                          variant="default"
                          className="w-full max-w-xs"
                          size="lg"
                        >
                          <Save className="mr-2 h-5 w-5" />
                          Save & Close
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent
                  value="transcription"
                  className="h-full flex flex-col overflow-hidden"
                >
                  {renderTranscriptionContent()}
                  <div className="p-4 border-t">
                    <div className="flex justify-center space-x-3">
                      {isCallActive ? (
                        <CallControls
                          isMuted={isMuted}
                          onToggleMute={handleToggleMute}
                          onHangup={handleEndCall}
                          onTransferCall={() => setShowTransferPanel(true)}
                        />
                      ) : callStatus === "completed" ||
                        callStatus === "transferred" ? (
                        <Button
                          onClick={onClose}
                          variant="default"
                          className="w-full max-w-xs"
                          size="lg"
                        >
                          <Save className="mr-2 h-5 w-5" />
                          Save & Close
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </div>

      {/* AI Assistant Sidebar - only show when not in modal */}
      {!inModal && (
        <div className="w-full lg:w-96">
          <AiAssistant
            leadInfo={leadInfo}
            isCallActive={isCallActive}
            callStatus={callStatus}
          />
        </div>
      )}
    </div>
  );
}
