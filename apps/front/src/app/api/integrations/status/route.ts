import { NextResponse } from "next/server";

/**
 * GET /api/integrations/status
 *
 * Returns real-time status of all integrations based on env vars
 */
export async function GET() {
  // Check each integration's configuration
  const status = {
    // SignalHouse - SMS/MMS
    signalhouse: !!(
      process.env.SIGNALHOUSE_API_KEY && process.env.SIGNALHOUSE_AUTH_TOKEN
    ),

    // Apollo.io - B2B enrichment
    apollo: !!(
      process.env.APOLLO_IO_API_KEY ||
      process.env.NEXT_PUBLIC_APOLLO_IO_API_KEY ||
      process.env.APOLLO_API_KEY
    ),

    // Twilio - Voice & Phone lookup
    twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),

    // Real Estate API - Property data & skip tracing
    realestate: !!(
      process.env.REALESTATE_API_KEY || process.env.REAL_ESTATE_API_TOKEN
    ),

    // USBizData - B2B business listings
    usbizdata: !!process.env.BUSINESS_LIST_API_URL,

    // Gmail - Email sending
    gmail: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),

    // OpenAI - AI features
    openai: !!process.env.OPENAI_API_KEY,

    // Anthropic - Claude AI
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  };

  // Count connected
  const connected = Object.values(status).filter(Boolean).length;
  const total = Object.keys(status).length;

  return NextResponse.json({
    ...status,
    summary: {
      connected,
      total,
      percentage: Math.round((connected / total) * 100),
    },
  });
}
