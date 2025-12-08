import { NextRequest, NextResponse } from "next/server";
import { classifyResponse } from "@/lib/gianna/gianna-service";

/**
 * GIANNA AI TRANSCRIPTION WEBHOOK
 *
 * Processes voicemail transcriptions with Gianna's intelligence:
 * - Intent classification
 * - Priority routing
 * - Automated follow-up scheduling
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract transcription data from Twilio webhook
    const transcriptionSid = formData.get("TranscriptionSid") as string;
    const transcriptionText = formData.get("TranscriptionText") as string;
    const transcriptionStatus = formData.get("TranscriptionStatus") as string;
    const recordingSid = formData.get("RecordingSid") as string;
    const recordingUrl = formData.get("RecordingUrl") as string;
    const callSid = formData.get("CallSid") as string;
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;

    console.log("[Gianna Transcription] Received:", {
      transcriptionSid,
      status: transcriptionStatus,
      from,
      textLength: transcriptionText?.length || 0,
    });

    // Only process completed transcriptions
    if (transcriptionStatus !== "completed") {
      return new NextResponse("OK", { status: 200 });
    }

    if (!transcriptionText) {
      console.log("[Gianna Transcription] No text in transcription");
      return new NextResponse("OK", { status: 200 });
    }

    // ═════════════════════════════════════════════════
    // STEP 1: Classify intent using Gianna
    // ═════════════════════════════════════════════════
    const classification = classifyResponse(transcriptionText);
    console.log("[Gianna Transcription] Classification:", classification);

    // ═════════════════════════════════════════════════
    // STEP 2: Determine priority and action
    // ═════════════════════════════════════════════════
    const isHotLead = ["interested", "request_call", "request_info"].includes(classification.intent);
    const isOptOut = ["opt_out", "anger", "hard_no"].includes(classification.intent);

    let priority: "high" | "medium" | "low" = "medium";
    let action: string = "review";

    if (isHotLead) {
      priority = "high";
      action = "callback_urgent";
    } else if (isOptOut) {
      priority = "low";
      action = "add_to_dnc";
    } else if (classification.intent === "question") {
      priority = "medium";
      action = "callback";
    }

    // ═════════════════════════════════════════════════
    // STEP 3: Get AI insights
    // ═════════════════════════════════════════════════
    let aiInsights = {
      intent: classification.intent,
      confidence: classification.confidence,
      sentiment: classification.sentiment,
      priority,
      suggestedAction: action,
      suggestedPersonality: classification.suggestedPersonality,
    };

    try {
      const analyzeResponse = await fetch(`${APP_URL}/api/ai/analyze-voicemail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcription: transcriptionText,
          from,
          to,
          callSid,
          giannaClassification: classification,
        }),
      });

      if (analyzeResponse.ok) {
        const fullAnalysis = await analyzeResponse.json();
        aiInsights = { ...aiInsights, ...fullAnalysis };
      }
    } catch (err) {
      console.error("[Gianna Transcription] AI analysis failed:", err);
    }

    // ═════════════════════════════════════════════════
    // STEP 4: Store and route the voicemail
    // ═════════════════════════════════════════════════
    console.log("[Gianna Transcription] Processed voicemail:", {
      from,
      text: transcriptionText.slice(0, 100) + "...",
      insights: aiInsights,
    });

    // Store the voicemail
    try {
      await fetch(`${APP_URL}/api/inbox/voicemail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          callSid,
          transcriptionSid,
          transcription: transcriptionText,
          recordingUrl,
          insights: aiInsights,
          priority,
          action,
          createdAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("[Gianna Transcription] Failed to store voicemail:", err);
    }

    // ═════════════════════════════════════════════════
    // STEP 5: Trigger notifications for hot leads
    // ═════════════════════════════════════════════════
    if (priority === "high") {
      try {
        await fetch(`${APP_URL}/api/notifications/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "voicemail_hot_lead",
            priority: "high",
            title: "Hot Lead Voicemail",
            message: `New voicemail from ${from}: "${transcriptionText.slice(0, 100)}..."`,
            from,
            transcription: transcriptionText,
            insights: aiInsights,
            recordingUrl,
            action: "callback_required",
          }),
        });
      } catch (err) {
        console.error("[Gianna Transcription] Failed to send notification:", err);
      }
    }

    // ═════════════════════════════════════════════════
    // STEP 6: Handle opt-out if detected
    // ═════════════════════════════════════════════════
    if (isOptOut) {
      try {
        await fetch(`${APP_URL}/api/suppression`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: from,
            reason: "voicemail_opt_out",
            source: "gianna_transcription",
            transcription: transcriptionText,
          }),
        });
      } catch (err) {
        console.error("[Gianna Transcription] Failed to add to suppression list:", err);
      }
    }

    // ═════════════════════════════════════════════════
    // STEP 7: Schedule follow-up SMS if appropriate
    // ═════════════════════════════════════════════════
    if (isHotLead) {
      try {
        await fetch(`${APP_URL}/api/sms/queue`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: from,
            template: "voicemail_followup",
            scheduledFor: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min delay
            context: {
              transcription: transcriptionText,
              intent: classification.intent,
            },
          }),
        });
      } catch (err) {
        console.error("[Gianna Transcription] Failed to queue follow-up SMS:", err);
      }
    }

    return NextResponse.json({
      success: true,
      transcriptionSid,
      processed: true,
      classification: {
        intent: classification.intent,
        confidence: classification.confidence,
        sentiment: classification.sentiment,
      },
      priority,
      action,
    });

  } catch (error) {
    console.error("[Gianna Transcription] Error:", error);
    return new NextResponse("OK", { status: 200 }); // Always return 200 to Twilio
  }
}

// Support GET for webhook verification
export async function GET() {
  return NextResponse.json({
    service: "Gianna AI Transcription Webhook",
    version: "2.0.0",
    status: "active",
    capabilities: [
      "Intent classification",
      "Priority routing",
      "Hot lead detection",
      "Opt-out handling",
      "Follow-up scheduling",
    ],
    timestamp: new Date().toISOString(),
  });
}
