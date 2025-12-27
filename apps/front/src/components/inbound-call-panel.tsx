"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  User,
  Building2,
  Clock,
  Loader2,
  PhoneIncoming,
  Volume2,
} from "lucide-react";

// Twilio types
type TwilioDevice = {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  state: string;
  calls: Map<string, TwilioCall>;
  destroy: () => void;
};

type TwilioCall = {
  accept: () => void;
  reject: () => void;
  disconnect: () => void;
  mute: (muted: boolean) => void;
  isMuted: () => boolean;
  status: () => string;
  parameters: { From?: string; To?: string; CallSid?: string };
  on: (event: string, handler: (...args: unknown[]) => void) => void;
};

interface CallerContext {
  phoneNumber: string;
  leadId?: string;
  leadName?: string;
  companyName?: string;
  classification?: string;
}

type CallStatus = "idle" | "ringing" | "connected" | "ended";

export function InboundCallPanel() {
  const [device, setDevice] = useState<TwilioDevice | null>(null);
  const [activeCall, setActiveCall] = useState<TwilioCall | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [callerContext, setCallerContext] = useState<CallerContext | null>(
    null,
  );
  const [callDuration, setCallDuration] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const callStartTime = useRef<number | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize Twilio Device
  useEffect(() => {
    let mounted = true;
    let deviceInstance: TwilioDevice | null = null;

    const initDevice = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        // Dynamically import Twilio Voice SDK
        const { Device } = await import("@twilio/voice-sdk");

        // Get token from server
        const tokenResponse = await fetch("/api/twilio/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identity: `inbound-agent-${Date.now()}` }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.success || !tokenData.token) {
          throw new Error(tokenData.error || "Failed to get Twilio token");
        }

        // Create and register device
        deviceInstance = new Device(tokenData.token, {
          codecPreferences: ["opus", "pcmu"],
          closeProtection: true,
          enableRingingState: true,
        }) as unknown as TwilioDevice;

        // Device event handlers
        deviceInstance.on("registered", () => {
          console.log("[Softphone] Device registered");
          if (mounted) setIsInitializing(false);
        });

        deviceInstance.on("error", (err: Error) => {
          console.error("[Softphone] Device error:", err);
          if (mounted) setError(err.message);
        });

        deviceInstance.on("incoming", (call: TwilioCall) => {
          console.log("[Softphone] Incoming call:", call.parameters);
          if (mounted) {
            setActiveCall(call);
            setCallStatus("ringing");
            lookupCaller(call.parameters.From || "");

            // Call event handlers
            call.on("accept", () => {
              setCallStatus("connected");
              callStartTime.current = Date.now();
              startDurationTimer();
            });

            call.on("disconnect", () => {
              handleCallEnd();
            });

            call.on("cancel", () => {
              handleCallEnd();
            });

            call.on("reject", () => {
              handleCallEnd();
            });
          }
        });

        deviceInstance.on("tokenWillExpire", async () => {
          // Refresh token before expiry
          try {
            const refreshResponse = await fetch("/api/twilio/token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ identity: `inbound-agent-${Date.now()}` }),
            });
            const refreshData = await refreshResponse.json();
            if (refreshData.token && deviceInstance) {
              // Token refresh happens automatically with the device
              console.log("[Softphone] Token refreshed");
            }
          } catch (err) {
            console.error("[Softphone] Token refresh failed:", err);
          }
        });

        await deviceInstance.register();
        if (mounted) setDevice(deviceInstance);
      } catch (err) {
        console.error("[Softphone] Init error:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to initialize");
          setIsInitializing(false);
        }
      }
    };

    initDevice();

    return () => {
      mounted = false;
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (deviceInstance) {
        try {
          deviceInstance.destroy();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  // Lookup caller info
  const lookupCaller = async (phoneNumber: string) => {
    try {
      const response = await fetch(
        `/api/leads/lookup?phone=${encodeURIComponent(phoneNumber)}`,
      );
      const data = await response.json();

      setCallerContext({
        phoneNumber,
        leadId: data.lead?.id,
        leadName: data.lead?.firstName
          ? `${data.lead.firstName} ${data.lead.lastName || ""}`.trim()
          : undefined,
        companyName: data.lead?.company,
        classification: data.classification,
      });
    } catch {
      setCallerContext({ phoneNumber });
    }
  };

  // Start call duration timer
  const startDurationTimer = () => {
    durationInterval.current = setInterval(() => {
      if (callStartTime.current) {
        setCallDuration(
          Math.floor((Date.now() - callStartTime.current) / 1000),
        );
      }
    }, 1000);
  };

  // Handle call end
  const handleCallEnd = useCallback(() => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }

    // Log call event
    if (activeCall && callerContext) {
      logCallEvent({
        callSid: activeCall.parameters.CallSid || "",
        from: callerContext.phoneNumber,
        duration: callDuration,
        leadId: callerContext.leadId,
      });
    }

    setCallStatus("ended");
    setTimeout(() => {
      setActiveCall(null);
      setCallerContext(null);
      setCallDuration(0);
      setIsMuted(false);
      setIsOnHold(false);
      setCallStatus("idle");
      callStartTime.current = null;
    }, 2000);
  }, [activeCall, callerContext, callDuration]);

  // Log call event to server
  const logCallEvent = async (event: {
    callSid: string;
    from: string;
    duration: number;
    leadId?: string;
  }) => {
    try {
      await fetch("/api/calls/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...event,
          direction: "inbound",
          answeredAt: callStartTime.current
            ? new Date(callStartTime.current).toISOString()
            : undefined,
          endedAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("[Softphone] Failed to log call:", err);
    }
  };

  // Call controls
  const handleAnswer = () => {
    if (activeCall) {
      activeCall.accept();
    }
  };

  const handleReject = () => {
    if (activeCall) {
      activeCall.reject();
      handleCallEnd();
    }
  };

  const handleHangup = () => {
    if (activeCall) {
      activeCall.disconnect();
    }
  };

  const handleMute = () => {
    if (activeCall) {
      const newMuted = !isMuted;
      activeCall.mute(newMuted);
      setIsMuted(newMuted);
    }
  };

  const handleHold = () => {
    // Hold is typically implemented via TwiML on the server side
    // For now, we'll just toggle the local state and mute
    if (activeCall) {
      const newHold = !isOnHold;
      activeCall.mute(newHold);
      setIsOnHold(newHold);
      setIsMuted(newHold);
    }
  };

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Render idle state
  if (callStatus === "idle") {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
                <Phone className="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300">
                  Inbound Calls
                </p>
                <p className="text-xs text-zinc-500">
                  {isInitializing
                    ? "Connecting..."
                    : error
                      ? "Connection error"
                      : "Ready to receive calls"}
                </p>
              </div>
            </div>
            {isInitializing ? (
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            ) : error ? (
              <Badge variant="destructive" className="text-xs">
                Offline
              </Badge>
            ) : (
              <Badge className="bg-green-600/20 text-green-400 text-xs">
                <Volume2 className="h-3 w-3 mr-1" />
                Online
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render active call states (ringing, connected, ended)
  return (
    <Card
      className={`border-2 ${
        callStatus === "ringing"
          ? "border-yellow-500/50 bg-yellow-500/5 animate-pulse"
          : callStatus === "connected"
            ? "border-green-500/50 bg-green-500/5"
            : "border-zinc-700 bg-zinc-900/50"
      }`}
    >
      <CardContent className="p-4 space-y-4">
        {/* Caller Info */}
        <div className="flex items-center gap-3">
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center ${
              callStatus === "ringing"
                ? "bg-yellow-500/20"
                : callStatus === "connected"
                  ? "bg-green-500/20"
                  : "bg-zinc-800"
            }`}
          >
            {callStatus === "ringing" ? (
              <PhoneIncoming className="h-6 w-6 text-yellow-400 animate-bounce" />
            ) : (
              <User className="h-6 w-6 text-zinc-400" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-zinc-100">
                {callerContext?.leadName || "Unknown Caller"}
              </p>
              {callerContext?.classification && (
                <Badge variant="outline" className="text-xs">
                  {callerContext.classification}
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-400">
              {callerContext?.phoneNumber || "Unknown Number"}
            </p>
            {callerContext?.companyName && (
              <div className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
                <Building2 className="h-3 w-3" />
                {callerContext.companyName}
              </div>
            )}
          </div>
        </div>

        {/* Call Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              className={`${
                callStatus === "ringing"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : callStatus === "connected"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-zinc-700 text-zinc-400"
              }`}
            >
              {callStatus === "ringing"
                ? "Ringing"
                : callStatus === "connected"
                  ? "Connected"
                  : "Ended"}
            </Badge>
            {isOnHold && (
              <Badge className="bg-blue-500/20 text-blue-400">On Hold</Badge>
            )}
          </div>
          {callStatus === "connected" && (
            <div className="flex items-center gap-1 text-sm text-zinc-400">
              <Clock className="h-3 w-3" />
              {formatDuration(callDuration)}
            </div>
          )}
        </div>

        {/* Call Controls */}
        <div className="flex items-center gap-2">
          {callStatus === "ringing" && (
            <>
              <Button
                onClick={handleAnswer}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Phone className="h-4 w-4 mr-2" />
                Answer
              </Button>
              <Button
                onClick={handleReject}
                variant="destructive"
                className="flex-1"
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </>
          )}

          {callStatus === "connected" && (
            <>
              <Button
                onClick={handleMute}
                variant={isMuted ? "default" : "outline"}
                size="sm"
                className="flex-1"
              >
                {isMuted ? (
                  <MicOff className="h-4 w-4 mr-1" />
                ) : (
                  <Mic className="h-4 w-4 mr-1" />
                )}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              <Button
                onClick={handleHold}
                variant={isOnHold ? "default" : "outline"}
                size="sm"
                className="flex-1"
              >
                {isOnHold ? (
                  <Play className="h-4 w-4 mr-1" />
                ) : (
                  <Pause className="h-4 w-4 mr-1" />
                )}
                {isOnHold ? "Resume" : "Hold"}
              </Button>
              <Button
                onClick={handleHangup}
                variant="destructive"
                size="sm"
                className="flex-1"
              >
                <PhoneOff className="h-4 w-4 mr-1" />
                End
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
