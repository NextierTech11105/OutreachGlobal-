/**
 * DO Function: generate-sms
 * AI-powered SMS message generation for campaigns
 *
 * Input: { lead, template, context, options }
 * Output: { message, tokens, model }
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function generateWithOpenAI(prompt, options = {}) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: options.model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional sales assistant crafting personalized SMS messages.
Keep messages under 160 characters when possible for single SMS delivery.
Be conversational but professional. Never use emojis unless specifically requested.
Focus on value proposition and clear call-to-action.`,
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 150,
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  return {
    message: data.choices[0]?.message?.content?.trim(),
    tokens: data.usage?.total_tokens,
    model: data.model,
  };
}

async function generateWithAnthropic(prompt, options = {}) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: options.model || 'claude-3-haiku-20240307',
      max_tokens: 150,
      system: `You are a professional sales assistant crafting personalized SMS messages.
Keep messages under 160 characters when possible for single SMS delivery.
Be conversational but professional. Never use emojis unless specifically requested.
Focus on value proposition and clear call-to-action.`,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  return {
    message: data.content[0]?.text?.trim(),
    tokens: data.usage?.input_tokens + data.usage?.output_tokens,
    model: data.model,
  };
}

function buildPrompt(lead, template, context) {
  const variables = {
    firstName: lead.firstName || 'there',
    lastName: lead.lastName || '',
    company: lead.company || 'your company',
    title: lead.title || '',
    city: lead.city || '',
    state: lead.state || '',
    industry: lead.industry || '',
    propertyValue: lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : '',
    equityAmount: lead.equityAmount ? `$${lead.equityAmount.toLocaleString()}` : '',
  };

  // Replace template variables
  let message = template;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  // Build prompt for AI
  return `Generate a personalized SMS message for the following context:

Lead Info:
- Name: ${variables.firstName} ${variables.lastName}
- Company: ${variables.company}
- Title: ${variables.title}
- Location: ${variables.city}, ${variables.state}
- Industry: ${variables.industry}
${variables.propertyValue ? `- Property Value: ${variables.propertyValue}` : ''}
${variables.equityAmount ? `- Equity: ${variables.equityAmount}` : ''}

Template/Tone: ${template}

Additional Context: ${context || 'First outreach message'}

Generate a single SMS message that is:
1. Personalized with the lead's info
2. Under 160 characters if possible (max 320)
3. Has a clear value proposition
4. Includes a soft call-to-action
5. Professional but conversational

Output ONLY the SMS message text, nothing else.`;
}

async function main(args) {
  const { lead, template, context, options = {} } = args;

  if (!lead) {
    return {
      statusCode: 400,
      body: { error: 'Missing lead data' },
    };
  }

  const defaultTemplate = `Hi {{firstName}}, I noticed {{company}} in {{city}} and wanted to reach out about a potential opportunity. Would you be open to a quick chat?`;
  const prompt = buildPrompt(lead, template || defaultTemplate, context);

  try {
    let result;

    // Use Anthropic if available, otherwise OpenAI
    if (ANTHROPIC_API_KEY && options.provider !== 'openai') {
      result = await generateWithAnthropic(prompt, options);
      result.provider = 'anthropic';
    } else if (OPENAI_API_KEY) {
      result = await generateWithOpenAI(prompt, options);
      result.provider = 'openai';
    } else {
      return {
        statusCode: 500,
        body: { error: 'No AI provider configured' },
      };
    }

    // Add character count
    result.charCount = result.message?.length || 0;
    result.smsSegments = Math.ceil(result.charCount / 160);

    return {
      statusCode: 200,
      body: result,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: { error: error.message },
    };
  }
}

exports.main = main;
