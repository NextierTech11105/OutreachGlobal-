import { NextRequest, NextResponse } from 'next/server';
import { Twilio } from 'twilio';

/**
 * POST /api/twilio/click-to-call
 *
 * Initiate an outbound call using Twilio.
 * Repeatable execution - can be triggered from calendar, inbox, or any lead view.
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, leadId, teamId, callbackId, from } = body;

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Phone number (to) is required' },
        { status: 400 }
      );
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    // Normalize phone number
    const normalizedTo = normalizePhone(to);
    if (!normalizedTo) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const client = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // Get team's outbound number or use default
    const outboundNumber = from || process.env.TWILIO_DEFAULT_NUMBER;

    if (!outboundNumber) {
      return NextResponse.json(
        { success: false, error: 'No outbound number configured' },
        { status: 400 }
      );
    }

    // Create TwiML for the call
    const twimlUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/outbound?leadId=${leadId || ''}&teamId=${teamId || ''}`;

    // Initiate the call
    const call = await client.calls.create({
      to: normalizedTo,
      from: outboundNumber,
      url: twimlUrl,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/webhooks/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      machineDetection: 'Enable',
      machineDetectionTimeout: 5,
    });

    // Log the call
    await logCall({
      callSid: call.sid,
      teamId,
      leadId,
      callbackId,
      direction: 'outbound',
      status: 'initiated',
      to: normalizedTo,
      from: outboundNumber,
    });

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status,
    });
  } catch (error: any) {
    console.error('Click-to-call error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initiate call' },
      { status: 500 }
    );
  }
}

// Normalize phone to E.164 format
function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    return `+${digits}`;
  } else if (digits.length > 10) {
    return `+${digits}`;
  }

  return null;
}

// Log call to database
async function logCall(data: {
  callSid: string;
  teamId?: string;
  leadId?: string;
  callbackId?: string;
  direction: 'outbound' | 'inbound';
  status: string;
  to: string;
  from: string;
}) {
  // TODO: Insert into call_logs table
  // await db.insert(callLogs).values({
  //   ...data,
  //   createdAt: new Date(),
  // });
  console.log('Call logged:', data);
}
