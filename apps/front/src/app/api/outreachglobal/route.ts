import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";

// OutreachGlobal Database API Connection
// Connects to the original OutreachGlobal platform database at data.outreachglobal.io
// This provides access to the content library, templates, and historical data

// Legacy OutreachGlobal PHP Platform API
// Primary: app.outreachglobal.io (143.198.9.190)
const OUTREACHGLOBAL_API_URL =
  process.env.OUTREACHGLOBAL_API_URL || "https://app.outreachglobal.io";
const OUTREACHGLOBAL_TOKEN =
  process.env.OUTREACHGLOBAL_TOKEN || "jdfu88jf84jna02";

interface OutreachGlobalQuery {
  endpoint: string; // e.g., "content", "templates", "leads", "campaigns"
  method?: "GET" | "POST" | "PUT" | "DELETE";
  params?: Record<string, string | number | boolean>;
  body?: Record<string, unknown>;
}

// Helper to make authenticated requests to OutreachGlobal API
async function fetchFromOutreachGlobal(query: OutreachGlobalQuery) {
  const { endpoint, method = "GET", params, body } = query;

  // Build URL with query params
  const url = new URL(`${OUTREACHGLOBAL_API_URL}/api/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OUTREACHGLOBAL_TOKEN}`,
    "X-API-Token": OUTREACHGLOBAL_TOKEN,
  };

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OutreachGlobal API error: ${response.status} - ${errorText}`,
    );
  }

  return response.json();
}

// GET - Query OutreachGlobal database
export async function GET(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");

    // Check configuration
    if (!OUTREACHGLOBAL_TOKEN) {
      return NextResponse.json({
        configured: false,
        error: "OUTREACHGLOBAL_TOKEN not configured",
        help: "Add OUTREACHGLOBAL_TOKEN environment variable",
        availableEndpoints: [
          "content-library - Get content templates and prompts",
          "templates - Get email/SMS templates",
          "leads - Get historical leads",
          "campaigns - Get campaign data",
          "reports - Get saved reports",
          "buyer-personas - Get buyer persona templates",
          "sql-queries - Get saved SQL queries",
        ],
      });
    }

    // If no endpoint, return available endpoints
    if (!endpoint) {
      return NextResponse.json({
        configured: true,
        apiUrl: OUTREACHGLOBAL_API_URL,
        endpoints: {
          "content-library": "Content templates and AI prompts",
          templates: "Email, SMS, and voice templates",
          leads: "Historical lead data",
          campaigns: "Campaign configurations",
          reports: "Saved reports and SQL queries",
          "buyer-personas": "Buyer persona templates",
          "company-personas": "Company persona templates",
          "lead-magnets": "Lead magnet templates",
        },
        usage: "GET ?endpoint=content-library&category=emails",
      });
    }

    // Build params from search params
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key !== "endpoint") {
        params[key] = value;
      }
    });

    // Fetch from OutreachGlobal
    const data = await fetchFromOutreachGlobal({
      endpoint,
      params,
    });

    return NextResponse.json({
      success: true,
      source: "outreachglobal",
      endpoint,
      data,
    });
  } catch (error) {
    console.error("[OutreachGlobal API] Error:", error);
    const message =
      error instanceof Error ? error.message : "API request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Write to OutreachGlobal database or sync data
export async function POST(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!OUTREACHGLOBAL_TOKEN) {
      return NextResponse.json(
        {
          error: "OUTREACHGLOBAL_TOKEN not configured",
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { endpoint, action, data } = body;

    if (!endpoint) {
      return NextResponse.json(
        {
          error: "endpoint required",
          example: {
            endpoint: "templates",
            action: "create",
            data: { name: "New Template", body: "Template content..." },
          },
        },
        { status: 400 },
      );
    }

    // Handle different actions
    let result;

    switch (action) {
      case "sync":
        // Sync data from OutreachGlobal to NexTier
        result = await fetchFromOutreachGlobal({
          endpoint: `${endpoint}/sync`,
          method: "GET",
        });
        break;

      case "create":
        result = await fetchFromOutreachGlobal({
          endpoint,
          method: "POST",
          body: data,
        });
        break;

      case "update":
        result = await fetchFromOutreachGlobal({
          endpoint: `${endpoint}/${data.id}`,
          method: "PUT",
          body: data,
        });
        break;

      case "import":
        // Import all content from a category
        result = await fetchFromOutreachGlobal({
          endpoint: `${endpoint}/export`,
          method: "GET",
        });
        break;

      default:
        // Default: POST to endpoint
        result = await fetchFromOutreachGlobal({
          endpoint,
          method: "POST",
          body: data,
        });
    }

    return NextResponse.json({
      success: true,
      action: action || "post",
      endpoint,
      result,
    });
  } catch (error) {
    console.error("[OutreachGlobal API] Error:", error);
    const message =
      error instanceof Error ? error.message : "API request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Specific endpoint to import content library
export async function importContentLibrary(): Promise<{
  categories: Array<{
    id: string;
    name: string;
    prompts: Array<{
      id: string;
      name: string;
      prompt: string;
      variables: string[];
      channel: string;
    }>;
  }>;
}> {
  if (!OUTREACHGLOBAL_TOKEN) {
    throw new Error("OUTREACHGLOBAL_TOKEN not configured");
  }

  const data = await fetchFromOutreachGlobal({
    endpoint: "content-library",
    method: "GET",
  });

  return data;
}
