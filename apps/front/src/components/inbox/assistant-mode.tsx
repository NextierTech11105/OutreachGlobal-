"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ASSISTANT MODE - Hands-Free Calling for AI Workers
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * GIANNA, CATHY, and SABRINA can each enter "Assistant Mode" for hands-free calling.
 * User directs them: "next lead", "call", "skip", "switch lane"
 *
 * SignalHouse.io handles the call infrastructure.
 * We handle the AI persona orchestration on the frontend.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Phone,
  PhoneOff,
  SkipForward,
  Mic,
  MicOff,
  Play,
  Pause,
  Volume2,
  VolumeX,
  User,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Settings,
  MessageSquare,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type PersonaId = "gianna" | "cathy" | "sabrina";

type CampaignLane =
  | "initial"
  | "retarget"
  | "follow_up"
  | "book_appointment"
  | "nurture"
  | "nudger";

interface CurrentLead {
  id: string;
  leadId: string;
  leadName?: string;
  company?: string;
  phone: string;
  email?: string;
  address?: string;
  priority: number;
  attempts: number;
  tags: string[];
}

interface AssistantState {
  persona: PersonaId;
  mode: "assistant";
  active: boolean;
  currentLead?: CurrentLead;
  queuedLeads: number;
  completedToday: number;
  campaignLane: CampaignLane;
  voiceEnabled: boolean;
}

interface AssistantModeProps {
  defaultPersona?: PersonaId;
  onCallComplete?: (leadId: string, outcome: string) => void;
}

// Persona to campaign lane mapping
const PERSONA_LANES: Record<PersonaId, CampaignLane[]> = {
  gianna: ["initial", "retarget", "follow_up", "nurture"],
  cathy: ["nudger", "retarget"],
  sabrina: ["follow_up", "book_appointment"],
};

const PERSONA_CONFIG: Record<
  PersonaId,
  { name: string; role: string; color: string; avatar: string }
> = {
  gianna: {
    name: "GIANNA",
    role: "The Opener",
    color: "from-pink-500 to-rose-500",
    avatar: "G",
  },
  cathy: {
    name: "CATHY",
    role: "The Nudger",
    color: "from-purple-500 to-violet-500",
    avatar: "C",
  },
  sabrina: {
    name: "SABRINA",
    role: "The Closer",
    color: "from-blue-500 to-cyan-500",
    avatar: "S",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AssistantMode({
  defaultPersona = "gianna",
  onCallComplete,
}: AssistantModeProps) {
  const [persona, setPersona] = useState<PersonaId>(defaultPersona);
  const [state, setState] = useState<AssistantState | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [scriptHint, setScriptHint] = useState<string | null>(null);
  const [voicePrompt, setVoicePrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  const config = PERSONA_CONFIG[persona];
  const allowedLanes = PERSONA_LANES[persona];

  // ═══════════════════════════════════════════════════════════════════════════
  // API CALLS
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchAssistantState = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/call-center/queue?action=assistant-state&persona=${persona}`,
      );
      const data = await res.json();
      if (data.success && data.state) {
        setState(data.state);
      }
    } catch (error) {
      console.error("Failed to fetch state:", error);
    }
  }, [persona]);

  const startAssistantMode = async (lane?: CampaignLane) => {
    setLoading(true);
    try {
      const res = await fetch("/api/call-center/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_assistant",
          persona,
          campaignLane: lane || allowedLanes[0],
          voiceEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        setIsActive(true);
        setVoicePrompt(data.voicePrompt);
        setScriptHint(data.scriptHint);
        speak(data.voicePrompt);
      }
    } catch (error) {
      console.error("Failed to start assistant:", error);
    }
    setLoading(false);
  };

  const stopAssistantMode = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/call-center/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stop_assistant",
          persona,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsActive(false);
        setState(null);
        setVoicePrompt(null);
        setScriptHint(null);
        stopCall();
      }
    } catch (error) {
      console.error("Failed to stop assistant:", error);
    }
    setLoading(false);
  };

  const nextLead = async (outcome?: string) => {
    setLoading(true);
    stopCall();
    try {
      const res = await fetch("/api/call-center/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "next_lead",
          persona,
          outcome: outcome || "completed",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        setVoicePrompt(data.voicePrompt);
        setScriptHint(data.scriptHint);
        speak(data.voicePrompt);
        if (state?.currentLead && onCallComplete) {
          onCallComplete(state.currentLead.leadId, outcome || "completed");
        }
      }
    } catch (error) {
      console.error("Failed to get next lead:", error);
    }
    setLoading(false);
  };

  const initiateCall = async () => {
    if (!state?.currentLead) return;

    setLoading(true);
    try {
      const res = await fetch("/api/call-center/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "call",
          persona,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCalling(true);
        setVoicePrompt(data.voicePrompt);
        setScriptHint(data.scriptHint);
        speak(data.voicePrompt);

        // Start call timer
        callTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to initiate call:", error);
    }
    setLoading(false);
  };

  const switchLane = async (lane: CampaignLane) => {
    if (!allowedLanes.includes(lane)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/call-center/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "switch_lane",
          persona,
          campaignLane: lane,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        setVoicePrompt(data.voicePrompt);
        speak(data.voicePrompt);
      }
    } catch (error) {
      console.error("Failed to switch lane:", error);
    }
    setLoading(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE CONTROL
  // ═══════════════════════════════════════════════════════════════════════════

  const speak = (text: string | null) => {
    if (!voiceEnabled || !text) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try to use a female voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(
      (v) =>
        v.name.toLowerCase().includes("female") ||
        v.name.toLowerCase().includes("samantha") ||
        v.name.toLowerCase().includes("karen") ||
        v.name.toLowerCase().includes("victoria"),
    );
    if (femaleVoice) utterance.voice = femaleVoice;

    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (
      typeof window === "undefined" ||
      !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      console.warn("Speech recognition not supported");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript
        .toLowerCase()
        .trim();
      handleVoiceCommand(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      // Restart if still listening
      if (isListening && isActive) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleVoiceCommand = (command: string) => {
    console.log("Voice command:", command);

    if (command.includes("next") || command.includes("skip")) {
      nextLead(command.includes("skip") ? "skipped" : undefined);
    } else if (command.includes("call") || command.includes("dial")) {
      initiateCall();
    } else if (command.includes("hang up") || command.includes("end call")) {
      stopCall();
    } else if (command.includes("stop") || command.includes("pause")) {
      stopAssistantMode();
    } else if (command.includes("switch")) {
      // Extract lane from command
      for (const lane of allowedLanes) {
        if (command.includes(lane.replace("_", " "))) {
          switchLane(lane);
          break;
        }
      }
    }
  };

  const stopCall = () => {
    setIsCalling(false);
    setCallDuration(0);
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    fetchAssistantState();
  }, [fetchAssistantState]);

  useEffect(() => {
    return () => {
      stopListening();
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header - Persona Selector */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Persona Tabs */}
            <div className="flex bg-zinc-800 rounded-lg p-1">
              {(["gianna", "cathy", "sabrina"] as PersonaId[]).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    if (!isActive) setPersona(p);
                  }}
                  disabled={isActive}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    persona === p
                      ? `bg-gradient-to-r ${PERSONA_CONFIG[p].color} text-white`
                      : "text-zinc-400 hover:text-white"
                  } ${isActive ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {PERSONA_CONFIG[p].name}
                </button>
              ))}
            </div>
            <span className="text-zinc-500 text-sm">{config.role}</span>
          </div>

          {/* Voice Toggle */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              voiceEnabled
                ? "bg-green-500/20 text-green-400"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {voiceEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Campaign Lane Selector */}
        {isActive && (
          <div className="flex gap-2 mt-3">
            {allowedLanes.map((lane) => (
              <button
                key={lane}
                onClick={() => switchLane(lane)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  state?.campaignLane === lane
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {lane.replace("_", " ")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="p-6">
        {!isActive ? (
          // Start Screen
          <div className="text-center py-8">
            <div
              className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-r ${config.color} flex items-center justify-center text-3xl font-bold text-white mb-4`}
            >
              {config.avatar}
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {config.name} Assistant Mode
            </h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              Hands-free calling. Say "call" to dial, "next" for the next lead,
              "skip" to skip. I'll assist with the conversation.
            </p>

            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button
                onClick={() => startAssistantMode()}
                disabled={loading}
                className={`w-full px-6 py-3 rounded-lg bg-gradient-to-r ${config.color} text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
              >
                <Play className="w-5 h-5" />
                Start Assistant Mode
              </button>

              <div className="flex gap-2">
                {allowedLanes.map((lane) => (
                  <button
                    key={lane}
                    onClick={() => startAssistantMode(lane)}
                    disabled={loading}
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
                  >
                    {lane.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {state && state.queuedLeads > 0 && (
              <p className="text-zinc-500 text-sm mt-4">
                {state.queuedLeads} leads in queue
              </p>
            )}
          </div>
        ) : (
          // Active Mode
          <div className="space-y-6">
            {/* Current Lead Card */}
            {state?.currentLead ? (
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-zinc-400" />
                      <span className="text-white font-medium">
                        {state.currentLead.leadName || "Unknown"}
                      </span>
                      {state.currentLead.attempts > 1 && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                          Attempt {state.currentLead.attempts}
                        </span>
                      )}
                    </div>
                    {state.currentLead.company && (
                      <div className="flex items-center gap-2 text-zinc-400 text-sm">
                        <Building2 className="w-4 h-4" />
                        <span>{state.currentLead.company}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-zinc-400 text-sm mt-1">
                      <Phone className="w-4 h-4" />
                      <span>{state.currentLead.phone}</span>
                    </div>
                    {state.currentLead.address && (
                      <div className="flex items-center gap-2 text-zinc-400 text-sm mt-1">
                        <MapPin className="w-4 h-4" />
                        <span>{state.currentLead.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Priority Badge */}
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      state.currentLead.priority >= 8
                        ? "bg-green-500/20 text-green-400"
                        : state.currentLead.priority >= 5
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-zinc-700 text-zinc-400"
                    }`}
                  >
                    Priority {state.currentLead.priority}
                  </div>
                </div>

                {/* Tags */}
                {state.currentLead.tags.length > 0 && (
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {state.currentLead.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-400">
                <p>No leads in queue for {state?.campaignLane} lane</p>
                <p className="text-sm mt-1">Switch lanes or add leads</p>
              </div>
            )}

            {/* Script Hint */}
            {scriptHint && (
              <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/50">
                <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                  <MessageSquare className="w-3 h-3" />
                  Script Hint
                </div>
                <p className="text-zinc-300 text-sm italic">"{scriptHint}"</p>
              </div>
            )}

            {/* Call Controls */}
            <div className="flex items-center justify-center gap-4">
              {!isCalling ? (
                <>
                  <button
                    onClick={() => nextLead("skipped")}
                    disabled={loading || !state?.currentLead}
                    className="p-4 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    title="Skip Lead"
                  >
                    <SkipForward className="w-6 h-6" />
                  </button>

                  <button
                    onClick={initiateCall}
                    disabled={loading || !state?.currentLead}
                    className={`p-6 rounded-full bg-gradient-to-r ${config.color} text-white hover:opacity-90 transition-opacity disabled:opacity-50`}
                    title="Call"
                  >
                    <Phone className="w-8 h-8" />
                  </button>

                  <button
                    onClick={() => nextLead()}
                    disabled={loading || !state?.currentLead}
                    className="p-4 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    title="Next Lead"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-mono text-white mb-2">
                      {formatDuration(callDuration)}
                    </div>
                    <div className="text-green-400 text-sm animate-pulse">
                      Call in progress...
                    </div>
                  </div>

                  <button
                    onClick={stopCall}
                    className="p-6 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    title="End Call"
                  >
                    <PhoneOff className="w-8 h-8" />
                  </button>
                </>
              )}
            </div>

            {/* Voice Control */}
            <div className="flex justify-center">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  isListening
                    ? "bg-red-500/20 text-red-400 animate-pulse"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    Listening...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Enable Voice
                  </>
                )}
              </button>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center justify-between text-sm border-t border-zinc-800 pt-4">
              <div className="flex items-center gap-4">
                <div className="text-zinc-400">
                  <span className="text-white font-medium">
                    {state?.queuedLeads || 0}
                  </span>{" "}
                  in queue
                </div>
                <div className="text-zinc-400">
                  <span className="text-green-400 font-medium">
                    {state?.completedToday || 0}
                  </span>{" "}
                  completed today
                </div>
              </div>

              <button
                onClick={stopAssistantMode}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <Pause className="w-4 h-4" />
                Stop
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Voice Prompt Display */}
      {voicePrompt && isActive && (
        <div className="px-4 py-3 bg-zinc-800/50 border-t border-zinc-700 text-center">
          <p className="text-zinc-300 text-sm">{voicePrompt}</p>
        </div>
      )}
    </div>
  );
}

export default AssistantMode;
