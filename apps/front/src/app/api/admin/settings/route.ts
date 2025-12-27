/**
 * Admin Settings API
 * Check configuration status of all API integrations
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";

// API key environment variable mappings - must match actual env var names used in codebase
const API_KEYS = {
  // LLM Providers
  openai: { env: "OPENAI_API_KEY", name: "OpenAI", category: "llm" },
  anthropic: {
    env: "ANTHROPIC_API_KEY",
    name: "Anthropic Claude",
    category: "llm",
  },
  google: { env: "GOOGLE_API_KEY", name: "Google Gemini", category: "llm" },
  grok: { env: "GROK_API_KEY", name: "Grok", category: "llm" },

  // Data & Enrichment - check both variants
  realestateapi: {
    env: "REALESTATE_API_KEY",
    altEnv: "REAL_ESTATE_API_KEY",
    name: "RealEstateAPI (Skip Trace)",
    category: "data",
  },
  apollo: {
    env: "APOLLO_IO_API_KEY",
    altEnv: "APOLLO_API_KEY",
    name: "Apollo.io",
    category: "data",
  },

  // Communication
  signalhouse: {
    env: "SIGNALHOUSE_API_KEY",
    name: "SignalHouse SMS",
    category: "sms",
  },
  twilio_sid: {
    env: "TWILIO_ACCOUNT_SID",
    name: "Twilio Account SID",
    category: "voice",
  },
  twilio_token: {
    env: "TWILIO_AUTH_TOKEN",
    name: "Twilio Auth Token",
    category: "voice",
  },
  sendgrid: { env: "SENDGRID_API_KEY", name: "SendGrid", category: "email" },

  // Storage - check both variants
  do_spaces_key: {
    env: "DO_SPACES_KEY",
    altEnv: "SPACES_KEY",
    name: "DO Spaces Key",
    category: "storage",
  },
  do_spaces_secret: {
    env: "DO_SPACES_SECRET",
    altEnv: "SPACES_SECRET",
    name: "DO Spaces Secret",
    category: "storage",
  },

  // Database
  database_url: { env: "DATABASE_URL", name: "Database", category: "database" },
} as const;

type ApiKeyId = keyof typeof API_KEYS;

interface ApiKeyStatus {
  id: string;
  name: string;
  category: string;
  configured: boolean;
  envVar: string;
}

// GET - Check status of all API keys
export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Forbidden: Super admin access required" },
      { status: 403 },
    );
  }

  const status: ApiKeyStatus[] = [];
  const summary = {
    total: Object.keys(API_KEYS).length,
    configured: 0,
    missing: 0,
    byCategory: {} as Record<string, { configured: number; total: number }>,
  };

  for (const [id, config] of Object.entries(API_KEYS)) {
    // Check both primary env var and alternate name if defined
    const altEnv = (config as { altEnv?: string }).altEnv;
    const isConfigured =
      !!process.env[config.env] || (altEnv ? !!process.env[altEnv] : false);
    const usedEnvVar = process.env[config.env]
      ? config.env
      : altEnv && process.env[altEnv]
        ? altEnv
        : config.env;

    status.push({
      id,
      name: config.name,
      category: config.category,
      configured: isConfigured,
      envVar: usedEnvVar,
    });

    if (isConfigured) {
      summary.configured++;
    } else {
      summary.missing++;
    }

    // Track by category
    if (!summary.byCategory[config.category]) {
      summary.byCategory[config.category] = { configured: 0, total: 0 };
    }
    summary.byCategory[config.category].total++;
    if (isConfigured) {
      summary.byCategory[config.category].configured++;
    }
  }

  // Group by category for easier display
  const grouped = status.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, ApiKeyStatus[]>,
  );

  return NextResponse.json({
    success: true,
    status,
    grouped,
    summary,
    message:
      summary.missing > 0
        ? `${summary.missing} API keys not configured`
        : "All API keys configured",
  });
}

// POST - Test a specific API connection
export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }

    const { provider } = await request.json();

    if (!provider || !API_KEYS[provider as ApiKeyId]) {
      return NextResponse.json(
        { error: "Invalid provider", validProviders: Object.keys(API_KEYS) },
        { status: 400 },
      );
    }

    const config = API_KEYS[provider as ApiKeyId];
    const altEnv = (config as { altEnv?: string }).altEnv;
    const apiKey =
      process.env[config.env] || (altEnv ? process.env[altEnv] : undefined);

    if (!apiKey) {
      const envVarNames = altEnv ? `${config.env} or ${altEnv}` : config.env;
      return NextResponse.json({
        success: false,
        provider,
        configured: false,
        error: `${envVarNames} not set in environment variables`,
      });
    }

    // Test the connection based on provider
    let testResult: { success: boolean; message: string; details?: unknown } = {
      success: true,
      message: "API key is configured",
    };

    try {
      switch (provider) {
        case "openai":
          const openaiRes = await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          testResult = {
            success: openaiRes.ok,
            message: openaiRes.ok
              ? "OpenAI connected"
              : `OpenAI error: ${openaiRes.status}`,
          };
          break;

        case "anthropic":
          // Anthropic doesn't have a simple test endpoint, just verify key format
          testResult = {
            success: apiKey.startsWith("sk-ant-"),
            message: apiKey.startsWith("sk-ant-")
              ? "Anthropic key format valid"
              : "Invalid key format",
          };
          break;

        case "apollo":
          const apolloRes = await fetch(
            "https://api.apollo.io/api/v1/auth/health",
            {
              headers: { "x-api-key": apiKey },
            },
          );
          testResult = {
            success: apolloRes.ok,
            message: apolloRes.ok
              ? "Apollo.io connected"
              : `Apollo error: ${apolloRes.status}`,
          };
          break;

        case "realestateapi":
          const reRes = await fetch(
            "https://api.realestateapi.com/v1/AutoComplete",
            {
              method: "POST",
              headers: {
                "x-api-key": apiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ search: "test" }),
            },
          );
          testResult = {
            success: reRes.ok || reRes.status === 400, // 400 means API key works but bad request
            message:
              reRes.ok || reRes.status === 400
                ? "RealEstateAPI connected"
                : `Error: ${reRes.status}`,
          };
          break;

        case "signalhouse":
          // SignalHouse test
          testResult = {
            success: apiKey.length > 10,
            message: "SignalHouse key configured",
          };
          break;

        case "sendgrid":
          testResult = {
            success: apiKey.startsWith("SG."),
            message: apiKey.startsWith("SG.")
              ? "SendGrid key format valid"
              : "Invalid key format",
          };
          break;

        default:
          testResult = {
            success: true,
            message: `${config.name} key is set`,
          };
      }
    } catch (err) {
      testResult = {
        success: false,
        message: `Connection test failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      };
    }

    return NextResponse.json({
      provider,
      name: config.name,
      configured: true,
      ...testResult,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Test failed", details: String(error) },
      { status: 500 },
    );
  }
}
