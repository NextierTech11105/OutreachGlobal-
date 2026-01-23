import { NextResponse } from "next/server";

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,

    // DO Spaces Configuration
    spaces: {
      configured: !!(process.env.SPACES_KEY && process.env.SPACES_SECRET),
      bucket: process.env.SPACES_BUCKET || "NOT SET",
      hasKey: !!process.env.SPACES_KEY,
      hasSecret: !!process.env.SPACES_SECRET,
      keyPreview: process.env.SPACES_KEY
        ? `${process.env.SPACES_KEY.substring(0, 8)}...`
        : "NOT SET",
    },

    // Database Configuration
    database: {
      configured: !!process.env.DATABASE_URL,
      hasUrl: !!process.env.DATABASE_URL,
      urlPreview: process.env.DATABASE_URL
        ? `${process.env.DATABASE_URL.substring(0, 20)}...`
        : "NOT SET",
    },

    // SignalHouse Configuration
    signalhouse: {
      configured: !!(process.env.SIGNALHOUSE_API_KEY && process.env.SIGNALHOUSE_AUTH_TOKEN),
      hasApiKey: !!process.env.SIGNALHOUSE_API_KEY,
      hasAuthToken: !!process.env.SIGNALHOUSE_AUTH_TOKEN,
      hasPhoneNumber: !!process.env.SIGNALHOUSE_DEFAULT_NUMBER,
    },

    // AI Providers
    ai: {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
      hasPerplexity: !!process.env.PERPLEXITY_API_KEY,
    },

    // Other Services
    services: {
      hasTracerfy: !!process.env.TRACERFY_API_TOKEN,
      hasRealEstateAPI: !!process.env.REAL_ESTATE_API_KEY,
      hasApollo: !!process.env.APOLLO_API_KEY,
      hasRedis: !!process.env.REDIS_URL,
    },

    // Critical Services Status
    criticalServicesConfigured: {
      spaces: !!(process.env.SPACES_KEY && process.env.SPACES_SECRET),
      database: !!process.env.DATABASE_URL,
      sms: !!(process.env.SIGNALHOUSE_API_KEY && process.env.SIGNALHOUSE_AUTH_TOKEN),
    },

    // Overall Health
    allCriticalConfigured:
      !!(process.env.SPACES_KEY && process.env.SPACES_SECRET) &&
      !!process.env.DATABASE_URL &&
      !!(process.env.SIGNALHOUSE_API_KEY && process.env.SIGNALHOUSE_AUTH_TOKEN),
  };

  return NextResponse.json(diagnostics, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
