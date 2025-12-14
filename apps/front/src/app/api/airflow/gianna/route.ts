/**
 * Airflow Gianna AI API Routes
 * Called by gianna_escalation_dag.py for message generation
 */

import { NextRequest, NextResponse } from "next/server";

// Gianna escalation message templates by step
const ESCALATION_TEMPLATES: Record<number, string[]> = {
  1: [
    "Hi {name}, this is Gianna from Outreach Global. I noticed you own {company} at {address}. Are you open to exploring opportunities to grow or sell your business?",
    "Hey {name}! I'm Gianna, reaching out about {company}. Business owners in your area have been seeing great results. Mind if I share some info?",
  ],
  2: [
    "Hi {name}, following up on my earlier message. I work with business owners like yourself to connect them with qualified buyers and growth opportunities. 2 min to chat?",
    "{name}, just checking in - I know you're busy running {company}. Quick question: have you thought about your exit strategy?",
  ],
  3: [
    "{name}, I've helped several businesses in your industry recently. One owner walked away with 3x what they expected. Would you be interested in a free valuation?",
    "Hi {name}! Third time reaching out - I promise this is valuable. We have buyers actively looking in your area. Interested in hearing more?",
  ],
  4: [
    "{name}, I respect you're busy. Here's the quick pitch: free business valuation, no strings attached. If it's not for you, no worries. Interested?",
    "Hey {name}, Gianna here again. I'll keep this short - do you have 5 minutes this week to discuss options for {company}?",
  ],
  5: [
    "{name}, halfway through my follow-ups. I typically only reach out this many times when I genuinely see potential. Let's connect?",
    "Hi {name}! I've been researching {company} and I think there's real opportunity here. Can we schedule a brief call?",
  ],
  6: [
    "{name}, still interested in connecting. I work on commission - meaning I only succeed when you do. That's why I'm persistent. 10 min call?",
    "Hey {name}, I've got some market data specific to businesses like {company}. Think you'd find it valuable. Want me to send it over?",
  ],
  7: [
    "{name}, I know timing is everything in business. When would be a better time to reconnect about {company}?",
    "Hi {name}! Just checking if you received my previous messages. I'm here when you're ready to talk about your options.",
  ],
  8: [
    "{name}, I'll be wrapping up my outreach soon. Before I do, I wanted to make sure you know about the buyers interested in your area.",
    "Hey {name}, Gianna here. I've helped owners like you find the right opportunities. Would hate for you to miss out. Last few attempts - interested?",
  ],
  9: [
    "{name}, second to last message from me. If you're ever curious about what {company} could be worth, I'm here. Just reply 'valuation'.",
    "Hi {name}! Almost done reaching out. Quick yes or no - would you ever consider selling {company} for the right price?",
  ],
  10: [
    "{name}, final follow-up from Gianna. If you ever want to chat about {company}, my door's always open. Wishing you continued success!",
    "Hey {name}, this is my last message. I wish you all the best with {company}. If things change, you know where to find me. Take care!",
  ],
};

interface GiannaContext {
  lead_id: string;
  name: string;
  company?: string;
  property_address?: string;
  escalation_step: number;
  previous_messages?: string[];
  last_response?: string;
}

// POST /api/airflow/gianna
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "generate";
    const body = await request.json();

    switch (action) {
      case "generate":
        return handleGenerate(body);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Airflow Gianna] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleGenerate(body: { context: GiannaContext; step: number }) {
  const { context, step } = body;

  if (!context || !step) {
    return NextResponse.json(
      { error: "Context and step required" },
      { status: 400 }
    );
  }

  // Get templates for this step
  const templates = ESCALATION_TEMPLATES[step] || ESCALATION_TEMPLATES[10];

  // Pick a random template
  const template = templates[Math.floor(Math.random() * templates.length)];

  // Personalize the message
  let message = template
    .replace(/{name}/g, context.name || "there")
    .replace(/{company}/g, context.company || "your business")
    .replace(/{address}/g, context.property_address || "your location");

  // If there was a previous response, acknowledge it
  if (context.last_response && step > 1) {
    const acknowledgments = [
      "Thanks for getting back to me! ",
      "Appreciate the response. ",
      "Good to hear from you! ",
    ];
    const ack = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];

    // For positive responses, adjust message
    const positiveKeywords = ["yes", "interested", "tell me more", "sure", "okay"];
    const isPositive = positiveKeywords.some((kw) =>
      context.last_response?.toLowerCase().includes(kw)
    );

    if (isPositive) {
      message = `${ack}I'd love to tell you more about what we can offer. When's a good time for a quick 10-minute call?`;
    }
  }

  console.log(`[Airflow Gianna] Generated step ${step} message for ${context.name}`);

  return NextResponse.json({
    message,
    step,
    lead_id: context.lead_id,
    generated_at: new Date().toISOString(),
  });
}
