import { NextRequest, NextResponse } from "next/server";

// Gianna AI Transcription webhook handler
// Receives transcriptions from Twilio and processes them

interface TranscriptionPayload {
  TranscriptionSid: string;
  TranscriptionText: string;
  TranscriptionStatus: string;
  TranscriptionUrl: string;
  RecordingSid: string;
  RecordingUrl: string;
  CallSid: string;
  From: string;
  To: string;
  AccountSid: string;
}

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

    // Process the transcription with AI to extract insights
    let aiInsights = null;

    try {
      const suggestResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app"}/api/ai/analyze-voicemail`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcription: transcriptionText,
            from,
            to,
            callSid,
          }),
        }
      );

      if (suggestResponse.ok) {
        aiInsights = await suggestResponse.json();
      }
    } catch (err) {
      console.error("[Gianna Transcription] AI analysis failed:", err);
    }

    // Store transcription in database or send notification
    // In production, this would save to a leads table or send a notification

    // Log the transcription for now
    console.log("[Gianna Transcription] Processed voicemail:", {
      from,
      text: transcriptionText.slice(0, 100) + "...",
      insights: aiInsights,
    });

    // If high-priority voicemail detected, trigger notification
    if (aiInsights?.priority === "high" || aiInsights?.intent === "interested") {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app"}/api/notifications/send`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "voicemail",
              priority: "high",
              from,
              transcription: transcriptionText,
              insights: aiInsights,
              recordingUrl,
            }),
          }
        );
      } catch (err) {
        console.error("[Gianna Transcription] Failed to send notification:", err);
      }
    }

    // Return success
    return NextResponse.json({
      success: true,
      transcriptionSid,
      processed: true,
      insights: aiInsights,
    });
  } catch (error) {
    console.error("[Gianna Transcription] Error:", error);
    return new NextResponse("OK", { status: 200 }); // Always return 200 to Twilio
  }
}

// Also support GET for webhook verification
export async function GET() {
  return NextResponse.json({
    service: "Gianna AI Transcription Webhook",
    status: "active",
    timestamp: new Date().toISOString(),
  });
}
