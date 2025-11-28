// temporary only

export interface AiSdr {
  id: string;
  name: string;
  description: string;
  personality: string;
  callScript: string;
  objectionHandling: string[];
  model: string;
  voice: {
    provider: "twilio" | "elevenlabs";
    voiceId: string;
    speed: number;
    pitch: number;
  };
  isActive: boolean;
}

export interface DialerConfig {
  mode: "manual" | "ai-sdr";
  selectedAiSdr: AiSdr | null;
}
