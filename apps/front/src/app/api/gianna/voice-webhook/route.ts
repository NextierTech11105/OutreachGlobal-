import { NextRequest, NextResponse } from "next/server";

// Gianna AI Voice webhook handler
// This handles inbound calls with AI-powered voice responses

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract Twilio webhook parameters
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;

    console.log("[Gianna Voice] Inbound call:", { from, to, callSid, callStatus });

    // Generate TwiML for call handling
    // This is a basic implementation - in production you'd use Twilio AI or a custom voice model
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">
    Hello! Thank you for calling. This is Gianna, your AI assistant.
    I'm here to help you with property inquiries.
  </Say>

  <Gather input="speech" timeout="5" speechTimeout="auto" action="/api/gianna/voice-gather">
    <Say voice="alice">
      Are you interested in learning about property values in your area?
      Please tell me about your property or press any key to speak with a representative.
    </Say>
  </Gather>

  <Say voice="alice">
    I didn't catch that. Let me connect you with a team member.
  </Say>

  <!-- Fallback to voicemail or forwarding -->
  <Record maxLength="120" transcribe="true" transcribeCallback="/api/gianna/transcription" />

  <Say voice="alice">
    Thank you for your message. We'll get back to you shortly. Goodbye!
  </Say>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[Gianna Voice] Error:", error);

    // Fallback TwiML
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">
    We're sorry, we're experiencing technical difficulties.
    Please try again later or leave a message after the beep.
  </Say>
  <Record maxLength="60" />
</Response>`;

    return new NextResponse(fallbackTwiml, {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
