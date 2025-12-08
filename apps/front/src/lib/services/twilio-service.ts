// Types for Twilio service
export interface CallDetails {
  sid: string;
  from: string;
  to: string;
  direction: "inbound" | "outbound";
  status: string;
  startTime: string;
  endTime?: string;
  duration: number;
  recordingUrl?: string;
  transcriptionText?: string;
  sentimentScore?: number;
}

export interface VoicemailTemplate {
  id: string;
  name: string;
  description: string;
  audioUrl: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConferenceDetails {
  sid: string;
  friendlyName: string;
  status: string;
  dateCreated: string;
  dateUpdated: string;
  region: string;
  recordingEnabled: boolean;
  participants: ConferenceParticipant[];
}

export interface ConferenceParticipant {
  callSid: string;
  participantSid: string;
  label?: string;
  muted: boolean;
  hold: boolean;
  status: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  accountSid: string;
  conferenceSid: string;
}

// Mock data for development
const mockCalls: CallDetails[] = [
  {
    sid: "CA123456789012345678901234567890",
    from: "(555) 123-4567",
    to: "(555) 987-6543",
    direction: "outbound",
    status: "completed",
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() - 3540000).toISOString(),
    duration: 60,
    recordingUrl: "https://example.com/recording.mp3",
    transcriptionText:
      "Hello, this is John from Nextier Data Engine. I'm calling about your property at 123 Main Street. We have some interesting data insights about your neighborhood that might be valuable for you.",
    sentimentScore: 0.7,
  },
  {
    sid: "CA234567890123456789012345678901",
    from: "(555) 234-5678",
    to: "(555) 987-6543",
    direction: "inbound",
    status: "completed",
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date(Date.now() - 7080000).toISOString(),
    duration: 120,
    recordingUrl: "https://example.com/recording2.mp3",
    transcriptionText:
      "Hi, I'm calling about the property data services you offer. I saw your website and I'm interested in learning more about how your platform works for real estate investors.",
    sentimentScore: 0.8,
  },
  {
    sid: "CA345678901234567890123456789012",
    from: "(555) 987-6543",
    to: "(555) 345-6789",
    direction: "outbound",
    status: "no-answer",
    startTime: new Date(Date.now() - 10800000).toISOString(),
    duration: 0,
  },
  {
    sid: "CA456789012345678901234567890123",
    from: "(555) 456-7890",
    to: "(555) 987-6543",
    direction: "inbound",
    status: "completed",
    startTime: new Date(Date.now() - 86400000).toISOString(),
    endTime: new Date(Date.now() - 86100000).toISOString(),
    duration: 300,
    recordingUrl: "https://example.com/recording3.mp3",
    transcriptionText:
      "Hello, I received your email about my property on Oak Street. I'm interested in the market analysis you mentioned. Can you tell me more about how accurate your data is and what sources you use?",
    sentimentScore: 0.6,
  },
  {
    sid: "CA567890123456789012345678901234",
    from: "(555) 987-6543",
    to: "(555) 567-8901",
    direction: "outbound",
    status: "busy",
    startTime: new Date(Date.now() - 172800000).toISOString(),
    duration: 0,
  },
];

const mockVoicemailTemplates: VoicemailTemplate[] = [
  {
    id: "vm-1",
    name: "Standard Voicemail",
    description: "General voicemail for leads who don't answer",
    audioUrl: "https://example.com/voicemail1.mp3",
    duration: 20,
    createdAt: new Date(Date.now() - 2592000000).toISOString(),
    updatedAt: new Date(Date.now() - 1296000000).toISOString(),
  },
  {
    id: "vm-2",
    name: "Follow-up Voicemail",
    description: "For leads we've contacted before",
    audioUrl: "https://example.com/voicemail2.mp3",
    duration: 25,
    createdAt: new Date(Date.now() - 1728000000).toISOString(),
    updatedAt: new Date(Date.now() - 864000000).toISOString(),
  },
  {
    id: "vm-3",
    name: "Urgent Opportunity",
    description: "For high-value leads with time-sensitive opportunities",
    audioUrl: "https://example.com/voicemail3.mp3",
    duration: 30,
    createdAt: new Date(Date.now() - 864000000).toISOString(),
    updatedAt: new Date(Date.now() - 432000000).toISOString(),
  },
];

// Mock conferences data
const mockConferences: ConferenceDetails[] = [];

// Twilio service implementation
class TwilioService {
  // Get a token for Twilio Client - calls real API
  async getToken(identity: string): Promise<{ token: string; configured?: boolean }> {
    try {
      const response = await fetch("/api/twilio/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        console.error("Twilio token error:", data.error);
        // Return error info so caller knows Twilio isn't configured
        return { token: "", configured: false };
      }

      return { token: data.token, configured: true };
    } catch (error) {
      console.error("Error getting Twilio token:", error);
      return { token: "", configured: false };
    }
  }

  // Get recent calls
  async getRecentCalls(limit = 10): Promise<CallDetails[]> {
    try {
      // In a real implementation, this would call your backend API
      // For development, return mock data
      return mockCalls.slice(0, limit);
    } catch (error) {
      console.error("Error getting recent calls:", error);
      throw error;
    }
  }

  // Get call details
  async getCallDetails(callSid: string): Promise<CallDetails> {
    try {
      // In a real implementation, this would call your backend API
      // For development, find the call in mock data
      const call = mockCalls.find((c) => c.sid === callSid);
      if (!call) {
        throw new Error("Call not found");
      }
      return call;
    } catch (error) {
      console.error("Error getting call details:", error);
      throw error;
    }
  }

  // Get voicemail templates
  async getVoicemailTemplates(): Promise<VoicemailTemplate[]> {
    try {
      // In a real implementation, this would call your backend API
      // For development, return mock data
      return mockVoicemailTemplates;
    } catch (error) {
      console.error("Error getting voicemail templates:", error);
      throw error;
    }
  }

  // Drop a voicemail
  async dropVoicemail(callSid: string, templateId: string): Promise<void> {
    try {
      // In a real implementation, this would call your backend API
      console.log(
        `Dropping voicemail template ${templateId} for call ${callSid}`,
      );
      // For development, just log and return
      return;
    } catch (error) {
      console.error("Error dropping voicemail:", error);
      throw error;
    }
  }

  // Create a conference
  async createConference(
    friendlyName: string,
    announceOnJoin = true,
  ): Promise<ConferenceDetails> {
    try {
      // In a real implementation, this would call your backend API to create a conference
      console.log(
        `Creating conference ${friendlyName} with announceOnJoin=${announceOnJoin}`,
      );

      // For development, create a mock conference
      const conference: ConferenceDetails = {
        sid: `CF${Date.now()}`,
        friendlyName,
        status: "in-progress",
        dateCreated: new Date().toISOString(),
        dateUpdated: new Date().toISOString(),
        region: "us1",
        recordingEnabled: false,
        participants: [],
      };

      mockConferences.push(conference);
      return conference;
    } catch (error) {
      console.error("Error creating conference:", error);
      throw error;
    }
  }

  // End a conference
  async endConference(friendlyName: string): Promise<void> {
    try {
      // In a real implementation, this would call your backend API to end a conference
      console.log(`Ending conference ${friendlyName}`);

      // For development, update the mock conference
      const conferenceIndex = mockConferences.findIndex(
        (c) => c.friendlyName === friendlyName,
      );
      if (conferenceIndex >= 0) {
        mockConferences[conferenceIndex].status = "completed";
        mockConferences[conferenceIndex].dateUpdated = new Date().toISOString();
      }
    } catch (error) {
      console.error("Error ending conference:", error);
      throw error;
    }
  }

  // Get conference details
  async getConference(friendlyName: string): Promise<ConferenceDetails | null> {
    try {
      // In a real implementation, this would call your backend API to get conference details
      console.log(`Getting conference ${friendlyName}`);

      // For development, find the mock conference
      const conference = mockConferences.find(
        (c) => c.friendlyName === friendlyName,
      );
      return conference || null;
    } catch (error) {
      console.error("Error getting conference:", error);
      throw error;
    }
  }

  // Add a participant to a conference
  async addParticipantToConference(
    friendlyName: string,
    phoneNumber: string,
  ): Promise<ConferenceParticipant> {
    try {
      // In a real implementation, this would call your backend API to add a participant
      console.log(
        `Adding participant ${phoneNumber} to conference ${friendlyName}`,
      );

      // For development, update the mock conference
      const conferenceIndex = mockConferences.findIndex(
        (c) => c.friendlyName === friendlyName,
      );
      if (conferenceIndex < 0) {
        throw new Error("Conference not found");
      }

      const participant: ConferenceParticipant = {
        callSid: `CA${Date.now()}`,
        participantSid: `PA${Date.now()}`,
        muted: false,
        hold: false,
        status: "connected",
        startTime: new Date().toISOString(),
        accountSid: "AC123456789",
        conferenceSid: mockConferences[conferenceIndex].sid,
      };

      mockConferences[conferenceIndex].participants.push(participant);
      return participant;
    } catch (error) {
      console.error("Error adding participant to conference:", error);
      throw error;
    }
  }

  // Remove a participant from a conference
  async removeParticipant(
    friendlyName: string,
    participantIdentifier: string,
  ): Promise<void> {
    try {
      // In a real implementation, this would call your backend API to remove a participant
      console.log(
        `Removing participant ${participantIdentifier} from conference ${friendlyName}`,
      );

      // For development, update the mock conference
      const conferenceIndex = mockConferences.findIndex(
        (c) => c.friendlyName === friendlyName,
      );
      if (conferenceIndex < 0) {
        throw new Error("Conference not found");
      }

      const participantIndex = mockConferences[
        conferenceIndex
      ].participants.findIndex(
        (p) =>
          p.callSid === participantIdentifier ||
          p.participantSid === participantIdentifier,
      );

      if (participantIndex >= 0) {
        mockConferences[conferenceIndex].participants[participantIndex].status =
          "disconnected";
        mockConferences[conferenceIndex].participants[
          participantIndex
        ].endTime = new Date().toISOString();
      }
    } catch (error) {
      console.error("Error removing participant from conference:", error);
      throw error;
    }
  }

  // Mute/unmute a participant
  async muteParticipant(
    friendlyName: string,
    participantIdentifier: string,
    mute: boolean,
  ): Promise<void> {
    try {
      // In a real implementation, this would call your backend API to mute/unmute a participant
      console.log(
        `${mute ? "Muting" : "Unmuting"} participant ${participantIdentifier} in conference ${friendlyName}`,
      );

      // For development, update the mock conference
      const conferenceIndex = mockConferences.findIndex(
        (c) => c.friendlyName === friendlyName,
      );
      if (conferenceIndex < 0) {
        throw new Error("Conference not found");
      }

      const participantIndex = mockConferences[
        conferenceIndex
      ].participants.findIndex(
        (p) =>
          p.callSid === participantIdentifier ||
          p.participantSid === participantIdentifier,
      );

      if (participantIndex >= 0) {
        mockConferences[conferenceIndex].participants[participantIndex].muted =
          mute;
      }
    } catch (error) {
      console.error(
        `Error ${mute ? "muting" : "unmuting"} participant:`,
        error,
      );
      throw error;
    }
  }

  // Hold/unhold a participant
  async holdParticipant(
    friendlyName: string,
    participantIdentifier: string,
    hold: boolean,
  ): Promise<void> {
    try {
      // In a real implementation, this would call your backend API to hold/unhold a participant
      console.log(
        `${hold ? "Holding" : "Unholding"} participant ${participantIdentifier} in conference ${friendlyName}`,
      );

      // For development, update the mock conference
      const conferenceIndex = mockConferences.findIndex(
        (c) => c.friendlyName === friendlyName,
      );
      if (conferenceIndex < 0) {
        throw new Error("Conference not found");
      }

      const participantIndex = mockConferences[
        conferenceIndex
      ].participants.findIndex(
        (p) =>
          p.callSid === participantIdentifier ||
          p.participantSid === participantIdentifier,
      );

      if (participantIndex >= 0) {
        mockConferences[conferenceIndex].participants[participantIndex].hold =
          hold;
      }
    } catch (error) {
      console.error(
        `Error ${hold ? "holding" : "unholding"} participant:`,
        error,
      );
      throw error;
    }
  }

  // Start conference recording
  async startConferenceRecording(friendlyName: string): Promise<void> {
    try {
      // In a real implementation, this would call your backend API to start recording
      console.log(`Starting recording for conference ${friendlyName}`);

      // For development, update the mock conference
      const conferenceIndex = mockConferences.findIndex(
        (c) => c.friendlyName === friendlyName,
      );
      if (conferenceIndex < 0) {
        throw new Error("Conference not found");
      }

      mockConferences[conferenceIndex].recordingEnabled = true;
    } catch (error) {
      console.error("Error starting conference recording:", error);
      throw error;
    }
  }

  // Stop conference recording
  async stopConferenceRecording(friendlyName: string): Promise<void> {
    try {
      // In a real implementation, this would call your backend API to stop recording
      console.log(`Stopping recording for conference ${friendlyName}`);

      // For development, update the mock conference
      const conferenceIndex = mockConferences.findIndex(
        (c) => c.friendlyName === friendlyName,
      );
      if (conferenceIndex < 0) {
        throw new Error("Conference not found");
      }

      mockConferences[conferenceIndex].recordingEnabled = false;
    } catch (error) {
      console.error("Error stopping conference recording:", error);
      throw error;
    }
  }

  // Send announcement to a participant
  async sendAnnouncementToParticipant(
    friendlyName: string,
    participantIdentifier: string,
    message: string,
  ): Promise<void> {
    try {
      // In a real implementation, this would call your backend API to send an announcement
      console.log(
        `Sending announcement "${message}" to participant ${participantIdentifier} in conference ${friendlyName}`,
      );

      // For development, just log and return
      return;
    } catch (error) {
      console.error("Error sending announcement to participant:", error);
      throw error;
    }
  }

  // Enable coach mode (whisper)
  async enableCoachMode(
    friendlyName: string,
    targetParticipantIdentifier: string,
  ): Promise<void> {
    try {
      // In a real implementation, this would call your backend API to enable coach mode
      console.log(
        `Enabling coach mode for target participant ${targetParticipantIdentifier} in conference ${friendlyName}`,
      );

      // For development, just log and return
      return;
    } catch (error) {
      console.error("Error enabling coach mode:", error);
      throw error;
    }
  }

  // Enable monitor mode
  async enableMonitorMode(friendlyName: string): Promise<void> {
    try {
      // In a real implementation, this would call your backend API to enable monitor mode
      console.log(`Enabling monitor mode in conference ${friendlyName}`);

      // For development, just log and return
      return;
    } catch (error) {
      console.error("Error enabling monitor mode:", error);
      throw error;
    }
  }

  // Change participant role
  async changeParticipantRole(
    friendlyName: string,
    participantIdentifier: string,
    role: "moderator" | "participant" | "monitor" | "coach",
  ): Promise<void> {
    try {
      // In a real implementation, this would call your backend API to change role
      console.log(
        `Changing role of participant ${participantIdentifier} to ${role} in conference ${friendlyName}`,
      );

      // For development, just log and return
      return;
    } catch (error) {
      console.error("Error changing participant role:", error);
      throw error;
    }
  }
}

// Export the service instance
export const twilioService = new TwilioService();

// Export a mock Twilio object instead of importing the actual SDK
// This avoids the "Object prototype may only be an Object or null: undefined" error
export const twilio = {
  twiml: {
    VoiceResponse: class VoiceResponse {
      constructor() {
        this.instructions = [];
      }

      say(message, options = {}) {
        this.instructions.push({ type: "say", message, options });
        return this;
      }

      dial(options = {}) {
        const dial = { type: "dial", options, children: [] };
        this.instructions.push(dial);
        return {
          conference: (options, name) => {
            dial.children.push({ type: "conference", options, name });
          },
        };
      }

      pause(options = {}) {
        this.instructions.push({ type: "pause", options });
        return this;
      }

      gather(options = {}) {
        const gather = { type: "gather", options, children: [] };
        this.instructions.push(gather);
        return {
          say: (message, sayOptions = {}) => {
            gather.children.push({ type: "say", message, options: sayOptions });
            return this;
          },
        };
      }

      toString() {
        // In a real implementation, this would generate XML
        // For now, just return a simple XML structure
        return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
      }
    },
  },
  jwt: {
    ClientCapability: class ClientCapability {
      constructor(options) {
        this.options = options;
      }

      addScope(scope) {
        // Mock implementation
      }

      toJwt() {
        return "mock-jwt-token";
      }
    },
  },
};

// Create a factory function for Twilio client
export function createTwilioClient(accountSid: string, authToken: string) {
  return {
    calls: (sid?: string) => ({
      create: async (options: any) => ({
        sid: `CA${Date.now()}`,
        status: "queued",
        direction: "outbound-api",
        from: options.from,
        to: options.to,
        duration: 0,
        startTime: new Date().toISOString(),
      }),
      fetch: async () => mockCalls.find((c) => c.sid === sid) || mockCalls[0],
      update: async (options: any) => ({ success: true }),
    }),
    recordings: {
      list: async (options: any) => [],
    },
    transcriptions: {
      list: async (options: any) => [],
    },
    conferences: (sid?: string) => ({
      create: async (options: any) => ({
        sid: `CF${Date.now()}`,
        friendlyName: options.friendlyName,
        status: "in-progress",
        dateCreated: new Date().toISOString(),
        dateUpdated: new Date().toISOString(),
      }),
      participants: {
        list: async () => [],
        create: async (options: any) => ({
          sid: `PA${Date.now()}`,
          callSid: `CA${Date.now()}`,
          conferenceSid: sid,
          status: "connected",
          startTime: new Date().toISOString(),
          dateCreated: new Date().toISOString(),
          dateUpdated: new Date().toISOString(),
        }),
      },
    }),
    conferences: {
      list: async (options: any) => [],
    },
  };
}
