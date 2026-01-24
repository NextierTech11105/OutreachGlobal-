import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and } from "drizzle-orm";
import {
  leadsTable,
  messagesTable,
  teamsTable,
} from "@/database/schema-alias";
import { ConfigService } from "@nestjs/config";
import { SignalHouseService } from "@/lib/signalhouse/signalhouse.service";
import { ResponseGeneratorService } from "./response-generator.service";
import { v4 as uuidv4 } from "uuid";
import { MessageType, MessageDirection } from "@nextier/common";

// Objection types matching SABRINA's system
export enum ObjectionType {
  TOO_BUSY = "too_busy",
  NOT_INTERESTED = "not_interested",
  NEED_TO_THINK = "need_to_think",
  BAD_TIMING = "bad_timing",
  ALREADY_HAVE = "already_have",
  TOO_EXPENSIVE = "too_expensive",
  SPOUSE_DECISION = "spouse_decision",
  POSITIVE = "positive",
  BOOKING_CONSENT = "booking_consent",
  UNKNOWN = "unknown",
}

// Response intent after classification
export enum ResponseIntent {
  SEND_REBUTTAL = "send_rebuttal",
  SEND_CALENDAR = "send_calendar",
  ESCALATE_HUMAN = "escalate_human",
  OPT_OUT = "opt_out",
  CONTINUE_NURTURE = "continue_nurture",
}

interface ClassificationResult {
  objectionType: ObjectionType;
  confidence: number;
  intent: ResponseIntent;
  shouldAutoRespond: boolean;
}

export interface AutoRespondResult {
  success: boolean;
  messageId?: string;
  response?: string;
  intent: ResponseIntent;
  objectionType: ObjectionType;
  sentCalendarLink: boolean;
  error?: string;
}

// Rebuttal templates - conversational, human-like
const REBUTTAL_TEMPLATES: Record<ObjectionType, string[]> = {
  [ObjectionType.TOO_BUSY]: [
    "No worries at all! Just curious - is it timing, or did I miss something about what you're looking for?",
    "Totally get it - you're slammed. Would a quick 15-min call next week work better? I can send you a link to grab a time.",
    "I hear you! What if I just sent over a calendar link and you pick whenever works? Zero pressure.",
  ],
  [ObjectionType.NOT_INTERESTED]: [
    "Fair enough! Mind if I ask - was it something specific, or just not the right fit?",
    "Got it. If anything changes, I'm here. Quick question though - what would make it interesting?",
  ],
  [ObjectionType.NEED_TO_THINK]: [
    "Of course! Take your time. Would it help to hop on a quick call to answer any questions while it's fresh?",
    "Totally understand. What's the main thing you're weighing? Maybe I can help clarify.",
    "No rush at all. Want me to send a calendar link so you can book time when you're ready?",
  ],
  [ObjectionType.BAD_TIMING]: [
    "No problem! When would be a better time to revisit this?",
    "Understood. Want me to send you a link to book a time that works better for your schedule?",
  ],
  [ObjectionType.ALREADY_HAVE]: [
    "Nice! How's that working out for you? Always curious what's out there.",
    "Got it - if you ever want a second opinion or to compare, I'm happy to chat. No sales pitch, just info.",
  ],
  [ObjectionType.TOO_EXPENSIVE]: [
    "I hear you on budget. Would it help to see what ROI others have gotten? Sometimes the numbers tell a different story.",
    "Totally fair. What if we hopped on a quick call to see if there's a way to make it work? No commitment.",
  ],
  [ObjectionType.SPOUSE_DECISION]: [
    "Makes sense! Would it help if I sent some info you could share with them?",
    "Totally get it. Want to loop them in on a quick call together? I can send a calendar link.",
  ],
  [ObjectionType.POSITIVE]: [
    "Awesome! Let's get something on the calendar. Here's a link to grab 15 minutes: {calendarLink}",
    "Great to hear! Want to hop on a quick call this week? Here's my calendar: {calendarLink}",
  ],
  [ObjectionType.BOOKING_CONSENT]: [
    "Perfect! Here you go: {calendarLink} - pick any time that works for you 👍",
  ],
  [ObjectionType.UNKNOWN]: [
    "Thanks for getting back! Would love to chat more - want me to send a calendar link?",
  ],
};

// Keywords for classification
const OBJECTION_KEYWORDS: Record<ObjectionType, string[]> = {
  [ObjectionType.TOO_BUSY]: ["busy", "swamped", "no time", "hectic", "slammed", "crazy week"],
  [ObjectionType.NOT_INTERESTED]: ["not interested", "no thanks", "pass", "don't need", "not for me"],
  [ObjectionType.NEED_TO_THINK]: ["think about", "consider", "decide", "sleep on", "mull over", "get back to you"],
  [ObjectionType.BAD_TIMING]: ["bad time", "not now", "later", "wrong time", "next month", "next quarter"],
  [ObjectionType.ALREADY_HAVE]: ["already have", "working with", "got someone", "using", "have a guy"],
  [ObjectionType.TOO_EXPENSIVE]: ["expensive", "cost", "afford", "budget", "price", "money"],
  [ObjectionType.SPOUSE_DECISION]: ["spouse", "wife", "husband", "partner", "together", "we need to"],
  [ObjectionType.POSITIVE]: ["yes", "interested", "sure", "sounds good", "tell me more", "let's do it", "I'm in"],
  [ObjectionType.BOOKING_CONSENT]: ["ok", "okay", "sure", "yes", "send it", "sounds good", "go ahead", "please do"],
  [ObjectionType.UNKNOWN]: [],
};

// Opt-out keywords - never auto-respond, immediately comply
const OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "remove", "opt out", "do not contact", "leave me alone"];

@Injectable()
export class AutoRespondService {
  private readonly logger = new Logger(AutoRespondService.name);
  private readonly calendarLink: string;

  constructor(
    @InjectDB() private db: DrizzleClient,
    private configService: ConfigService,
    private signalHouse: SignalHouseService,
    private responseGenerator: ResponseGeneratorService,
  ) {
    // Get calendar link from env - supports Google Calendar or Calendly
    this.calendarLink =
      this.configService.get("BOOKING_15MIN_LINK") ||
      this.configService.get("CALENDLY_LINK") ||
      this.configService.get("GOOGLE_CALENDAR_LINK") ||
      "";
  }

  /**
   * Process inbound message and auto-respond if appropriate
   */
  async processAndRespond(
    teamId: string,
    fromPhone: string,
    toPhone: string,
    message: string,
    leadId?: string,
  ): Promise<AutoRespondResult> {
    this.logger.log(`Processing auto-respond for ${fromPhone}: "${message.substring(0, 50)}..."`);

    // 1. Classify the message
    const classification = this.classifyMessage(message);
    this.logger.log(`Classification: ${classification.objectionType} (${classification.confidence}%) -> ${classification.intent}`);

    // 2. Check if we should auto-respond
    if (!classification.shouldAutoRespond) {
      return {
        success: true,
        intent: classification.intent,
        objectionType: classification.objectionType,
        sentCalendarLink: false,
        error: classification.intent === ResponseIntent.OPT_OUT
          ? "Opt-out detected - compliance required"
          : "Requires human review",
      };
    }

    // 3. Get response based on classification
    const response = this.getResponse(classification, message);

    // 4. Check if this response includes calendar link
    const sentCalendarLink = response.includes(this.calendarLink) ||
      classification.objectionType === ObjectionType.BOOKING_CONSENT ||
      classification.objectionType === ObjectionType.POSITIVE;

    // 5. Get phone config for sending
    const phoneConfig = await this.responseGenerator.getPhoneConfig(toPhone);
    if (!phoneConfig) {
      return {
        success: false,
        intent: classification.intent,
        objectionType: classification.objectionType,
        sentCalendarLink: false,
        error: `No phone config for ${toPhone}`,
      };
    }

    // 6. Add human-like delay (3-5 minutes simulated by queue delay)
    const delaySeconds = Math.floor(Math.random() * 120) + 180; // 3-5 min

    // 7. Send via SignalHouse
    const result = await this.signalHouse.sendSms({
      to: fromPhone,
      from: toPhone,
      message: response,
    });

    if (!result.success) {
      return {
        success: false,
        intent: classification.intent,
        objectionType: classification.objectionType,
        sentCalendarLink: false,
        error: result.error,
      };
    }

    // 8. Log the message
    await this.logMessage(teamId, fromPhone, toPhone, response, leadId, classification);

    this.logger.log(`Auto-responded to ${fromPhone}: "${response.substring(0, 50)}..."`);

    return {
      success: true,
      messageId: result.messageId,
      response,
      intent: classification.intent,
      objectionType: classification.objectionType,
      sentCalendarLink,
    };
  }

  /**
   * Classify inbound message
   */
  private classifyMessage(message: string): ClassificationResult {
    const lowerMessage = message.toLowerCase();

    // Check for opt-out first - highest priority
    if (OPT_OUT_KEYWORDS.some(kw => lowerMessage.includes(kw))) {
      return {
        objectionType: ObjectionType.UNKNOWN,
        confidence: 95,
        intent: ResponseIntent.OPT_OUT,
        shouldAutoRespond: false,
      };
    }

    // Check for booking consent (after we've offered a calendar link)
    if (OBJECTION_KEYWORDS[ObjectionType.BOOKING_CONSENT].some(kw => lowerMessage.includes(kw))) {
      // Short affirmative responses likely mean consent to send calendar
      if (message.length < 30) {
        return {
          objectionType: ObjectionType.BOOKING_CONSENT,
          confidence: 85,
          intent: ResponseIntent.SEND_CALENDAR,
          shouldAutoRespond: true,
        };
      }
    }

    // Check for positive/interested
    if (OBJECTION_KEYWORDS[ObjectionType.POSITIVE].some(kw => lowerMessage.includes(kw))) {
      return {
        objectionType: ObjectionType.POSITIVE,
        confidence: 80,
        intent: ResponseIntent.SEND_CALENDAR,
        shouldAutoRespond: true,
      };
    }

    // Check each objection type
    for (const [type, keywords] of Object.entries(OBJECTION_KEYWORDS)) {
      if (type === ObjectionType.POSITIVE || type === ObjectionType.BOOKING_CONSENT || type === ObjectionType.UNKNOWN) {
        continue;
      }

      const matches = keywords.filter(kw => lowerMessage.includes(kw));
      if (matches.length > 0) {
        const confidence = Math.min(90, 60 + matches.length * 10);
        return {
          objectionType: type as ObjectionType,
          confidence,
          intent: ResponseIntent.SEND_REBUTTAL,
          shouldAutoRespond: confidence >= 70,
        };
      }
    }

    // Unknown - escalate to human
    return {
      objectionType: ObjectionType.UNKNOWN,
      confidence: 40,
      intent: ResponseIntent.ESCALATE_HUMAN,
      shouldAutoRespond: false,
    };
  }

  /**
   * Get response based on classification
   */
  private getResponse(classification: ClassificationResult, originalMessage: string): string {
    const templates = REBUTTAL_TEMPLATES[classification.objectionType];

    // Rotate through templates
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Replace calendar link placeholder
    return template.replace("{calendarLink}", this.calendarLink);
  }

  /**
   * Check if message indicates consent to receive calendar link
   */
  detectBookingConsent(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim();

    // Short affirmative responses
    const consentPhrases = [
      "ok", "okay", "sure", "yes", "yeah", "yep", "yup",
      "send it", "sounds good", "go ahead", "please", "please do",
      "that works", "perfect", "great", "cool", "fine",
    ];

    // Check if it's a short consent-like response
    if (message.length < 30) {
      return consentPhrases.some(phrase => lowerMessage.includes(phrase));
    }

    return false;
  }

  /**
   * Log outbound message to database
   */
  private async logMessage(
    teamId: string,
    toPhone: string,
    fromPhone: string,
    body: string,
    leadId: string | undefined,
    classification: ClassificationResult,
  ): Promise<void> {
    try {
      await this.db.insert(messagesTable).values({
        teamId,
        leadId: leadId || null,
        type: MessageType.SMS,
        direction: MessageDirection.OUTBOUND,
        status: "SENT",
        toAddress: toPhone,
        fromAddress: fromPhone,
        body,
        metadata: {
          autoRespond: true,
          objectionType: classification.objectionType,
          intent: classification.intent,
          confidence: classification.confidence,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log message: ${error}`);
      // Non-fatal - continue even if logging fails
    }
  }

  /**
   * Get calendar link for team
   * Returns default calendar link (per-team links can be added via env vars)
   */
  async getCalendarLink(_teamId: string): Promise<string> {
    // Future: could store per-team calendar links in team settings
    return this.calendarLink;
  }
}
