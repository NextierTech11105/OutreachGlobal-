/**
 * TWILIO VOICE SERVICE (Server-Side)
 *
 * Real Twilio implementation for voice calls.
 * Used by sequences, power dialer, and call queue.
 *
 * Prerequisites:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
 */

import twilio from "twilio";
import type { Twilio } from "twilio";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface MakeCallOptions {
  to: string;
  from?: string;
  twimlUrl?: string;
  twiml?: string;
  statusCallback?: string;
  record?: boolean;
  machineDetection?: "Enable" | "DetectMessageEnd";
  asyncAmd?: boolean;
  timeout?: number;
  tags?: string[];
}

export interface CallResult {
  success: boolean;
  callSid?: string;
  status?: string;
  direction?: string;
  from?: string;
  to?: string;
  error?: string;
}

export interface TransferOptions {
  callSid: string;
  to: string;
  announceUrl?: string;
}

export interface DialerSession {
  id: string;
  leadIds: string[];
  currentIndex: number;
  status: "active" | "paused" | "completed";
  callsDialed: number;
  callsConnected: number;
  callsFailed: number;
  startedAt: Date;
  endedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// TWILIO VOICE SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class TwilioVoiceService {
  private static instance: TwilioVoiceService;
  private client: Twilio | null = null;
  private initialized = false;
  private dialerSessions: Map<string, DialerSession> = new Map();

  private constructor() {
    this.initialize();
  }

  private initialize(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      console.warn("[TwilioVoice] Credentials not configured");
      console.warn("  Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN");
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      this.initialized = true;
      console.log("[TwilioVoice] Initialized successfully");
    } catch (error) {
      console.error("[TwilioVoice] Failed to initialize:", error);
    }
  }

  public static getInstance(): TwilioVoiceService {
    if (!TwilioVoiceService.instance) {
      TwilioVoiceService.instance = new TwilioVoiceService();
    }
    return TwilioVoiceService.instance;
  }

  public isConfigured(): boolean {
    return this.initialized && this.client !== null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAKE OUTBOUND CALL
  // ─────────────────────────────────────────────────────────────────────────

  public async makeCall(options: MakeCallOptions): Promise<CallResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "Twilio not configured",
      };
    }

    const fromNumber = options.from || process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      return {
        success: false,
        error: "No from number configured",
      };
    }

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app";

      const callParams: any = {
        to: options.to,
        from: fromNumber,
        statusCallback: options.statusCallback || `${appUrl}/api/twilio/voice/status`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        statusCallbackMethod: "POST",
      };

      // Use TwiML URL or inline TwiML
      if (options.twimlUrl) {
        callParams.url = options.twimlUrl;
      } else if (options.twiml) {
        callParams.twiml = options.twiml;
      } else {
        // Default TwiML - connect to agent
        callParams.url = `${appUrl}/api/twilio/voice/connect`;
      }

      // Enable recording if requested
      if (options.record) {
        callParams.record = true;
        callParams.recordingStatusCallback = `${appUrl}/api/twilio/recording/status`;
      }

      // Machine detection
      if (options.machineDetection) {
        callParams.machineDetection = options.machineDetection;
        if (options.asyncAmd) {
          callParams.asyncAmd = "true";
          callParams.asyncAmdStatusCallback = `${appUrl}/api/twilio/voice/amd`;
        }
      }

      // Timeout
      if (options.timeout) {
        callParams.timeout = options.timeout;
      }

      const call = await this.client!.calls.create(callParams);

      console.log(`[TwilioVoice] Call initiated: ${call.sid}`);

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        direction: call.direction,
        from: call.from,
        to: call.to,
      };
    } catch (error) {
      console.error("[TwilioVoice] Make call error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Call failed",
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CALL MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  public async getCall(callSid: string): Promise<{
    success: boolean;
    call?: {
      sid: string;
      status: string;
      direction: string;
      from: string;
      to: string;
      duration: string;
      startTime?: Date;
      endTime?: Date;
    };
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return { success: false, error: "Twilio not configured" };
    }

    try {
      const call = await this.client!.calls(callSid).fetch();
      return {
        success: true,
        call: {
          sid: call.sid,
          status: call.status,
          direction: call.direction,
          from: call.from,
          to: call.to,
          duration: call.duration,
          startTime: call.startTime,
          endTime: call.endTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Fetch failed",
      };
    }
  }

  public async endCall(callSid: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: "Twilio not configured" };
    }

    try {
      await this.client!.calls(callSid).update({ status: "completed" });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "End call failed",
      };
    }
  }

  public async transferCall(options: TransferOptions): Promise<CallResult> {
    if (!this.isConfigured()) {
      return { success: false, error: "Twilio not configured" };
    }

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      const twiml = `
        <Response>
          ${options.announceUrl ? `<Play>${options.announceUrl}</Play>` : ""}
          <Dial>${options.to}</Dial>
        </Response>
      `.trim();

      await this.client!.calls(options.callSid).update({ twiml });

      return { success: true, callSid: options.callSid };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Transfer failed",
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POWER DIALER
  // ─────────────────────────────────────────────────────────────────────────

  public startDialerSession(
    leadIds: string[],
    sessionId?: string
  ): { success: boolean; sessionId: string } {
    const id = sessionId || `dialer_${Date.now()}`;

    const session: DialerSession = {
      id,
      leadIds,
      currentIndex: 0,
      status: "active",
      callsDialed: 0,
      callsConnected: 0,
      callsFailed: 0,
      startedAt: new Date(),
    };

    this.dialerSessions.set(id, session);
    console.log(`[TwilioVoice] Dialer session started: ${id} with ${leadIds.length} leads`);

    return { success: true, sessionId: id };
  }

  public getDialerSession(sessionId: string): DialerSession | undefined {
    return this.dialerSessions.get(sessionId);
  }

  public async dialNext(
    sessionId: string,
    getLeadPhone: (leadId: string) => Promise<string | null>
  ): Promise<{
    success: boolean;
    callSid?: string;
    leadId?: string;
    sessionComplete?: boolean;
    error?: string;
  }> {
    const session = this.dialerSessions.get(sessionId);
    if (!session) {
      return { success: false, error: "Session not found" };
    }

    if (session.status !== "active") {
      return { success: false, error: "Session is not active" };
    }

    if (session.currentIndex >= session.leadIds.length) {
      session.status = "completed";
      session.endedAt = new Date();
      return { success: true, sessionComplete: true };
    }

    const leadId = session.leadIds[session.currentIndex];
    const phone = await getLeadPhone(leadId);

    if (!phone) {
      // Skip this lead, move to next
      session.currentIndex++;
      return this.dialNext(sessionId, getLeadPhone);
    }

    session.callsDialed++;
    session.currentIndex++;

    const callResult = await this.makeCall({
      to: phone,
      machineDetection: "Enable",
      record: true,
      tags: [`dialer:${sessionId}`, `lead:${leadId}`],
    });

    if (callResult.success) {
      return {
        success: true,
        callSid: callResult.callSid,
        leadId,
      };
    } else {
      session.callsFailed++;
      return {
        success: false,
        leadId,
        error: callResult.error,
      };
    }
  }

  public pauseDialerSession(sessionId: string): boolean {
    const session = this.dialerSessions.get(sessionId);
    if (session && session.status === "active") {
      session.status = "paused";
      return true;
    }
    return false;
  }

  public resumeDialerSession(sessionId: string): boolean {
    const session = this.dialerSessions.get(sessionId);
    if (session && session.status === "paused") {
      session.status = "active";
      return true;
    }
    return false;
  }

  public endDialerSession(sessionId: string): boolean {
    const session = this.dialerSessions.get(sessionId);
    if (session) {
      session.status = "completed";
      session.endedAt = new Date();
      return true;
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RECORDINGS
  // ─────────────────────────────────────────────────────────────────────────

  public async getRecordings(callSid: string): Promise<{
    success: boolean;
    recordings?: Array<{
      sid: string;
      duration: string;
      status: string;
      url: string;
    }>;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return { success: false, error: "Twilio not configured" };
    }

    try {
      const recordings = await this.client!.recordings.list({ callSid, limit: 20 });
      return {
        success: true,
        recordings: recordings.map((r) => ({
          sid: r.sid,
          duration: r.duration,
          status: r.status,
          url: `https://api.twilio.com${r.uri.replace(".json", ".mp3")}`,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Fetch recordings failed",
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEND SMS (Fallback through Twilio)
  // ─────────────────────────────────────────────────────────────────────────

  public async sendSMS(to: string, body: string, from?: string): Promise<{
    success: boolean;
    messageSid?: string;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return { success: false, error: "Twilio not configured" };
    }

    const fromNumber = from || process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      return { success: false, error: "No from number configured" };
    }

    try {
      const message = await this.client!.messages.create({
        to,
        from: fromNumber,
        body,
      });

      return {
        success: true,
        messageSid: message.sid,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "SMS failed",
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VERIFY CREDENTIALS
  // ─────────────────────────────────────────────────────────────────────────

  public async verifyCredentials(): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: "Client not initialized" };
    }

    try {
      // Try to fetch account info to verify credentials
      await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }
}

// Export singleton instance
export const twilioVoiceService = TwilioVoiceService.getInstance();
