/**
 * DO Function: voice-inbound
 * Handle inbound voice call webhooks from Twilio
 *
 * Input: Twilio webhook payload
 * Output: TwiML response
 */

async function main(args) {
  const {
    From,
    To,
    CallSid,
    CallStatus,
    Direction,
    CallerCity,
    CallerState,
    CallerCountry,
    Digits, // DTMF input
    SpeechResult, // Speech-to-text result
    RecordingUrl,
    RecordingDuration,
  } = args;

  // Log call for tracking
  const callData = {
    from: From,
    to: To,
    callSid: CallSid,
    status: CallStatus,
    direction: Direction,
    location: {
      city: CallerCity,
      state: CallerState,
      country: CallerCountry,
    },
    receivedAt: new Date().toISOString(),
  };

  console.log('Inbound call:', JSON.stringify(callData));

  // Determine response based on call state
  let twiml;

  if (SpeechResult) {
    // Handle speech input
    const intent = analyzeSpeechIntent(SpeechResult);
    twiml = generateResponseTwiML(intent, callData);
  } else if (Digits) {
    // Handle DTMF input
    twiml = handleDTMFInput(Digits, callData);
  } else if (RecordingUrl) {
    // Handle recording completed
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for your message. A team member will get back to you shortly.</Say>
  <Hangup/>
</Response>`;
  } else {
    // Initial greeting
    twiml = generateGreetingTwiML(callData);
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml',
    },
    body: twiml,
  };
}

function generateGreetingTwiML(callData) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">
    Hi, thanks for calling. This is Gianna, your business development assistant.
  </Say>
  <Gather input="speech dtmf" timeout="5" speechTimeout="auto" action="/api/gianna/voice-gather">
    <Say voice="Polly.Matthew">
      How can I help you today? You can say things like "schedule a meeting" or "learn more about our services".
      Or press 1 to speak with a representative, 2 to leave a message.
    </Say>
  </Gather>
  <Say voice="Polly.Matthew">
    I didn't catch that. Let me connect you with a team member.
  </Say>
  <Dial timeout="30">
    <Number>${process.env.FALLBACK_PHONE || '+15551234567'}</Number>
  </Dial>
</Response>`;
}

function analyzeSpeechIntent(speech) {
  const lowerSpeech = speech.toLowerCase();

  if (lowerSpeech.includes('schedule') || lowerSpeech.includes('meeting') || lowerSpeech.includes('appointment')) {
    return { type: 'schedule', confidence: 'high' };
  }
  if (lowerSpeech.includes('price') || lowerSpeech.includes('cost') || lowerSpeech.includes('how much')) {
    return { type: 'pricing', confidence: 'high' };
  }
  if (lowerSpeech.includes('talk') || lowerSpeech.includes('speak') || lowerSpeech.includes('representative') || lowerSpeech.includes('person')) {
    return { type: 'transfer', confidence: 'high' };
  }
  if (lowerSpeech.includes('message') || lowerSpeech.includes('voicemail')) {
    return { type: 'voicemail', confidence: 'high' };
  }
  if (lowerSpeech.includes('interested') || lowerSpeech.includes('yes') || lowerSpeech.includes('tell me more')) {
    return { type: 'interested', confidence: 'high' };
  }

  return { type: 'unknown', confidence: 'low', speech };
}

function generateResponseTwiML(intent, callData) {
  switch (intent.type) {
    case 'schedule':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">
    Great! I'd be happy to help you schedule a meeting. Let me connect you with someone who can set that up for you.
  </Say>
  <Dial timeout="30">
    <Number>${process.env.SALES_PHONE || process.env.FALLBACK_PHONE || '+15551234567'}</Number>
  </Dial>
</Response>`;

    case 'pricing':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">
    Our pricing varies based on your specific needs. I'll connect you with a team member who can give you a custom quote.
  </Say>
  <Dial timeout="30">
    <Number>${process.env.SALES_PHONE || process.env.FALLBACK_PHONE || '+15551234567'}</Number>
  </Dial>
</Response>`;

    case 'transfer':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">
    Sure, let me transfer you now.
  </Say>
  <Dial timeout="30">
    <Number>${process.env.FALLBACK_PHONE || '+15551234567'}</Number>
  </Dial>
</Response>`;

    case 'voicemail':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">
    Please leave your message after the tone. Press pound when finished.
  </Say>
  <Record maxLength="120" finishOnKey="#" action="/api/gianna/call-complete" />
</Response>`;

    case 'interested':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">
    Wonderful! I'm glad you're interested. Let me connect you with one of our specialists who can answer all your questions.
  </Say>
  <Dial timeout="30">
    <Number>${process.env.SALES_PHONE || process.env.FALLBACK_PHONE || '+15551234567'}</Number>
  </Dial>
</Response>`;

    default:
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">
    I want to make sure I help you properly. Let me connect you with a team member.
  </Say>
  <Dial timeout="30">
    <Number>${process.env.FALLBACK_PHONE || '+15551234567'}</Number>
  </Dial>
</Response>`;
  }
}

function handleDTMFInput(digits, callData) {
  switch (digits) {
    case '1':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">Connecting you now.</Say>
  <Dial timeout="30">
    <Number>${process.env.FALLBACK_PHONE || '+15551234567'}</Number>
  </Dial>
</Response>`;

    case '2':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">Please leave your message after the tone. Press pound when finished.</Say>
  <Record maxLength="120" finishOnKey="#" action="/api/gianna/call-complete" />
</Response>`;

    default:
      return generateGreetingTwiML(callData);
  }
}

exports.main = main;
