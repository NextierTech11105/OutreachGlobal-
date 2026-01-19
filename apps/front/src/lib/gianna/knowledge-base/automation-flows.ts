// Gianna Automation Flows
// Triggered actions based on conversation events

export const AUTOMATION_FLOWS = {
  // When email is captured via SMS → Auto email with valuation report + calendar
  emailCaptured: {
    trigger: "email_extracted_from_sms",
    description:
      "When prospect shares their email via SMS, auto-queue intro email with valuation report and calendar link",

    steps: [
      {
        step: 1,
        action: "extract_email",
        description: "Parse email from SMS response using regex",
      },
      {
        step: 2,
        action: "generate_valuation_report",
        description: "If property address is known, generate valuation report",
        endpoint: "/api/property/detail",
        params: { autoSkipTrace: true },
      },
      {
        step: 3,
        action: "save_to_research_library",
        description: "Save report to lead's folder in DO Spaces",
        endpoint: "/api/research-library",
      },
      {
        step: 4,
        action: "queue_email",
        description: "Queue intro email with report link + calendar",
        endpoint: "/api/schedule",
        template: "email_with_report_and_calendar",
      },
      {
        step: 5,
        action: "send_sms_confirmation",
        description: "Confirm email sent via SMS",
        template: "email_confirmation_sms",
      },
    ],

    templates: {
      email_with_report_and_calendar: {
        subject: "{firstName}, your property analysis is ready",
        body: `Hey {firstName},

Great chatting with you! As promised, here's that property analysis we talked about:

📊 **Your Property Report**
{reportLink}

I put together some numbers on {propertyAddress} - the valuation, market trends, and what I'm seeing in your area. Take a look and let me know what questions come up.

🗓️ **Book Your Strategy Session**
{calendarLink}

This is a quick 15-minute call where we dig into what the numbers mean for YOUR situation. No sales pitch, just straight talk about your options.

Spots fill up fast, so grab a time that works for you.

Talk soon,
Gianna
NexTier Business Advisors

P.S. - The best time to have this conversation is before you need to make a decision, not after. Just saying. 😉`,
      },

      email_confirmation_sms: `Perfect {firstName}! Just sent your property analysis to {email}. Check your inbox (and spam folder just in case). When you're ready to talk strategy, my calendar link is in there too. 📧`,
    },
  },

  // Calendar booked → Auto confirmation + prep email
  calendarBooked: {
    trigger: "calendar_appointment_created",
    description:
      "When prospect books via calendar, send confirmation and prep materials",

    steps: [
      {
        step: 1,
        action: "send_confirmation_sms",
        template: "appointment_confirmation_sms",
      },
      {
        step: 2,
        action: "send_confirmation_email",
        template: "appointment_confirmation_email",
      },
      {
        step: 3,
        action: "schedule_reminder",
        timing: "24h_before",
        template: "appointment_reminder",
      },
      {
        step: 4,
        action: "schedule_reminder",
        timing: "1h_before",
        template: "appointment_reminder_final",
      },
    ],

    templates: {
      appointment_confirmation_sms: `Locked in {firstName}! {date} at {time}. I'll call you at {phone}. Quick prep: think about where you want your business to be in 2 years. That's what we're solving for. Talk soon! - Gianna`,

      appointment_confirmation_email: {
        subject: "We're on for {date} - here's what to expect",
        body: `{firstName},

We're all set for {date} at {time}. Looking forward to it.

**What to expect:**
- 15 minutes, no fluff
- We'll look at YOUR specific business/property
- I'll show you exactly how AI applies to your situation
- You'll leave with a clear action plan (whether we work together or not)

**Quick prep:**
Think about these questions:
1. What's eating most of your time right now?
2. Where do you want to be in 2 years?
3. What's held you back from making changes before?

That's it. Come ready to think big.

Talk soon,
Gianna

P.S. - If something comes up, just reply to this email or text me. Life happens.`,
      },

      appointment_reminder: `Hey {firstName}, quick reminder - we're on for tomorrow at {time}. Got any questions before we chat? - Gianna`,

      appointment_reminder_final: `{firstName}, calling you in 1 hour! Make sure you're somewhere you can talk. This is gonna be good. 🚀`,
    },
  },

  // Voicemail received → Auto transcribe + analyze + respond
  voicemailReceived: {
    trigger: "voicemail_transcription_complete",
    description:
      "When voicemail is transcribed, analyze and trigger appropriate response",

    steps: [
      {
        step: 1,
        action: "analyze_voicemail",
        endpoint: "/api/ai/analyze-voicemail",
      },
      {
        step: 2,
        action: "route_by_intent",
        conditions: {
          interested: "queue_callback_priority_high",
          callback_request: "queue_callback_priority_high",
          question: "queue_callback_priority_medium",
          not_interested: "add_to_dnc",
          unknown: "queue_callback_priority_low",
        },
      },
      {
        step: 3,
        action: "send_notification",
        endpoint: "/api/notifications/send",
        priority_map: {
          interested: "high",
          callback_request: "high",
          question: "medium",
          not_interested: "low",
          unknown: "medium",
        },
      },
    ],
  },

  // SMS response received → Parse intent + auto respond
  smsResponseReceived: {
    trigger: "inbound_sms",
    description:
      "When prospect responds to SMS, parse intent and generate Gianna response",

    steps: [
      {
        step: 1,
        action: "check_opt_out",
        keywords: ["stop", "unsubscribe", "remove", "quit"],
        if_match: "add_to_dnc_and_confirm",
      },
      {
        step: 2,
        action: "extract_data",
        patterns: {
          email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
          phone: /\+?1?\d{10,}/,
          time_preference:
            /(morning|afternoon|evening|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday)/i,
          interest_signal:
            /(interested|curious|tell me more|yes|yeah|sure|sounds good)/i,
          objection:
            /(busy|not interested|no thanks|maybe later|too expensive)/i,
        },
      },
      {
        step: 3,
        action: "trigger_automation",
        conditions: {
          email_found: "emailCaptured",
          interest_signal: "generate_gianna_response_warm",
          objection: "generate_gianna_response_objection",
          time_preference: "suggest_calendar_slot",
        },
      },
      {
        step: 4,
        action: "generate_response",
        use_gianna_personality: true,
        context_from_conversation: true,
      },
    ],
  },
};

// Calendar integration settings
export const CALENDAR_CONFIG = {
  provider: "calendly", // or "cal.com", "acuity", "hubspot"
  link:
    process.env.CALENDAR_LINK || "https://calendly.com/tb-outreachglobal/15min",

  // Default meeting settings
  meeting: {
    title: "15-Min AI Strategy Session with Gianna",
    duration: 15,
    description: `Quick strategy call to see how AI can help your business.

What we'll cover:
- Your current challenges
- How AI applies to YOUR specific situation
- Clear next steps (whether we work together or not)

Come ready to think big.`,
    reminder_email: true,
    reminder_sms: true,
  },

  // Available slots (can be overridden by actual calendar)
  availability: {
    timezone: "America/New_York",
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    hours: { start: "09:00", end: "18:00" },
    buffer_minutes: 15,
    max_per_day: 8,
  },
};

// Email queue processor config
export const EMAIL_QUEUE_CONFIG = {
  provider: "sendgrid",
  from: {
    email: process.env.SENDGRID_FROM_EMAIL || "gianna@nextier.app",
    name: "Gianna | NexTier",
  },

  // Delay settings for natural feel
  delays: {
    after_email_capture: { min: 30, max: 120 }, // seconds
    follow_up_1: { hours: 24 },
    follow_up_2: { hours: 72 },
    follow_up_3: { hours: 168 }, // 1 week
  },

  // Subject line A/B testing
  subject_variants: {
    report_delivery: [
      "{firstName}, your property analysis is ready",
      "Here's what I found on {propertyAddress}",
      "{firstName} - the numbers are in",
      "Your free property report from Gianna",
    ],
    follow_up: [
      "Did you get a chance to look?",
      "{firstName}, quick follow up",
      "Still thinking about it?",
      "One more thing about {propertyAddress}...",
    ],
  },
};

// Function to process email capture trigger
export async function processEmailCapture(data: {
  email: string;
  phone: string;
  firstName?: string;
  propertyAddress?: string;
  conversationId?: string;
}): Promise<{
  success: boolean;
  reportId?: string;
  emailQueued?: boolean;
  calendarLink?: string;
}> {
  const { email, phone, firstName = "there", propertyAddress } = data;

  try {
    // Step 1: Generate valuation report if we have property address
    let reportId: string | undefined;
    let reportLink: string | undefined;

    if (propertyAddress) {
      const reportResponse = await fetch("/api/research-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveReport",
          name: propertyAddress,
          report: {
            property: { address: { address: propertyAddress } },
            generatedFor: { email, phone, firstName },
            generatedAt: new Date().toISOString(),
          },
        }),
      });

      const reportData = await reportResponse.json();
      if (reportData.success) {
        reportId = reportData.reportId;
        reportLink = reportData.shareableUrl;
      }
    }

    // Step 2: Queue the intro email
    const emailTemplate =
      AUTOMATION_FLOWS.emailCaptured.templates.email_with_report_and_calendar;
    const emailBody = emailTemplate.body
      .replace(/{firstName}/g, firstName)
      .replace(/{propertyAddress}/g, propertyAddress || "your property")
      .replace(/{reportLink}/g, reportLink || "[Report generating...]")
      .replace(/{calendarLink}/g, CALENDAR_CONFIG.link);

    const emailResponse = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "email",
        scheduledFor: new Date(Date.now() + 60000).toISOString(), // 1 min delay
        recipient: {
          email,
          name: firstName,
          phone,
          propertyAddress,
        },
        content: {
          subject: emailTemplate.subject.replace(/{firstName}/g, firstName),
          message: emailBody,
        },
      }),
    });

    const emailQueued = (await emailResponse.json()).success;

    // Step 3: Send SMS confirmation
    const smsTemplate =
      AUTOMATION_FLOWS.emailCaptured.templates.email_confirmation_sms
        .replace(/{firstName}/g, firstName)
        .replace(/{email}/g, email);

    await fetch("/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone,
        message: smsTemplate,
      }),
    });

    return {
      success: true,
      reportId,
      emailQueued,
      calendarLink: CALENDAR_CONFIG.link,
    };
  } catch (error) {
    console.error("[Automation] Email capture flow failed:", error);
    return { success: false };
  }
}

// Leslie Nielsen style humor - outrageous but deadpan
export const LESLIE_NIELSEN_HUMOR = {
  description:
    "Deadpan absurdist humor - says outrageous things completely straight-faced",

  examples: [
    {
      context: "Prospect says they don't care about AI",
      response:
        "That's what the dinosaurs said about asteroids. Look how that worked out. Anyway, about your business...",
    },
    {
      context: "Prospect is hesitating",
      response:
        "I once had a client who waited 6 months to call me back. He's fine now. Mostly. The point is, why risk it?",
    },
    {
      context: "Prospect asks if this is a sales call",
      response:
        "Sales call? No, no. This is a 'you're leaving money on the table and I'm trying to help you pick it up' call. Totally different.",
    },
    {
      context: "Prospect says they're too busy",
      response:
        "Busy is good. Busy means you've built something. But here's the thing - I talked to a guy last week who was SO busy he forgot to cash his own checks. Don't be that guy.",
    },
    {
      context: "Prospect mentions competitor",
      response:
        "Oh them? Great people. Love what they're doing. I mean, I wouldn't use them, but great people. Anyway, here's what actually works...",
    },
    {
      context: "Cold open",
      response:
        "Look, I know you're probably thinking 'who is this person and why should I care?' Great questions. Let me answer the second one first because the first one is less interesting.",
    },
    {
      context: "Follow up after no response",
      response:
        "Either you're incredibly busy, you've joined a monastery with no phones, or my last message was so good you're still thinking about it. All valid. Quick question though...",
    },
    {
      context: "Asking for the meeting",
      response:
        "Here's the deal - I'm offering you 15 minutes of my time for free. I know, I know, you're welcome. The question is: Tuesday or Thursday?",
    },
  ],

  // Temperature setting for Leslie Nielsen mode
  settings: {
    humor: 9, // Max absurdity
    aggression: 5, // Confident but not pushy
    condescension: 4, // Slight superiority, but lovable
    urgency: 6, // Creates FOMO through absurdity
    brevity: 6, // Punchy but with room for the joke
    warmth: 7, // Genuinely likeable despite the absurdity
  },
};

export default AUTOMATION_FLOWS;
