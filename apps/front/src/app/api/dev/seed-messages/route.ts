import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { smsMessages, callLogs } from "@/lib/db/schema";

// DEV ONLY - Seed test messages for inbox testing
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Insert sample SMS messages
    const smsSeeds = [
      {
        direction: "inbound",
        fromNumber: "+15551234567",
        toNumber: "+18881234567",
        body: "Hi, I'm interested in discussing my business exit options. When are you available?",
        status: "received",
        provider: "signalhouse",
        receivedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        direction: "outbound",
        fromNumber: "+18881234567",
        toNumber: "+15559876543",
        body: "Good afternoon! This is Gianna from Nextier. I wanted to follow up on your inquiry about business valuation services. Would you have time for a brief call this week?",
        status: "delivered",
        provider: "signalhouse",
        sentByAdvisor: "gianna",
        aiGenerated: true,
        sentAt: oneHourAgo,
        deliveredAt: oneHourAgo,
        createdAt: oneHourAgo,
        updatedAt: oneHourAgo,
      },
      {
        direction: "inbound",
        fromNumber: "+15559876543",
        toNumber: "+18881234567",
        body: "Yes, Thursday afternoon works for me. What times do you have?",
        status: "received",
        provider: "signalhouse",
        receivedAt: twoHoursAgo,
        createdAt: twoHoursAgo,
        updatedAt: twoHoursAgo,
      },
      {
        direction: "outbound",
        fromNumber: "+18881234567",
        toNumber: "+15552223333",
        body: "Hello! I saw you downloaded our M&A guide. I'd love to answer any questions you might have about the process.",
        status: "sent",
        provider: "signalhouse",
        sentByAdvisor: "sabrina",
        sentAt: oneDayAgo,
        createdAt: oneDayAgo,
        updatedAt: oneDayAgo,
      },
      {
        direction: "inbound",
        fromNumber: "+15554445555",
        toNumber: "+18881234567",
        body: "STOP",
        status: "received",
        provider: "signalhouse",
        receivedAt: oneDayAgo,
        createdAt: oneDayAgo,
        updatedAt: oneDayAgo,
      },
    ];

    // Insert sample call logs
    const callSeeds = [
      {
        direction: "inbound",
        fromNumber: "+15551112222",
        toNumber: "+18881234567",
        status: "completed",
        duration: 145,
        transcription: "Caller inquired about selling their manufacturing business. They have annual revenue of $5M and want to retire within 2 years.",
        startedAt: oneHourAgo,
        endedAt: new Date(oneHourAgo.getTime() + 145 * 1000),
        createdAt: oneHourAgo,
        updatedAt: oneHourAgo,
      },
      {
        direction: "outbound",
        fromNumber: "+18881234567",
        toNumber: "+15553334444",
        status: "completed",
        duration: 312,
        transcription: "Follow-up call with prospect. Discussed valuation methodology and next steps for confidential information memorandum.",
        startedAt: twoHoursAgo,
        endedAt: new Date(twoHoursAgo.getTime() + 312 * 1000),
        createdAt: twoHoursAgo,
        updatedAt: twoHoursAgo,
      },
      {
        direction: "inbound",
        fromNumber: "+15556667777",
        toNumber: "+18881234567",
        status: "missed",
        duration: 0,
        startedAt: oneDayAgo,
        createdAt: oneDayAgo,
        updatedAt: oneDayAgo,
      },
    ];

    // Insert into database
    const insertedSms = await db.insert(smsMessages).values(smsSeeds).returning({ id: smsMessages.id });
    const insertedCalls = await db.insert(callLogs).values(callSeeds).returning({ id: callLogs.id });

    return NextResponse.json({
      success: true,
      message: "Test messages seeded successfully",
      inserted: {
        smsMessages: insertedSms.length,
        callLogs: insertedCalls.length,
      },
    });
  } catch (error) {
    console.error("[Seed Messages] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to seed messages",
      },
      { status: 500 }
    );
  }
}

// GET - Check count of messages
export async function GET() {
  try {
    const smsCount = await db.select({ count: smsMessages.id }).from(smsMessages);
    const callCount = await db.select({ count: callLogs.id }).from(callLogs);

    return NextResponse.json({
      smsMessages: smsCount.length,
      callLogs: callCount.length,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to count",
    });
  }
}
