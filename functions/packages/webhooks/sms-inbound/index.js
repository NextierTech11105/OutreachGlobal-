/**
 * DO Function: sms-inbound
 * Handle inbound SMS webhooks from SignalHouse/Twilio
 *
 * Input: Webhook payload from SMS provider
 * Output: Processing confirmation + response action
 */

async function main(args) {
  const {
    // SignalHouse format
    from,
    to,
    text,
    message_id,
    // Twilio format
    From,
    To,
    Body,
    MessageSid,
    // Common
    timestamp,
  } = args;

  // Normalize fields
  const smsData = {
    from: from || From,
    to: to || To,
    body: text || Body,
    messageId: message_id || MessageSid,
    receivedAt: timestamp || new Date().toISOString(),
    source: from ? 'signalhouse' : 'twilio',
  };

  if (!smsData.from || !smsData.body) {
    return {
      statusCode: 400,
      body: { error: 'Missing required fields: from, body' },
    };
  }

  try {
    // Analyze message intent
    const intent = analyzeIntent(smsData.body);

    // Store message in database
    // Note: In production, connect to your database here
    const stored = {
      id: `msg-${Date.now()}`,
      ...smsData,
      intent,
      status: 'received',
    };

    // Determine response action
    let responseAction = null;

    if (intent.isOptOut) {
      responseAction = {
        type: 'opt-out',
        action: 'remove-from-campaigns',
        phone: smsData.from,
      };
    } else if (intent.isInterested) {
      responseAction = {
        type: 'hot-lead',
        action: 'escalate-to-agent',
        priority: 'high',
        phone: smsData.from,
      };
    } else if (intent.isQuestion) {
      responseAction = {
        type: 'needs-response',
        action: 'queue-for-ai-response',
        phone: smsData.from,
      };
    }

    // Return for SignalHouse webhook acknowledgment
    return {
      statusCode: 200,
      body: {
        received: true,
        messageId: stored.id,
        intent,
        responseAction,
        processedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('SMS webhook error:', error);
    return {
      statusCode: 500,
      body: { error: error.message },
    };
  }
}

function analyzeIntent(body) {
  const lowerBody = body.toLowerCase().trim();

  // Opt-out detection
  const optOutKeywords = ['stop', 'unsubscribe', 'opt out', 'remove me', 'no more', 'quit', 'cancel'];
  const isOptOut = optOutKeywords.some(kw => lowerBody.includes(kw));

  // Interest signals
  const interestKeywords = [
    'yes', 'interested', 'tell me more', 'call me', 'contact me',
    'available', 'when can', 'how much', 'price', 'cost', 'deal'
  ];
  const isInterested = interestKeywords.some(kw => lowerBody.includes(kw));

  // Question detection
  const isQuestion = lowerBody.includes('?') ||
    lowerBody.startsWith('what') ||
    lowerBody.startsWith('how') ||
    lowerBody.startsWith('when') ||
    lowerBody.startsWith('where') ||
    lowerBody.startsWith('who') ||
    lowerBody.startsWith('why') ||
    lowerBody.startsWith('can') ||
    lowerBody.startsWith('do you');

  // Sentiment
  const negativeKeywords = ['no', 'not interested', 'wrong number', 'dont', "don't", 'never'];
  const isNegative = negativeKeywords.some(kw => lowerBody.includes(kw)) && !isInterested;

  return {
    isOptOut,
    isInterested,
    isQuestion,
    isNegative,
    sentiment: isOptOut ? 'opt-out' : isNegative ? 'negative' : isInterested ? 'positive' : 'neutral',
    confidence: isOptOut || isInterested ? 'high' : 'medium',
  };
}

exports.main = main;
