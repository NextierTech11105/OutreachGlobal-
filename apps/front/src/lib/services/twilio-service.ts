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

// Runtime storage for conferences (not persisted)
const activeConferences: ConferenceDetails[] = [];

// Twilio service implementation
class TwilioService {
  // Get a token for Twilio Client - calls real API
  async getToken(
    identity: string,
  ): Promise<{ token: string; configured?: boolean }> {
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
      const response = await fetch(`/api/twilio/calls?limit=${limit}`);
      if (!response.ok) {
        console.error("Failed to fetch recent calls");
        return [];
      }
      const data = await response.json();
      return data.calls || [];
    } catch (error) {
      console.error("Error getting recent calls:", error);
      return [];
    }
  }

  // Get call details
  async getCallDetails(callSid: string): Promise<CallDetails> {
    try {
      const response = await fetch(`/api/twilio/calls/${callSid}`);
      if (!response.ok) {
        throw new Error("Call not found");
      }
      const data = await response.json();
      return data.call;
    } catch (error) {
      console.error("Error getting call details:", error);
      throw error;
    }
  }

  // Get voicemail templates
  async getVoicemailTemplates(): Promise<VoicemailTemplate[]> {
    try {
      const response = await fetch("/api/twilio/voicemail-templates");
      if (!response.ok) {
        console.error("Failed to fetch voicemail templates");
        return [];
      }
      const data = await response.json();
      return data.templates || [];
    } catch (error) {
      console.error("Error getting voicemail templates:", error);
      return [];
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

      activeConferences.push(conference);
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
      const conferenceIndex = activeConferences.findIndex(
        (c) => c.friendlyName === friendlyName,
      );
      if (conferenceIndex >= 0) {
        activeConferences[conferenceIndex].status = "completed";
        activeConferences[conferenceIndex].dateUpdated =
          new Date().toISOString();
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
      const conference = activeConferences.find(
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
      const conferenceIndex = activeConferences.findIndex(
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
        conferenceSid: activeConferences[conferenceIndex].sid,
      };

      activeConferences[conferenceIndex].participants.push(participant);
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
      const conferenceIndex = activeConferences.findIndex(
        (c) => c.friendlyName === friendlyName,
      );
      if (conferenceIndex < 0) {
        throw new Error("Conference not found");
      }

      const participantIndex = activeConferences[
        conferenceIndex
      ].participants.findIndex(
        (p) =>
          p.callSid === participantIdentifier ||
          p.participantSid === participantIdentifier,
      );

      if (participantIndex >= 0) {
        activeConferences[conferenceIndex].participants[
          participantIndex
        ].status = "disconnected";
        activeConferences[conferenceIndex].participants[
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
      const conferenceIndex = activeConferences.findIndex(
        (c) => c.friendlyName === friendlyName,
      );
      if (conferenceIndex < 0) {
        throw new Error("Conference not found");
      }

      const participantIndex = activeConferences[
        conferenceIndex
      ].participants.findIndex(
        (p) =>
          p.callSid === participantIdentifier ||
          p.participantSid === participantIdentifier,
      );

      if (participantIndex >= 0) {
        activeConferences[conferenceIndex].participants[
          participantIndex
        ].muted = mute;
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
      const conferenceIndex = activeConferences.findIndex(
        (c) => c.friendlyName === friendlyName,
      );
      if (conferenceIndex < 0) {
        throw new Error("Conference not found");
      }

      const participantIndex = activeConferences[
        conferenceIndex
      ].participants.findIndex(
        (p) =>
          p.callSid === participantIdentifier ||
          p.participantSid === participantIdentifier,
      );

      if (participantIndex >= 0) {
        activeConferences[conferenceIndex].participants[participantIndex].hold =
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
      const conferenceIndex = activeConferences.findIndex(
        (c) => c.friendlyName === friendlyName,
      );
      if (conferenceIndex < 0) {
        throw new Error("Conference not found");
      }

      activeConferences[conferenceIndex].recordingEnabled = true;
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
      const conferenceIndex = activeConferences.findIndex(
        (c) => c.friendlyName === friendlyName,
      );
      if (conferenceIndex < 0) {
        throw new Error("Conference not found");
      }

      activeConferences[conferenceIndex].recordingEnabled = false;
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
      fetch: async () => {
        throw new Error("Use twilioService.getCallDetails instead");
      },
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
