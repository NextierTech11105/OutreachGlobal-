import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";

// Content Library Categories from OutreachGlobal
export interface ContentCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompts?: ContentPrompt[];
  subcategories?: ContentCategory[];
}

export interface ContentPrompt {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  variables?: string[]; // Placeholders like {firstName}, {companyName}, etc.
  channel?: "sms" | "email" | "voice" | "social" | "all";
  category: string;
}

// OutreachGlobal Content Library Structure
const CONTENT_LIBRARY: ContentCategory[] = [
  {
    id: "buyer_persona",
    name: "Buyer Persona",
    description:
      "Build the perfect buyer persona and generate content that speaks directly to your ideal client",
    icon: "👤",
    prompts: [
      {
        id: "bp_ideal_client",
        name: "Ideal Client Profile",
        prompt:
          "Create a detailed buyer persona for {industry} targeting {targetMarket}. Include demographics, pain points, goals, objections, and preferred communication channels.",
        variables: ["industry", "targetMarket"],
        channel: "all",
        category: "buyer_persona",
      },
      {
        id: "bp_pain_points",
        name: "Pain Point Discovery",
        prompt:
          "Identify the top 5 pain points for {targetMarket} in the {industry} industry. For each pain point, provide: the problem, emotional impact, and how our {product} solves it.",
        variables: ["targetMarket", "industry", "product"],
        channel: "all",
        category: "buyer_persona",
      },
      {
        id: "bp_objection_handling",
        name: "Objection Handling Script",
        prompt:
          "Generate responses to common objections from {targetMarket} about {product}. Include: the objection, empathy statement, reframe, and value proposition.",
        variables: ["targetMarket", "product"],
        channel: "voice",
        category: "buyer_persona",
      },
    ],
  },
  {
    id: "emails",
    name: "Email Sequences",
    description:
      "Professional email templates and sequences for outreach campaigns",
    icon: "📧",
    prompts: [
      {
        id: "email_cold_intro",
        name: "Cold Outreach - Introduction",
        prompt:
          "Write a cold email introducing {companyName} to {recipientName} at {recipientCompany}. Mention their recent {trigger} and how we can help with {painPoint}. Keep it under 100 words, conversational, and end with a soft CTA.",
        variables: [
          "companyName",
          "recipientName",
          "recipientCompany",
          "trigger",
          "painPoint",
        ],
        channel: "email",
        category: "emails",
      },
      {
        id: "email_followup_1",
        name: "Follow-up #1 - Value Add",
        prompt:
          "Write a follow-up email to {recipientName} who hasn't responded to our initial outreach. Reference our previous email about {topic}, share a relevant insight about {industry}, and offer a free {resource}.",
        variables: ["recipientName", "topic", "industry", "resource"],
        channel: "email",
        category: "emails",
      },
      {
        id: "email_followup_2",
        name: "Follow-up #2 - Social Proof",
        prompt:
          "Write a second follow-up to {recipientName} highlighting how {similarCompany} achieved {result} using our solution. Be brief and include a simple yes/no question.",
        variables: ["recipientName", "similarCompany", "result"],
        channel: "email",
        category: "emails",
      },
      {
        id: "email_breakup",
        name: "Breakup Email",
        prompt:
          "Write a final 'breakup' email to {recipientName}. Be respectful, acknowledge they're busy, leave the door open, and mention we'll reach out in {timeframe} if anything changes.",
        variables: ["recipientName", "timeframe"],
        channel: "email",
        category: "emails",
      },
      {
        id: "email_referral_ask",
        name: "Referral Request",
        prompt:
          "Write an email asking {recipientName} for a referral to the right person at {targetCompany} regarding {topic}. Be polite and make it easy for them to forward.",
        variables: ["recipientName", "targetCompany", "topic"],
        channel: "email",
        category: "emails",
      },
    ],
  },
  {
    id: "sms",
    name: "SMS Templates",
    description: "Short, punchy SMS messages for mobile outreach",
    icon: "💬",
    prompts: [
      {
        id: "sms_intro",
        name: "Initial SMS - Warm Intro",
        prompt:
          "Write a friendly first SMS to {firstName} about their property at {address}. Mention we're {companyName} and we help homeowners {valueProposition}. Under 160 characters. Include opt-out.",
        variables: ["firstName", "address", "companyName", "valueProposition"],
        channel: "sms",
        category: "sms",
      },
      {
        id: "sms_b2b_intro",
        name: "B2B SMS Introduction",
        prompt:
          "Write a brief SMS to {firstName} at {companyName} about how we helped {similarCompany} with {result}. Casual tone, under 160 chars.",
        variables: ["firstName", "companyName", "similarCompany", "result"],
        channel: "sms",
        category: "sms",
      },
      {
        id: "sms_followup",
        name: "SMS Follow-up",
        prompt:
          "Write a follow-up SMS to {firstName} who didn't respond. Reference the property at {address} and ask a simple yes/no question about {topic}.",
        variables: ["firstName", "address", "topic"],
        channel: "sms",
        category: "sms",
      },
      {
        id: "sms_appointment_confirm",
        name: "Appointment Confirmation",
        prompt:
          "Write an SMS confirming {firstName}'s appointment for {date} at {time}. Include address {address} and ask them to reply YES to confirm.",
        variables: ["firstName", "date", "time", "address"],
        channel: "sms",
        category: "sms",
      },
      {
        id: "sms_value_offer",
        name: "Value Offer SMS",
        prompt:
          "Write an SMS to {firstName} offering a free {offer} for their property at {address}. Create urgency with {deadline}. Under 160 chars.",
        variables: ["firstName", "offer", "address", "deadline"],
        channel: "sms",
        category: "sms",
      },
    ],
  },
  {
    id: "voice",
    name: "Voice Scripts",
    description: "Call scripts for phone outreach and voicemails",
    icon: "📞",
    prompts: [
      {
        id: "voice_cold_call",
        name: "Cold Call Opening",
        prompt:
          "Write a 15-second cold call opening for reaching {firstName} about their property at {address}. Introduce yourself as {agentName} from {companyName}, mention why you're calling (we help {valueProposition}), and ask permission to continue.",
        variables: [
          "firstName",
          "address",
          "agentName",
          "companyName",
          "valueProposition",
        ],
        channel: "voice",
        category: "voice",
      },
      {
        id: "voice_voicemail",
        name: "Voicemail Script",
        prompt:
          "Write a 20-second voicemail for {firstName} about their property at {address}. Be friendly, mention {companyName}, state one clear benefit, and include callback number {phoneNumber}.",
        variables: ["firstName", "address", "companyName", "phoneNumber"],
        channel: "voice",
        category: "voice",
      },
      {
        id: "voice_gatekeeper",
        name: "Gatekeeper Script",
        prompt:
          "Write a script for getting past a gatekeeper to reach {decisionMaker} at {companyName} regarding {topic}. Be professional but confident.",
        variables: ["decisionMaker", "companyName", "topic"],
        channel: "voice",
        category: "voice",
      },
      {
        id: "voice_objection_price",
        name: "Price Objection Response",
        prompt:
          "Write a response to 'that's too expensive' objection for {product}. Acknowledge concern, ask discovery question about their budget, and pivot to value/ROI.",
        variables: ["product"],
        channel: "voice",
        category: "voice",
      },
    ],
  },
  {
    id: "social",
    name: "Social Media",
    description:
      "Content for LinkedIn, Facebook, Instagram, TikTok, and YouTube",
    icon: "📱",
    subcategories: [
      {
        id: "linkedin",
        name: "LinkedIn",
        description: "Professional content for LinkedIn",
        icon: "💼",
        prompts: [
          {
            id: "li_connection_request",
            name: "Connection Request Message",
            prompt:
              "Write a LinkedIn connection request to {recipientName}, {recipientTitle} at {recipientCompany}. Reference {commonGround} and mention interest in {topic}. Under 300 characters.",
            variables: [
              "recipientName",
              "recipientTitle",
              "recipientCompany",
              "commonGround",
              "topic",
            ],
            channel: "social",
            category: "linkedin",
          },
          {
            id: "li_post_thought_leadership",
            name: "Thought Leadership Post",
            prompt:
              "Write a LinkedIn post about {topic} in the {industry} industry. Include a hook, 3 key insights, and a question to drive engagement. Use line breaks for readability.",
            variables: ["topic", "industry"],
            channel: "social",
            category: "linkedin",
          },
          {
            id: "li_dm_after_connect",
            name: "DM After Connection",
            prompt:
              "Write a LinkedIn DM to {firstName} who just accepted your connection. Thank them, mention their work at {companyName}, and softly introduce how you help {targetMarket}.",
            variables: ["firstName", "companyName", "targetMarket"],
            channel: "social",
            category: "linkedin",
          },
        ],
      },
      {
        id: "facebook",
        name: "Facebook",
        description: "Content for Facebook marketing",
        icon: "👍",
        prompts: [
          {
            id: "fb_ad_copy",
            name: "Facebook Ad Copy",
            prompt:
              "Write Facebook ad copy targeting {targetMarket}. Problem: {painPoint}. Solution: {product}. Include hook, body, and CTA. Tone: {tone}.",
            variables: ["targetMarket", "painPoint", "product", "tone"],
            channel: "social",
            category: "facebook",
          },
          {
            id: "fb_group_post",
            name: "Facebook Group Post",
            prompt:
              "Write a value-driven post for a Facebook group about {topic}. Share {insight} and ask an engaging question. No direct selling.",
            variables: ["topic", "insight"],
            channel: "social",
            category: "facebook",
          },
        ],
      },
      {
        id: "instagram",
        name: "Instagram",
        description: "Visual-first content for Instagram",
        icon: "📸",
        prompts: [
          {
            id: "ig_caption",
            name: "Instagram Caption",
            prompt:
              "Write an Instagram caption for a post about {topic}. Include a hook, story/value, CTA, and 5-10 relevant hashtags. Tone: {tone}.",
            variables: ["topic", "tone"],
            channel: "social",
            category: "instagram",
          },
          {
            id: "ig_story_script",
            name: "Instagram Story Script",
            prompt:
              "Write a 3-slide Instagram story script about {topic}. Slide 1: Hook. Slide 2: Value. Slide 3: CTA with swipe-up or DM prompt.",
            variables: ["topic"],
            channel: "social",
            category: "instagram",
          },
        ],
      },
      {
        id: "tiktok",
        name: "TikTok",
        description: "Short-form video scripts for TikTok",
        icon: "🎵",
        prompts: [
          {
            id: "tt_hook_script",
            name: "TikTok Video Script",
            prompt:
              "Write a 30-second TikTok script about {topic} for {targetMarket}. Start with a scroll-stopping hook, deliver value quickly, and end with CTA. Casual tone.",
            variables: ["topic", "targetMarket"],
            channel: "social",
            category: "tiktok",
          },
        ],
      },
      {
        id: "youtube",
        name: "YouTube",
        description: "Long-form video content for YouTube",
        icon: "🎬",
        prompts: [
          {
            id: "yt_video_script",
            name: "YouTube Video Script Outline",
            prompt:
              "Create a YouTube video outline about {topic}. Include: hook (first 30s), intro, 3-5 main points with examples, CTA, and outro. Target length: {duration} minutes.",
            variables: ["topic", "duration"],
            channel: "social",
            category: "youtube",
          },
          {
            id: "yt_title_thumbnail",
            name: "YouTube Title & Thumbnail Ideas",
            prompt:
              "Generate 5 click-worthy YouTube titles and thumbnail concepts for a video about {topic}. Use curiosity gaps and power words.",
            variables: ["topic"],
            channel: "social",
            category: "youtube",
          },
        ],
      },
    ],
  },
  {
    id: "lead_magnets",
    name: "Lead Magnets",
    description: "Templates for creating valuable lead magnets",
    icon: "🧲",
    prompts: [
      {
        id: "lm_checklist",
        name: "Checklist Lead Magnet",
        prompt:
          "Create a checklist lead magnet titled '{title}' for {targetMarket}. Include 10-15 actionable items with brief explanations.",
        variables: ["title", "targetMarket"],
        channel: "all",
        category: "lead_magnets",
      },
      {
        id: "lm_guide",
        name: "Ultimate Guide Outline",
        prompt:
          "Create an outline for 'The Ultimate Guide to {topic}' targeting {targetMarket}. Include 5-7 chapters with key points for each.",
        variables: ["topic", "targetMarket"],
        channel: "all",
        category: "lead_magnets",
      },
      {
        id: "lm_calculator_copy",
        name: "Calculator/Tool Landing Page",
        prompt:
          "Write landing page copy for a free {toolType} calculator for {targetMarket}. Highlight the problem it solves and what they'll learn.",
        variables: ["toolType", "targetMarket"],
        channel: "all",
        category: "lead_magnets",
      },
    ],
  },
  {
    id: "buyer_journey",
    name: "Buyer Journey",
    description: "Content for each stage of the buyer journey",
    icon: "🎯",
    prompts: [
      {
        id: "bj_awareness",
        name: "Awareness Stage Content",
        prompt:
          "Write awareness-stage content for {targetMarket} who may not know they have a problem with {painPoint}. Educational, no selling.",
        variables: ["targetMarket", "painPoint"],
        channel: "all",
        category: "buyer_journey",
      },
      {
        id: "bj_consideration",
        name: "Consideration Stage Content",
        prompt:
          "Write consideration-stage content comparing solutions for {painPoint}. Position {product} as one option among alternatives. Be balanced.",
        variables: ["painPoint", "product"],
        channel: "all",
        category: "buyer_journey",
      },
      {
        id: "bj_decision",
        name: "Decision Stage Content",
        prompt:
          "Write decision-stage content for {targetMarket} ready to buy. Include social proof, ROI, and clear next steps for {product}.",
        variables: ["targetMarket", "product"],
        channel: "all",
        category: "buyer_journey",
      },
    ],
  },
  {
    id: "company_persona",
    name: "Company Persona",
    description: "Define your brand voice and positioning",
    icon: "🏢",
    prompts: [
      {
        id: "cp_brand_voice",
        name: "Brand Voice Guide",
        prompt:
          "Create a brand voice guide for {companyName} in the {industry} industry. Define: personality traits, tone, vocabulary to use/avoid, and example phrases.",
        variables: ["companyName", "industry"],
        channel: "all",
        category: "company_persona",
      },
      {
        id: "cp_value_prop",
        name: "Value Proposition",
        prompt:
          "Craft a value proposition for {companyName} that explains: who we help ({targetMarket}), what we do ({product}), and why we're different ({differentiator}).",
        variables: ["companyName", "targetMarket", "product", "differentiator"],
        channel: "all",
        category: "company_persona",
      },
      {
        id: "cp_elevator_pitch",
        name: "Elevator Pitch",
        prompt:
          "Write a 30-second elevator pitch for {companyName} targeting {targetMarket}. Include the problem, solution, proof, and ask.",
        variables: ["companyName", "targetMarket"],
        channel: "voice",
        category: "company_persona",
      },
    ],
  },
  {
    id: "refresh",
    name: "Content Refresh",
    description: "Rewrite and improve existing content",
    icon: "🔄",
    prompts: [
      {
        id: "rf_rewrite_email",
        name: "Rewrite Email",
        prompt:
          "Rewrite this email to be more {tone} and focused on {goal}: \n\n{originalContent}\n\nKeep the core message but improve engagement.",
        variables: ["tone", "goal", "originalContent"],
        channel: "email",
        category: "refresh",
      },
      {
        id: "rf_ab_test",
        name: "A/B Test Variations",
        prompt:
          "Create 3 A/B test variations of this {contentType}: \n\n{originalContent}\n\nTest: {variable}.",
        variables: ["contentType", "originalContent", "variable"],
        channel: "all",
        category: "refresh",
      },
      {
        id: "rf_repurpose",
        name: "Repurpose Content",
        prompt:
          "Take this {originalFormat} content and repurpose it for {targetFormat}: \n\n{originalContent}",
        variables: ["originalFormat", "targetFormat", "originalContent"],
        channel: "all",
        category: "refresh",
      },
    ],
  },
  {
    id: "real_estate",
    name: "Real Estate",
    description: "Specialized templates for property investors and agents",
    icon: "🏠",
    prompts: [
      {
        id: "re_motivated_seller_sms",
        name: "Motivated Seller SMS",
        prompt:
          "Write an SMS to {firstName} about their property at {address}. They're a {sellerType} (absentee/tired landlord/vacant/tax delinquent). Offer help, not pressure. Under 160 chars.",
        variables: ["firstName", "address", "sellerType"],
        channel: "sms",
        category: "real_estate",
      },
      {
        id: "re_cash_offer_email",
        name: "Cash Offer Email",
        prompt:
          "Write an email to {firstName} presenting a cash offer range of {lowOffer} - {highOffer} for their property at {address}. Explain benefits (fast close, as-is, no fees). Professional but warm.",
        variables: ["firstName", "lowOffer", "highOffer", "address"],
        channel: "email",
        category: "real_estate",
      },
      {
        id: "re_valuation_share",
        name: "Valuation Report Share",
        prompt:
          "Write a message to share a property valuation report with {firstName} for {address}. Estimated value: {estimatedValue}. Include link {reportUrl} and offer to discuss.",
        variables: ["firstName", "address", "estimatedValue", "reportUrl"],
        channel: "sms",
        category: "real_estate",
      },
      {
        id: "re_follow_up_driving",
        name: "Driving for Dollars Follow-up",
        prompt:
          "Write a follow-up to {firstName} whose property at {address} was identified as distressed. Reference specific observation (boarded windows, overgrown yard, etc). Offer cash purchase.",
        variables: ["firstName", "address"],
        channel: "sms",
        category: "real_estate",
      },
    ],
  },
  {
    id: "b2b",
    name: "B2B Outreach",
    description: "Templates for business-to-business outreach",
    icon: "💼",
    prompts: [
      {
        id: "b2b_sdr_email",
        name: "SDR Cold Email",
        prompt:
          "Write a cold email from an SDR to {recipientName}, {recipientTitle} at {companyName}. We noticed {trigger}. Our solution helps with {valueProposition}. Ask for 15 minutes.",
        variables: [
          "recipientName",
          "recipientTitle",
          "companyName",
          "trigger",
          "valueProposition",
        ],
        channel: "email",
        category: "b2b",
      },
      {
        id: "b2b_meeting_request",
        name: "Meeting Request",
        prompt:
          "Write a brief email requesting a meeting with {recipientName} to discuss {topic}. Mention we work with {similarCompany} and achieved {result}. Propose 2-3 time slots.",
        variables: ["recipientName", "topic", "similarCompany", "result"],
        channel: "email",
        category: "b2b",
      },
      {
        id: "b2b_referral",
        name: "Internal Referral Request",
        prompt:
          "Write an email asking {recipientName} to refer us to the right person at {companyName} regarding {topic}. Make it easy to forward.",
        variables: ["recipientName", "companyName", "topic"],
        channel: "email",
        category: "b2b",
      },
    ],
  },
];

// Flatten all prompts for easy searching
function flattenPrompts(categories: ContentCategory[]): ContentPrompt[] {
  const prompts: ContentPrompt[] = [];
  for (const cat of categories) {
    // Only push if prompts exists and is iterable
    if (cat.prompts && Array.isArray(cat.prompts)) {
      prompts.push(...cat.prompts);
    }
    if (cat.subcategories) {
      prompts.push(...flattenPrompts(cat.subcategories));
    }
  }
  return prompts;
}

const ALL_PROMPTS = flattenPrompts(CONTENT_LIBRARY);

// GET - Fetch content library
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const channel = searchParams.get("channel");
    const search = searchParams.get("search");
    const promptId = searchParams.get("id");

    // Get single prompt by ID
    if (promptId) {
      const prompt = ALL_PROMPTS.find((p) => p.id === promptId);
      if (!prompt) {
        return NextResponse.json(
          { error: "Prompt not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ prompt });
    }

    // Filter prompts
    let results = ALL_PROMPTS;

    if (category) {
      results = results.filter((p) => p.category === category);
    }

    if (channel && channel !== "all") {
      results = results.filter(
        (p) => p.channel === channel || p.channel === "all",
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.prompt.toLowerCase().includes(searchLower) ||
          p.category.toLowerCase().includes(searchLower),
      );
    }

    return NextResponse.json({
      categories: CONTENT_LIBRARY,
      prompts: results,
      total: results.length,
    });
  } catch (error) {
    console.error("[Content Library] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch content library" },
      { status: 500 },
    );
  }
}

// POST - Generate content from a prompt template
export async function POST(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { promptId, variables, customPrompt } = body;

    // Get the prompt template
    let promptTemplate: string;
    let promptName: string;

    if (promptId) {
      const prompt = ALL_PROMPTS.find((p) => p.id === promptId);
      if (!prompt) {
        return NextResponse.json(
          { error: "Prompt not found" },
          { status: 404 },
        );
      }
      promptTemplate = prompt.prompt;
      promptName = prompt.name;
    } else if (customPrompt) {
      promptTemplate = customPrompt;
      promptName = "Custom Prompt";
    } else {
      return NextResponse.json(
        { error: "promptId or customPrompt required" },
        { status: 400 },
      );
    }

    // Replace variables in the template
    let filledPrompt = promptTemplate;
    if (variables && typeof variables === "object") {
      for (const [key, value] of Object.entries(variables)) {
        filledPrompt = filledPrompt.replace(
          new RegExp(`\\{${key}\\}`, "g"),
          String(value),
        );
      }
    }

    // Check for unfilled variables
    const unfilledVars = filledPrompt.match(/\{(\w+)\}/g);
    if (unfilledVars && unfilledVars.length > 0) {
      return NextResponse.json(
        {
          error: "Missing required variables",
          missingVariables: unfilledVars.map((v) => v.replace(/[{}]/g, "")),
          template: promptTemplate,
          filledPrompt,
        },
        { status: 400 },
      );
    }

    // Generate content using OpenAI
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      // Return the filled prompt without AI generation
      return NextResponse.json({
        success: true,
        promptName,
        filledPrompt,
        generatedContent: null,
        note: "AI generation unavailable - returning filled template",
      });
    }

    const aiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an expert copywriter and marketing specialist. Generate high-quality, engaging content based on the user's request. Be concise and actionable.",
            },
            {
              role: "user",
              content: filledPrompt,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      },
    );

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error("[Content Library] AI error:", error);
      return NextResponse.json({
        success: true,
        promptName,
        filledPrompt,
        generatedContent: null,
        note: "AI generation failed - returning filled template",
      });
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content;

    return NextResponse.json({
      success: true,
      promptName,
      filledPrompt,
      generatedContent,
      usage: aiData.usage,
    });
  } catch (error) {
    console.error("[Content Library] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 },
    );
  }
}
