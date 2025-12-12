import { NextRequest, NextResponse } from "next/server";
import {
  createWebhook,
  getWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookEvents,
  isConfigured,
} from "@/lib/signalhouse/client";

// GET - List webhooks or get specific webhook
export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "SignalHouse not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const webhookId = searchParams.get("webhookId");
  const action = searchParams.get("action");

  try {
    // Get available webhook events
    if (action === "events") {
      const result = await getWebhookEvents();
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 400 },
        );
      }
      return NextResponse.json({
        success: true,
        events: result.data || [
          "message.received",
          "message.sent",
          "message.delivered",
          "message.failed",
          "number.provisioned",
          "number.released",
          "campaign.approved",
          "campaign.rejected",
        ],
      });
    }

    // Get specific webhook
    if (webhookId) {
      const result = await getWebhook(webhookId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 400 },
        );
      }
      return NextResponse.json({ success: true, webhook: result.data });
    }

    // List all webhooks
    const result = await getWebhooks();
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({
      success: true,
      webhooks: result.data || [],
    });
  } catch (error) {
    console.error("[SignalHouse Webhook] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get webhooks",
      },
      { status: 500 },
    );
  }
}

// POST - Create a new webhook
export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "SignalHouse not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { name, url, events, description } = body;

    if (!name || !url || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: "name, url, and events array are required" },
        { status: 400 },
      );
    }

    const result = await createWebhook({ name, url, events, description });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({
      success: true,
      webhook: result.data,
      message: "Webhook created successfully",
    });
  } catch (error) {
    console.error("[SignalHouse Webhook] Create error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create webhook",
      },
      { status: 500 },
    );
  }
}

// PATCH - Update a webhook
export async function PATCH(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "SignalHouse not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { webhookId, ...updates } = body;

    if (!webhookId) {
      return NextResponse.json(
        { error: "webhookId required" },
        { status: 400 },
      );
    }

    const result = await updateWebhook(webhookId, updates);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({
      success: true,
      webhook: result.data,
      message: "Webhook updated",
    });
  } catch (error) {
    console.error("[SignalHouse Webhook] Update error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update webhook",
      },
      { status: 500 },
    );
  }
}

// DELETE - Delete a webhook
export async function DELETE(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "SignalHouse not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const webhookId = searchParams.get("webhookId");

  if (!webhookId) {
    return NextResponse.json({ error: "webhookId required" }, { status: 400 });
  }

  try {
    const result = await deleteWebhook(webhookId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({ success: true, message: "Webhook deleted" });
  } catch (error) {
    console.error("[SignalHouse Webhook] Delete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete webhook",
      },
      { status: 500 },
    );
  }
}
