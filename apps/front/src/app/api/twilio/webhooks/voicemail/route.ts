import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/twilio/webhooks/voicemail
 *
 * Webhook for voicemail recordings.
 * Called when caller leaves a voicemail message.
 */

export async function POST(request: NextRequest) {
  try {
    // Parse Twilio webhook data
    const formData = await request.formData();

    const callSid = (formData.get("CallSid") as string) || "";
    const from = (formData.get("From") as string) || "";
    const to = (formData.get("To") as string) || "";
    const recordingUrl = (formData.get("RecordingUrl") as string) || "";
    const recordingDuration =
      (formData.get("RecordingDuration") as string) || "0";
    const recordingSid = (formData.get("RecordingSid") as string) || "";
    const transcriptionText =
      (formData.get("TranscriptionText") as string) || "";

    console.log(`[Twilio Voicemail] New voicemail from ${from}`);
    console.log(
      `  Duration: ${recordingDuration}s, Recording: ${recordingSid}`,
    );
    if (transcriptionText) {
      console.log(`  Transcription: ${transcriptionText}`);
    }

    // Save voicemail to database
    await saveVoicemail({
      callSid,
      from,
      to,
      recordingUrl: recordingUrl + ".mp3",
      recordingSid,
      duration: parseInt(recordingDuration, 10),
      transcription: transcriptionText,
    });

    // Return TwiML to end call
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for your message. We'll get back to you soon.</Say>
  <Hangup/>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("[Twilio Voicemail] Error:", error);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
}

// Save voicemail to database
async function saveVoicemail(data: {
  callSid: string;
  from: string;
  to: string;
  recordingUrl: string;
  recordingSid: string;
  duration: number;
  transcription: string;
}) {
  // TODO: Insert into voicemails table
  // await db.insert(voicemails).values({
  //   ...data,
  //   status: 'new',
  //   createdAt: new Date(),
  // });

  console.log("[Twilio] Voicemail saved:", data);

  // TODO: Notify user of new voicemail
  // - Send email notification
  // - Push notification in app
  // - SMS notification
}

// GET - Return webhook info
export async function GET() {
  return NextResponse.json({
    endpoint: "Twilio Voicemail Webhook",
    description: "Receives voicemail recordings from Twilio",
    data: ["RecordingUrl", "RecordingDuration", "TranscriptionText"],
    method: "POST (called by Twilio)",
  });
}
