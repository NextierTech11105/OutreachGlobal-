import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

// DigitalOcean Spaces configuration
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_REGION = process.env.SPACES_REGION || "nyc3";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";

const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  forcePathStyle: false,
});

const QUEUE_PREFIX = "valuation-queue/";
const MAX_CONCURRENT = 50;

export interface QueueItem {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  // Lead info
  leadName: string;
  leadPhone: string;
  leadEmail: string;
  // Property info
  propertyAddress: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  // Processing info
  attempts: number;
  lastError?: string;
  // Results
  valuationReportId?: string;
  shareableLink?: string;
  emailSentAt?: string;
}

// In-memory queue (would be Redis/DB in production)
let queue: QueueItem[] = [];
let processingCount = 0;

// Extract email from text using regex
function extractEmail(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  return matches ? matches[0] : null;
}

// GET - List queue items
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");

  let filtered = queue;
  if (status) {
    filtered = queue.filter(item => item.status === status);
  }

  // Calculate stats
  const stats = {
    total: queue.length,
    pending: queue.filter(i => i.status === "pending").length,
    processing: queue.filter(i => i.status === "processing").length,
    completed: queue.filter(i => i.status === "completed").length,
    failed: queue.filter(i => i.status === "failed").length,
    processingCapacity: MAX_CONCURRENT - processingCount,
  };

  return NextResponse.json({
    success: true,
    stats,
    items: filtered.slice(0, limit),
    maxConcurrent: MAX_CONCURRENT,
  });
}

// POST - Add to queue or process queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Action: Add single item to queue
    if (action === "add") {
      const { leadName, leadPhone, message, propertyAddress, propertyCity, propertyState, propertyZip } = body;

      // Extract email from message
      const leadEmail = extractEmail(message || "") || body.leadEmail;

      if (!leadEmail) {
        return NextResponse.json({
          error: "No email found in message",
          message: "Could not extract email address from the message",
        }, { status: 400 });
      }

      if (!propertyAddress) {
        return NextResponse.json({
          error: "Property address required",
        }, { status: 400 });
      }

      const newItem: QueueItem = {
        id: `vq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        leadName: leadName || "Unknown",
        leadPhone: leadPhone || "",
        leadEmail,
        propertyAddress,
        propertyCity,
        propertyState,
        propertyZip,
        attempts: 0,
      };

      queue.push(newItem);

      // Save to Spaces
      try {
        await s3Client.send(new PutObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `${QUEUE_PREFIX}pending/${newItem.id}.json`,
          Body: JSON.stringify(newItem),
          ContentType: "application/json",
        }));
      } catch (err) {
        console.log("[Valuation Queue] Spaces save skipped:", err);
      }

      return NextResponse.json({
        success: true,
        item: newItem,
        queuePosition: queue.filter(i => i.status === "pending").length,
      });
    }

    // Action: Add batch to queue
    if (action === "addBatch") {
      const { items } = body;

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "Items array required" }, { status: 400 });
      }

      const added: QueueItem[] = [];
      const skipped: string[] = [];

      for (const item of items) {
        const leadEmail = extractEmail(item.message || "") || item.leadEmail;

        if (!leadEmail || !item.propertyAddress) {
          skipped.push(item.leadName || "Unknown");
          continue;
        }

        const newItem: QueueItem = {
          id: `vq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          leadName: item.leadName || "Unknown",
          leadPhone: item.leadPhone || "",
          leadEmail,
          propertyAddress: item.propertyAddress,
          propertyCity: item.propertyCity,
          propertyState: item.propertyState,
          propertyZip: item.propertyZip,
          attempts: 0,
        };

        queue.push(newItem);
        added.push(newItem);
      }

      return NextResponse.json({
        success: true,
        added: added.length,
        skipped: skipped.length,
        skippedNames: skipped,
        totalPending: queue.filter(i => i.status === "pending").length,
      });
    }

    // Action: Process next item in queue
    if (action === "processNext") {
      if (processingCount >= MAX_CONCURRENT) {
        return NextResponse.json({
          error: "Max concurrent processing reached",
          processingCount,
          maxConcurrent: MAX_CONCURRENT,
        }, { status: 429 });
      }

      const nextItem = queue.find(i => i.status === "pending");

      if (!nextItem) {
        return NextResponse.json({
          success: true,
          message: "No pending items in queue",
          stats: {
            pending: 0,
            processing: processingCount,
          },
        });
      }

      // Mark as processing
      nextItem.status = "processing";
      nextItem.updatedAt = new Date().toISOString();
      nextItem.attempts++;
      processingCount++;

      try {
        // Step 1: Generate valuation
        console.log(`[Valuation Queue] Processing ${nextItem.id} for ${nextItem.propertyAddress}`);

        const valuationRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/property/valuation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: nextItem.propertyAddress,
            city: nextItem.propertyCity,
            state: nextItem.propertyState,
            zip: nextItem.propertyZip,
          }),
        });

        if (!valuationRes.ok) {
          throw new Error(`Valuation failed: ${valuationRes.status}`);
        }

        const valuationData = await valuationRes.json();

        // Step 2: Run AI Analysis
        const aiRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/property/ai-analysis`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            property: valuationData.property,
            comparables: valuationData.comparables,
            valuation: valuationData.valuation,
            neighborhood: valuationData.neighborhood,
          }),
        });

        const aiData = aiRes.ok ? await aiRes.json() : null;

        // Step 3: Save to Research Library
        const saveRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/research-library`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "saveReport",
            path: "/Active Deals",
            name: `${nextItem.propertyAddress} - ${nextItem.leadName}`,
            report: {
              property: valuationData.property,
              valuation: valuationData.valuation,
              comparables: valuationData.comparables,
              neighborhood: valuationData.neighborhood,
              aiAnalysis: aiData?.analysis,
              leadInfo: {
                name: nextItem.leadName,
                email: nextItem.leadEmail,
                phone: nextItem.leadPhone,
              },
            },
          }),
        });

        const saveData = await saveRes.json();

        // Step 4: Generate shareable link
        const shareableLink = saveData.shareableUrl
          ? `${process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app"}${saveData.shareableUrl}`
          : null;

        // Step 5: Send SMS with valuation link
        const deliveryMethod = body.deliveryMethod || "sms";
        const includePartnerOffer = body.includePartnerOffer;
        const partnerId = body.partnerId;

        let smsMessage = `Hi ${nextItem.leadName.split(" ")[0] || "there"}, here's your free property valuation for ${nextItem.propertyAddress}: ${shareableLink}`;

        if (includePartnerOffer && partnerId) {
          smsMessage += "\n\nBonus: You've been selected for an exclusive local business offer - check your report for details!";
        }

        if ((deliveryMethod === "sms" || deliveryMethod === "both") && nextItem.leadPhone) {
          try {
            // Send SMS via Twilio
            const smsRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/sms/send`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: nextItem.leadPhone,
                message: smsMessage,
              }),
            });

            if (smsRes.ok) {
              console.log(`[Valuation Queue] SMS sent to ${nextItem.leadPhone}`);
            } else {
              console.log(`[Valuation Queue] SMS send failed: ${smsRes.status}`);
            }
          } catch (smsErr) {
            console.log(`[Valuation Queue] SMS error:`, smsErr);
          }
        }

        // Step 6: Send email if requested
        if ((deliveryMethod === "email" || deliveryMethod === "both") && nextItem.leadEmail) {
          // TODO: Integrate with email service (SendGrid, Resend, etc.)
          console.log(`[Valuation Queue] Email would be sent to ${nextItem.leadEmail}: ${shareableLink}`);
        }

        console.log(`[Valuation Queue] Report delivered for ${nextItem.leadName}: ${shareableLink}`);

        // Mark as completed
        nextItem.status = "completed";
        nextItem.updatedAt = new Date().toISOString();
        nextItem.valuationReportId = saveData.report?.id;
        nextItem.shareableLink = shareableLink || undefined;
        nextItem.emailSentAt = new Date().toISOString(); // Would be actual send time

        // Move to completed in Spaces
        try {
          await s3Client.send(new PutObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: `${QUEUE_PREFIX}completed/${nextItem.id}.json`,
            Body: JSON.stringify(nextItem),
            ContentType: "application/json",
          }));
          await s3Client.send(new DeleteObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: `${QUEUE_PREFIX}pending/${nextItem.id}.json`,
          }));
        } catch (err) {
          console.log("[Valuation Queue] Spaces move skipped:", err);
        }

        processingCount--;

        return NextResponse.json({
          success: true,
          item: nextItem,
          shareableLink,
          message: `Valuation report generated for ${nextItem.leadName}`,
        });

      } catch (error) {
        // Mark as failed
        nextItem.status = "failed";
        nextItem.updatedAt = new Date().toISOString();
        nextItem.lastError = String(error);
        processingCount--;

        // Move to failed in Spaces
        try {
          await s3Client.send(new PutObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: `${QUEUE_PREFIX}failed/${nextItem.id}.json`,
            Body: JSON.stringify(nextItem),
            ContentType: "application/json",
          }));
        } catch (err) {
          console.log("[Valuation Queue] Spaces failed save skipped:", err);
        }

        return NextResponse.json({
          success: false,
          item: nextItem,
          error: String(error),
        }, { status: 500 });
      }
    }

    // Action: Retry failed item
    if (action === "retry") {
      const { id } = body;
      const item = queue.find(i => i.id === id && i.status === "failed");

      if (!item) {
        return NextResponse.json({ error: "Failed item not found" }, { status: 404 });
      }

      item.status = "pending";
      item.updatedAt = new Date().toISOString();
      item.lastError = undefined;

      return NextResponse.json({
        success: true,
        item,
        message: "Item moved back to pending queue",
      });
    }

    // Action: Clear completed
    if (action === "clearCompleted") {
      const completedCount = queue.filter(i => i.status === "completed").length;
      queue = queue.filter(i => i.status !== "completed");

      return NextResponse.json({
        success: true,
        cleared: completedCount,
        remaining: queue.length,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("[Valuation Queue] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE - Remove item from queue
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const index = queue.findIndex(i => i.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const removed = queue.splice(index, 1)[0];

  return NextResponse.json({
    success: true,
    removed,
  });
}
