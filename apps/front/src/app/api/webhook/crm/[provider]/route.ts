import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * CRM WEBHOOK RECEIVERS
 * ═══════════════════════════════════════════════════════════════════════════════
 * Receive real-time updates FROM CRMs when records change
 *
 * Endpoints:
 * - POST /api/webhook/crm/zoho      - Zoho CRM webhooks
 * - POST /api/webhook/crm/salesforce - Salesforce Platform Events
 * - POST /api/webhook/crm/hubspot    - HubSpot webhooks
 * - POST /api/webhook/crm/pipedrive  - Pipedrive webhooks
 *
 * This enables BI-DIRECTIONAL sync:
 * - NEXTIER → CRM: REST API calls (activity logging)
 * - CRM → NEXTIER: Webhooks (record updates)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

type CRMProvider = "zoho" | "salesforce" | "hubspot" | "pipedrive";

interface WebhookPayload {
  provider: CRMProvider;
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// Handle Zoho webhooks
async function handleZohoWebhook(
  body: Record<string, unknown>,
): Promise<WebhookPayload> {
  // Zoho sends webhooks in this format:
  // { "module": "Leads", "event": "insert"|"update"|"delete", "ids": [...], "data": {...} }
  return {
    provider: "zoho",
    event: (body.event as string) || "update",
    data: {
      module: body.module,
      ids: body.ids,
      records: body.data,
    },
    timestamp: new Date().toISOString(),
  };
}

// Handle Salesforce Platform Events
async function handleSalesforceWebhook(
  body: Record<string, unknown>,
): Promise<WebhookPayload> {
  // Salesforce Platform Events format varies by event type
  return {
    provider: "salesforce",
    event: (body.event as string) || "update",
    data: {
      sobject: body.sobject,
      recordId: body.Id,
      fields: body,
    },
    timestamp: new Date().toISOString(),
  };
}

// Handle HubSpot webhooks
async function handleHubSpotWebhook(body: unknown[]): Promise<WebhookPayload> {
  // HubSpot sends an array of events
  const events = Array.isArray(body) ? body : [body];
  const firstEvent = (events[0] as Record<string, unknown>) || {};

  return {
    provider: "hubspot",
    event: (firstEvent.subscriptionType as string) || "update",
    data: {
      events: events.map((e: Record<string, unknown>) => ({
        objectId: e.objectId,
        propertyName: e.propertyName,
        propertyValue: e.propertyValue,
        changeSource: e.changeSource,
        portalId: e.portalId,
      })),
    },
    timestamp: new Date().toISOString(),
  };
}

// Handle Pipedrive webhooks
async function handlePipedriveWebhook(
  body: Record<string, unknown>,
): Promise<WebhookPayload> {
  // Pipedrive webhook format
  return {
    provider: "pipedrive",
    event: (body.event as string) || "update",
    data: {
      object: body.meta?.object,
      id: body.meta?.id,
      action: body.meta?.action,
      current: body.current,
      previous: body.previous,
    },
    timestamp: new Date().toISOString(),
  };
}

// Process webhook and sync to NEXTIER
async function processWebhook(payload: WebhookPayload): Promise<void> {
  // Find teams connected to this CRM provider
  const teamsResult = await db.execute(sql`
    SELECT team_id, value FROM team_settings
    WHERE name = 'crm_integration'
    AND value::jsonb->>'provider' = ${payload.provider}
    AND value::jsonb->>'enabled' = 'true'
  `);

  for (const row of teamsResult.rows || []) {
    const teamId = row.team_id as string;

    // Log the webhook event
    await db.execute(sql`
      INSERT INTO team_settings (id, team_id, name, value, type, created_at, updated_at)
      VALUES (
        ${`${teamId}_crm_webhook_${Date.now()}`},
        ${teamId},
        'crm_webhook_log',
        ${JSON.stringify(payload)},
        'json',
        NOW(),
        NOW()
      )
    `);

    // Process specific events
    switch (payload.event) {
      case "insert":
      case "create":
      case "contact.creation":
        // New record created in CRM - could create lead in NEXTIER
        console.log(
          `[CRM Webhook] New record from ${payload.provider} for team ${teamId}`,
        );
        break;

      case "update":
      case "contact.propertyChange":
        // Record updated - could update lead status in NEXTIER
        console.log(
          `[CRM Webhook] Record updated from ${payload.provider} for team ${teamId}`,
        );
        break;

      case "delete":
        // Record deleted - could archive lead in NEXTIER
        console.log(
          `[CRM Webhook] Record deleted from ${payload.provider} for team ${teamId}`,
        );
        break;

      default:
        console.log(
          `[CRM Webhook] Event ${payload.event} from ${payload.provider}`,
        );
    }
  }
}

// GET - Webhook verification (some CRMs require this)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const { searchParams } = new URL(request.url);

  // HubSpot verification
  if (provider === "hubspot") {
    const challenge = searchParams.get("challenge");
    if (challenge) {
      return new NextResponse(challenge, { status: 200 });
    }
  }

  // Zoho verification
  if (provider === "zoho") {
    const verifyToken = searchParams.get("verify_token");
    if (verifyToken) {
      // Verify against stored token
      return NextResponse.json({ status: "verified" });
    }
  }

  return NextResponse.json({
    status: "ok",
    provider,
    message: "CRM webhook endpoint ready",
  });
}

// POST - Receive webhook events
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  try {
    const body = await request.json();

    let payload: WebhookPayload;

    switch (provider as CRMProvider) {
      case "zoho":
        payload = await handleZohoWebhook(body);
        break;
      case "salesforce":
        payload = await handleSalesforceWebhook(body);
        break;
      case "hubspot":
        payload = await handleHubSpotWebhook(body);
        break;
      case "pipedrive":
        payload = await handlePipedriveWebhook(body);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown CRM provider: ${provider}` },
          { status: 400 },
        );
    }

    // Process asynchronously
    processWebhook(payload).catch((error) => {
      console.error(`[CRM Webhook] Processing error:`, error);
    });

    // Return 200 immediately (webhooks expect fast response)
    return NextResponse.json({
      received: true,
      provider,
      event: payload.event,
    });
  } catch (error) {
    console.error(`[CRM Webhook] Error from ${provider}:`, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
