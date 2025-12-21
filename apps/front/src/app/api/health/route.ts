import { NextResponse } from "next/server";

export async function GET() {
  const envStatus = {
    // Database
    database: !!process.env.DATABASE_URL,
    
    // SignalHouse SMS
    signalhouse_api_key: !!process.env.SIGNALHOUSE_API_KEY,
    signalhouse_auth_token: !!process.env.SIGNALHOUSE_AUTH_TOKEN,
    signalhouse_default_number: process.env.SIGNALHOUSE_DEFAULT_NUMBER || null,
    
    // Twilio
    twilio_account_sid: !!process.env.TWILIO_ACCOUNT_SID,
    twilio_auth_token: !!process.env.TWILIO_AUTH_TOKEN,
    twilio_phone_number: process.env.TWILIO_PHONE_NUMBER || null,
    
    // Apollo
    apollo_api_key: !!(process.env.APOLLO_IO_API_KEY || process.env.APOLLO_API_KEY),
    
    // RealEstateAPI
    realestate_api_key: !!(process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY),
    
    // SendGrid
    sendgrid_api_key: !!process.env.SENDGRID_API_KEY,
    
    // Stripe
    stripe_secret_key: !!process.env.STRIPE_SECRET_KEY,
    
    // OpenAI/Anthropic
    openai_api_key: !!process.env.OPENAI_API_KEY,
    anthropic_api_key: !!process.env.ANTHROPIC_API_KEY,
  };

  const configured = Object.entries(envStatus).filter(([_, v]) => v === true).length;
  const total = Object.keys(envStatus).length;

  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || "1.0.0",
    integrations: envStatus,
    summary: {
      configured,
      total,
      percentage: Math.round((configured / total) * 100),
    },
  });
}
