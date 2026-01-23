/**
 * SYSTEM DEBUG - Shows EVERYTHING
 * What's configured, what's broken, what's missing
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { smsMessages, leads, businesses, contacts, campaigns } from "@/lib/db/schema";
import { count } from "drizzle-orm";

export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  };

  // 1. Check Environment Variables
  results.envVars = {
    // SignalHouse
    SIGNALHOUSE_API_KEY: !!process.env.SIGNALHOUSE_API_KEY ? "SET" : "MISSING",
    SIGNALHOUSE_AUTH_TOKEN: !!process.env.SIGNALHOUSE_AUTH_TOKEN ? "SET" : "MISSING",
    SIGNALHOUSE_FROM_NUMBER: process.env.SIGNALHOUSE_FROM_NUMBER || "NOT SET",
    SIGNALHOUSE_BRAND_ID: process.env.SIGNALHOUSE_BRAND_ID || "NOT SET",
    SIGNALHOUSE_CAMPAIGN_ID: process.env.SIGNALHOUSE_CAMPAIGN_ID || "NOT SET",

    // DO Spaces
    SPACES_KEY: !!process.env.SPACES_KEY || !!process.env.DO_SPACES_KEY ? "SET" : "MISSING",
    SPACES_SECRET: !!process.env.SPACES_SECRET || !!process.env.DO_SPACES_SECRET ? "SET" : "MISSING",
    SPACES_BUCKET: process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "NOT SET",

    // Database
    DATABASE_URL: !!process.env.DATABASE_URL ? "SET" : "MISSING",

    // AI
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY ? "SET" : "MISSING",
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY ? "SET" : "MISSING",

    // Skip Trace
    TRACERFY_API_KEY: !!process.env.TRACERFY_API_KEY ? "SET" : "MISSING",
    TRESTLE_API_KEY: !!process.env.TRESTLE_API_KEY ? "SET" : "MISSING",

    // Webhook
    SIGNALHOUSE_WEBHOOK_TOKEN: !!process.env.SIGNALHOUSE_WEBHOOK_TOKEN ? "SET" : "MISSING",
  };

  // 2. Check Database Connection and Data
  try {
    if (db) {
      const [smsCount] = await db.select({ count: count() }).from(smsMessages);
      const [leadCount] = await db.select({ count: count() }).from(leads);
      const [businessCount] = await db.select({ count: count() }).from(businesses);
      const [contactCount] = await db.select({ count: count() }).from(contacts);
      const [campaignCount] = await db.select({ count: count() }).from(campaigns);

      results.database = {
        status: "CONNECTED",
        tables: {
          smsMessages: smsCount?.count || 0,
          leads: leadCount?.count || 0,
          businesses: businessCount?.count || 0,
          contacts: contactCount?.count || 0,
          campaigns: campaignCount?.count || 0,
        },
        hasData: (smsCount?.count || 0) > 0 || (leadCount?.count || 0) > 0 || (businessCount?.count || 0) > 0,
      };
    } else {
      results.database = {
        status: "NOT CONFIGURED",
        error: "Database client is null",
      };
    }
  } catch (error) {
    results.database = {
      status: "ERROR",
      error: String(error),
    };
  }

  // 3. Check SignalHouse Connection
  try {
    const apiKey = process.env.SIGNALHOUSE_API_KEY;
    const authToken = process.env.SIGNALHOUSE_AUTH_TOKEN;

    if (apiKey && authToken) {
      const response = await fetch("https://api.signalhouse.io/api/v1/analytics/stats", {
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        results.signalhouse = {
          status: "CONNECTED",
          stats: data,
        };
      } else {
        results.signalhouse = {
          status: "AUTH_FAILED",
          httpStatus: response.status,
          error: await response.text(),
        };
      }
    } else {
      results.signalhouse = {
        status: "NOT CONFIGURED",
        missing: {
          apiKey: !apiKey,
          authToken: !authToken,
        },
      };
    }
  } catch (error) {
    results.signalhouse = {
      status: "ERROR",
      error: String(error),
    };
  }

  // 4. Check Webhook Configuration
  results.webhook = {
    expectedUrl: `https://monkfish-app-mb7h3.ondigitalocean.app/api/webhook/signalhouse?token=${process.env.SIGNALHOUSE_WEBHOOK_TOKEN || "YOUR_TOKEN"}`,
    tokenConfigured: !!process.env.SIGNALHOUSE_WEBHOOK_TOKEN,
    note: "This URL must be registered in SignalHouse dashboard for inbound messages to work",
  };

  // 5. Summary
  const criticalMissing = [];
  if (results.envVars.SIGNALHOUSE_API_KEY === "MISSING") criticalMissing.push("SIGNALHOUSE_API_KEY");
  if (results.envVars.SIGNALHOUSE_AUTH_TOKEN === "MISSING") criticalMissing.push("SIGNALHOUSE_AUTH_TOKEN");
  if (results.envVars.DATABASE_URL === "MISSING") criticalMissing.push("DATABASE_URL");
  if (results.envVars.SPACES_KEY === "MISSING") criticalMissing.push("SPACES_KEY/DO_SPACES_KEY");
  if (results.envVars.SPACES_SECRET === "MISSING") criticalMissing.push("SPACES_SECRET/DO_SPACES_SECRET");

  results.summary = {
    criticalMissing,
    isFullyConfigured: criticalMissing.length === 0,
    canSendSMS: results.signalhouse?.status === "CONNECTED",
    canReceiveInbound: !!process.env.SIGNALHOUSE_WEBHOOK_TOKEN,
    hasDataInDatabase: results.database?.hasData || false,
    recommendations: [],
  };

  if (criticalMissing.length > 0) {
    results.summary.recommendations.push(`Set missing env vars: ${criticalMissing.join(", ")}`);
  }
  if (!results.database?.hasData) {
    results.summary.recommendations.push("Import some data via /t/[team]/import or /api/datalake/import");
  }
  if (!process.env.SIGNALHOUSE_WEBHOOK_TOKEN) {
    results.summary.recommendations.push("Set SIGNALHOUSE_WEBHOOK_TOKEN and register webhook URL in SignalHouse dashboard");
  }

  return NextResponse.json(results);
}
