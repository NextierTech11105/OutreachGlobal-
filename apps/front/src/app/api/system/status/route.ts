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
  checkFn: () => Promise<{ ok: boolean; latency: number; message?: string }>
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

async function checkSignalHouse(): Promise<{ ok: boolean; latency: number; message?: string }> {
  const apiKey = process.env.SIGNALHOUSE_API_KEY;
  if (!apiKey) {
    return { ok: false, latency: 0, message: "SIGNALHOUSE_API_KEY not configured" };
  }

  const start = Date.now();
  try {
    const res = await fetch("https://api.signalhouse.io/api/v1/account/balance", {
      method: "GET",
      headers: { "x-api-key": apiKey },
    });
    const latency = Date.now() - start;
    return { ok: res.ok, latency, message: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, latency: Date.now() - start, message: "Connection failed" };
  }
}

async function checkRealEstateAPI(): Promise<{ ok: boolean; latency: number; message?: string }> {
  const apiKey = process.env.REALESTATE_API_KEY || process.env.REAL_ESTATE_API_KEY;
  if (!apiKey) {
    return { ok: false, latency: 0, message: "REALESTATE_API_KEY not configured" };
  }

  const start = Date.now();
  try {
    // Just check if we can reach the API
    const res = await fetch("https://api.realestateapi.com/v2/PropertySearch", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ limit: 1 })
    });
    const latency = Date.now() - start;
    // 400 is OK - means API is reachable but needs proper params
    return { ok: res.ok || res.status === 400, latency };
  } catch (e) {
    return { ok: false, latency: Date.now() - start, message: "Connection failed" };
  }
}

async function checkDatabase(): Promise<{ ok: boolean; latency: number; message?: string }> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return { ok: false, latency: 0, message: "DATABASE_URL not configured" };
  }

  const start = Date.now();
  try {
    // Import dynamically to avoid build issues
    const { db } = await import("@/lib/db");
    await db.execute({ sql: "SELECT 1", args: [] });
    return { ok: true, latency: Date.now() - start };
  } catch (e) {
    return {
      ok: false,
      latency: Date.now() - start,
      message: e instanceof Error ? e.message.slice(0, 50) : "Query failed"
    };
  }
}

async function checkTwilio(): Promise<{ ok: boolean; latency: number; message?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return { ok: false, latency: 0, message: "Twilio credentials not configured" };
  }

  const start = Date.now();
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: {
        "Authorization": "Basic " + Buffer.from(`${sid}:${token}`).toString("base64")
      }
    });
    const latency = Date.now() - start;
    return { ok: res.ok, latency, message: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, latency: Date.now() - start, message: "Connection failed" };
  }
}

export async function GET() {
  const startTime = Date.now();

  // Run all checks in parallel
  const [signalhouse, realEstate, database, twilio] = await Promise.all([
    checkService("SignalHouse SMS", checkSignalHouse),
    checkService("RealEstateAPI", checkRealEstateAPI),
    checkService("PostgreSQL", checkDatabase),
    checkService("Twilio Voice", checkTwilio),
  ]);

  const services = [signalhouse, realEstate, database, twilio];
  const healthyCount = services.filter(s => s.status === "healthy").length;
  const avgLatency = Math.round(
    services.filter(s => s.latency > 0).reduce((sum, s) => sum + s.latency, 0) /
    services.filter(s => s.latency > 0).length || 0
  );

  return NextResponse.json({
    status: healthyCount === services.length ? "operational" : healthyCount > 0 ? "degraded" : "down",
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime,
    services,
    summary: {
      healthy: healthyCount,
      total: services.length,
      avgLatency,
    }
  });
}
