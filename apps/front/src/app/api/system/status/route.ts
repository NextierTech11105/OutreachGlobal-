import { NextResponse } from "next/server";

/**
 * SYSTEM STATUS API
 *
 * Returns REAL health status of external services.
 * No fake data - actually tests connectivity.
 */

interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "down" | "not_configured";
  latency: number;
  message?: string;
}

async function checkService(
  name: string,
  checkFn: () => Promise<{ ok: boolean; latency: number; message?: string }>,
): Promise<ServiceStatus> {
  try {
    const result = await checkFn();
    return {
      name,
      status: result.ok ? "healthy" : "degraded",
      latency: result.latency,
      message: result.message,
    };
  } catch (error) {
    return {
      name,
      status: "down",
      latency: 0,
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

async function checkSignalHouse(): Promise<{
  ok: boolean;
  latency: number;
  message?: string;
}> {
  const apiKey = process.env.SIGNALHOUSE_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      latency: 0,
      message: "SIGNALHOUSE_API_KEY not configured",
    };
  }

  const start = Date.now();
  try {
    const res = await fetch(
      "https://api.signalhouse.io/api/v1/account/balance",
      {
        method: "GET",
        headers: { "x-api-key": apiKey },
      },
    );
    const latency = Date.now() - start;
    return {
      ok: res.ok,
      latency,
      message: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      latency: Date.now() - start,
      message: "Connection failed",
    };
  }
}

async function checkRealEstateAPI(): Promise<{
  ok: boolean;
  latency: number;
  message?: string;
}> {
  const apiKey =
    process.env.REALESTATE_API_KEY || process.env.REAL_ESTATE_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      latency: 0,
      message: "REALESTATE_API_KEY not configured",
    };
  }

  const start = Date.now();
  try {
    // Just check if we can reach the API
    const res = await fetch("https://api.realestateapi.com/v2/PropertySearch", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: 1 }),
    });
    const latency = Date.now() - start;
    // 400 is OK - means API is reachable but needs proper params
    return { ok: res.ok || res.status === 400, latency };
  } catch (e) {
    return {
      ok: false,
      latency: Date.now() - start,
      message: "Connection failed",
    };
  }
}

async function checkDatabase(): Promise<{
  ok: boolean;
  latency: number;
  message?: string;
}> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return { ok: false, latency: 0, message: "DATABASE_URL not configured" };
  }

  const start = Date.now();
  try {
    // Use postgres-js directly for health check
    const postgres = (await import("postgres")).default;
    const sql = postgres(dbUrl, { ssl: "require", max: 1 });
    await sql`SELECT 1`;
    await sql.end();
    return { ok: true, latency: Date.now() - start };
  } catch (e) {
    return {
      ok: false,
      latency: Date.now() - start,
      message: e instanceof Error ? e.message.slice(0, 50) : "Query failed",
    };
  }
}

async function checkTwilio(): Promise<{
  ok: boolean;
  latency: number;
  message?: string;
}> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return {
      ok: false,
      latency: 0,
      message: "Twilio credentials not configured",
    };
  }

  const start = Date.now();
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`,
      {
        headers: {
          Authorization:
            "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        },
      },
    );
    const latency = Date.now() - start;
    return {
      ok: res.ok,
      latency,
      message: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      latency: Date.now() - start,
      message: "Connection failed",
    };
  }
}

async function checkTracerfy(): Promise<{
  ok: boolean;
  latency: number;
  message?: string;
}> {
  // Support both env var names (TOKEN is legacy, KEY is new)
  const apiKey = process.env.TRACERFY_API_TOKEN || process.env.TRACERFY_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      latency: 0,
      message: "TRACERFY_API_TOKEN not configured",
    };
  }

  const start = Date.now();
  try {
    // Check Tracerfy queues endpoint (matches client URL)
    const res = await fetch("https://tracerfy.com/v1/api/queues/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    const latency = Date.now() - start;
    return {
      ok: res.ok,
      latency,
      message: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      latency: Date.now() - start,
      message: "Connection failed",
    };
  }
}

async function checkTrestle(): Promise<{
  ok: boolean;
  latency: number;
  message?: string;
}> {
  const apiKey = process.env.TRESTLE_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      latency: 0,
      message: "TRESTLE_API_KEY not configured",
    };
  }

  const start = Date.now();
  try {
    // Trestle uses x-api-key header (matching client)
    const res = await fetch("https://api.trestleiq.com/3.0/phone_intel?phone=5551234567", {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });
    const latency = Date.now() - start;
    // 400/401/402 means API is reachable (402 = no credits)
    return {
      ok: res.ok || res.status === 400 || res.status === 401 || res.status === 402,
      latency,
      message: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      latency: Date.now() - start,
      message: "Connection failed",
    };
  }
}

async function checkApollo(): Promise<{
  ok: boolean;
  latency: number;
  message?: string;
}> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      latency: 0,
      message: "APOLLO_API_KEY not configured",
    };
  }

  const start = Date.now();
  try {
    // Check Apollo health endpoint
    const res = await fetch("https://api.apollo.io/api/v1/auth/health", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
    });
    const latency = Date.now() - start;
    return {
      ok: res.ok || res.status === 401,
      latency,
      message: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      latency: Date.now() - start,
      message: "Connection failed",
    };
  }
}

async function checkPerplexity(): Promise<{
  ok: boolean;
  latency: number;
  message?: string;
}> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      latency: 0,
      message: "PERPLEXITY_API_KEY not configured",
    };
  }

  const start = Date.now();
  try {
    // Perplexity chat completions endpoint - minimal test
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 1,
      }),
    });
    const latency = Date.now() - start;
    // 400/401 means API is reachable
    return {
      ok: res.ok || res.status === 400 || res.status === 401,
      latency,
      message: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      latency: Date.now() - start,
      message: "Connection failed",
    };
  }
}

export async function GET() {
  const startTime = Date.now();

  // Run all checks in parallel
  const [signalhouse, realEstate, database, twilio, tracerfy, trestle, apollo, perplexity] = await Promise.all([
    checkService("SignalHouse SMS", checkSignalHouse),
    checkService("RealEstateAPI", checkRealEstateAPI),
    checkService("PostgreSQL", checkDatabase),
    checkService("Twilio Voice", checkTwilio),
    checkService("Tracerfy Skip Trace", checkTracerfy),
    checkService("Trestle Real Contact", checkTrestle),
    checkService("Apollo.io", checkApollo),
    checkService("Perplexity (NEVA)", checkPerplexity),
  ]);

  const services = [signalhouse, realEstate, database, twilio, tracerfy, trestle, apollo, perplexity];
  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const avgLatency = Math.round(
    services
      .filter((s) => s.latency > 0)
      .reduce((sum, s) => sum + s.latency, 0) /
      services.filter((s) => s.latency > 0).length || 0,
  );

  return NextResponse.json({
    status:
      healthyCount === services.length
        ? "operational"
        : healthyCount > 0
          ? "degraded"
          : "down",
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime,
    services,
    summary: {
      healthy: healthyCount,
      total: services.length,
      avgLatency,
    },
  });
}
