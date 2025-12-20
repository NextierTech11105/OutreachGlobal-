// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL CAPTURE RESPONSE LIBRARY - GIANNA AI
// ═══════════════════════════════════════════════════════════════════════════════
//
// FLOW: SMS → Email Capture → Email with Intro → Strategy Session Scheduling
//
// When lead responds with email, GIANNA confirms and queues the email.
// This library provides robust, varied, natural-sounding confirmation templates.
//
// CRITICAL: These are SMS responses - 160 char max, natural, conversational
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmailCaptureTemplate {
  id: string;
  category: "standard" | "property" | "business" | "warm" | "quick" | "weekend";
  template: string;
  variables: string[]; // {firstName}, {email}, {propertyAddress}, {worker}
  timing?: "immediate" | "same_day" | "next_day" | "weekend";
  useWhen?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDARD EMAIL CAPTURE CONFIRMATIONS
// When lead gives email → Confirm we got it → Promise delivery
// ═══════════════════════════════════════════════════════════════════════════════

export const EMAIL_CAPTURE_CONFIRMATIONS: EmailCaptureTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // STANDARD CONFIRMATIONS - Generic, works for any context
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "ec_standard_1",
    category: "standard",
    template: "{firstName} no problem ! I will have sent to you this weekend ! - {worker}",
    variables: ["firstName", "worker"],
    timing: "weekend",
    useWhen: ["friday", "saturday", "weekend_request"],
  },
  {
    id: "ec_standard_2",
    category: "standard",
    template: "Perfect {firstName}! Sending that over to {email} now. Check your inbox in a few! - {worker}",
    variables: ["firstName", "email", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_standard_3",
    category: "standard",
    template: "{firstName} sure! I will have that sent over shortly. Talk soon! - {worker}",
    variables: ["firstName", "worker"],
    timing: "same_day",
  },
  {
    id: "ec_standard_4",
    category: "standard",
    template: "Got it {firstName}! Your report is on its way to {email}. Let me know when you get it! - {worker}",
    variables: ["firstName", "email", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_standard_5",
    category: "standard",
    template: "You got it {firstName}! Sending to {email} now. Have a great day! - {worker}",
    variables: ["firstName", "email", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_standard_6",
    category: "standard",
    template: "{firstName} absolutely! I'll get that out to you by end of day. - {worker}",
    variables: ["firstName", "worker"],
    timing: "same_day",
  },
  {
    id: "ec_standard_7",
    category: "standard",
    template: "Great {firstName}! Just queued that up for you. Should hit your inbox shortly! - {worker}",
    variables: ["firstName", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_standard_8",
    category: "standard",
    template: "{firstName} perfect! I'll have that in your inbox within the hour. - {worker}",
    variables: ["firstName", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_standard_9",
    category: "standard",
    template: "Done! Sending to {email} right now {firstName}. Check spam just in case! - {worker}",
    variables: ["email", "firstName", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_standard_10",
    category: "standard",
    template: "{firstName} - on it! Look for an email from me shortly. Talk soon! - {worker}",
    variables: ["firstName", "worker"],
    timing: "same_day",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PROPERTY-SPECIFIC - When sending valuation reports
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "ec_property_1",
    category: "property",
    template: "{firstName} sure! I'll have that valuation report sent to you shortly. - {worker}",
    variables: ["firstName", "worker"],
    timing: "same_day",
  },
  {
    id: "ec_property_2",
    category: "property",
    template: "Perfect {firstName}! Property analysis for {propertyAddress} coming your way! - {worker}",
    variables: ["firstName", "propertyAddress", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_property_3",
    category: "property",
    template: "{firstName} got it! I'll finalize the numbers on {propertyAddress} and send over today. - {worker}",
    variables: ["firstName", "propertyAddress", "worker"],
    timing: "same_day",
  },
  {
    id: "ec_property_4",
    category: "property",
    template: "You'll have that report in your inbox soon {firstName}. The numbers are interesting! - {worker}",
    variables: ["firstName", "worker"],
    timing: "same_day",
  },
  {
    id: "ec_property_5",
    category: "property",
    template: "{firstName} - sending your property breakdown to {email} now. Let me know if questions! - {worker}",
    variables: ["firstName", "email", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_property_6",
    category: "property",
    template: "Got it {firstName}! I'll pull the latest comps for {propertyAddress} and send over. - {worker}",
    variables: ["firstName", "propertyAddress", "worker"],
    timing: "same_day",
  },
  {
    id: "ec_property_7",
    category: "property",
    template: "{firstName} perfect! Your valuation is almost ready - sending to {email} shortly! - {worker}",
    variables: ["firstName", "email", "worker"],
    timing: "same_day",
  },
  {
    id: "ec_property_8",
    category: "property",
    template: "Awesome {firstName}! The report on {propertyAddress} will be in your inbox soon. Exciting stuff! - {worker}",
    variables: ["firstName", "propertyAddress", "worker"],
    timing: "same_day",
  },
  {
    id: "ec_property_9",
    category: "property",
    template: "{firstName} sure thing! I'll have the full property analysis out to you by tomorrow. - {worker}",
    variables: ["firstName", "worker"],
    timing: "next_day",
  },
  {
    id: "ec_property_10",
    category: "property",
    template: "On it {firstName}! Your property report is being finalized now. Check your email soon! - {worker}",
    variables: ["firstName", "worker"],
    timing: "immediate",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // BUSINESS-SPECIFIC - Blue collar, acquisition targets
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "ec_business_1",
    category: "business",
    template: "{firstName} great! I'll send over the business analysis shortly. Good stuff coming! - {worker}",
    variables: ["firstName", "worker"],
    timing: "same_day",
  },
  {
    id: "ec_business_2",
    category: "business",
    template: "Perfect {firstName}! Your exit strategy guide is on its way to {email}. - {worker}",
    variables: ["firstName", "email", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_business_3",
    category: "business",
    template: "{firstName} you got it! Business valuation coming your way. The numbers might surprise you! - {worker}",
    variables: ["firstName", "worker"],
    timing: "same_day",
  },
  {
    id: "ec_business_4",
    category: "business",
    template: "Got it {firstName}! I'll send the AI efficiency report to {email} shortly. Game changer! - {worker}",
    variables: ["firstName", "email", "worker"],
    timing: "same_day",
  },
  {
    id: "ec_business_5",
    category: "business",
    template: "{firstName} - sending that over now. I think you'll find some quick wins in there! - {worker}",
    variables: ["firstName", "worker"],
    timing: "immediate",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // WARM/ENTHUSIASTIC - When lead seems very interested
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "ec_warm_1",
    category: "warm",
    template: "Awesome {firstName}! So glad you're interested. Report heading to {email} now! - {worker}",
    variables: ["firstName", "email", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_warm_2",
    category: "warm",
    template: "{firstName} you're gonna love this! Sending it over now. Let's chat after you review! - {worker}",
    variables: ["firstName", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_warm_3",
    category: "warm",
    template: "Love it {firstName}! I'll get that to you ASAP. Excited to hear what you think! - {worker}",
    variables: ["firstName", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_warm_4",
    category: "warm",
    template: "{firstName} perfect timing! I was just finishing up your report. Sending now! - {worker}",
    variables: ["firstName", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_warm_5",
    category: "warm",
    template: "Excellent {firstName}! This is good stuff - can't wait for you to see it. On its way! - {worker}",
    variables: ["firstName", "worker"],
    timing: "immediate",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // QUICK/BRIEF - Short and sweet
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "ec_quick_1",
    category: "quick",
    template: "Got it {firstName}! Sending now 📧 - {worker}",
    variables: ["firstName", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_quick_2",
    category: "quick",
    template: "{firstName} - done! Check your inbox. - {worker}",
    variables: ["firstName", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_quick_3",
    category: "quick",
    template: "Perfect! On its way {firstName}. - {worker}",
    variables: ["firstName", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_quick_4",
    category: "quick",
    template: "Sent! Check {email} shortly {firstName}. - {worker}",
    variables: ["email", "firstName", "worker"],
    timing: "immediate",
  },
  {
    id: "ec_quick_5",
    category: "quick",
    template: "{firstName} 👍 Sending now! - {worker}",
    variables: ["firstName", "worker"],
    timing: "immediate",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // WEEKEND/DELAYED - When promising weekend delivery
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "ec_weekend_1",
    category: "weekend",
    template: "{firstName} no problem! I will have sent to you this weekend! - {worker}",
    variables: ["firstName", "worker"],
    timing: "weekend",
  },
  {
    id: "ec_weekend_2",
    category: "weekend",
    template: "{firstName} sure! I'll have that ready for you by Monday. Enjoy your weekend! - {worker}",
    variables: ["firstName", "worker"],
    timing: "weekend",
  },
  {
    id: "ec_weekend_3",
    category: "weekend",
    template: "Got it {firstName}! Working on it this weekend. You'll have it Monday morning! - {worker}",
    variables: ["firstName", "worker"],
    timing: "weekend",
  },
  {
    id: "ec_weekend_4",
    category: "weekend",
    template: "{firstName} - sending over the weekend! Will follow up Monday to discuss. - {worker}",
    variables: ["firstName", "worker"],
    timing: "weekend",
  },
  {
    id: "ec_weekend_5",
    category: "weekend",
    template: "Perfect {firstName}! I'll get that finalized this weekend and send first thing Monday. - {worker}",
    variables: ["firstName", "worker"],
    timing: "weekend",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL INTRO TEMPLATES - What goes in the email after capture
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmailIntroTemplate {
  id: string;
  category: "property_valuation" | "business_valuation" | "exit_strategy" | "ai_efficiency";
  subject: string;
  body: string;
  includesCalendarLink: boolean;
  includesReportLink: boolean;
}

export const EMAIL_INTRO_TEMPLATES: EmailIntroTemplate[] = [
  {
    id: "email_property_1",
    category: "property_valuation",
    subject: "{firstName}, your property analysis is ready",
    body: `Hey {firstName},

Great chatting with you! As promised, here's that property analysis we talked about:

📊 **Your Property Report**
{reportLink}

I put together some numbers on {propertyAddress} - the valuation, market trends, and what I'm seeing in your area. Take a look and let me know what questions come up.

🗓️ **Book Your Strategy Session**
{calendarLink}

This is a quick 15-minute call where we dig into what the numbers mean for YOUR situation. No sales pitch, just straight talk about your options.

Talk soon,
{worker}

P.S. - Spots fill up fast, so grab a time that works for you!`,
    includesCalendarLink: true,
    includesReportLink: true,
  },
  {
    id: "email_property_2",
    category: "property_valuation",
    subject: "Here's what I found on {propertyAddress}",
    body: `{firstName},

Just finished running the numbers on your property - there's some interesting stuff in here.

**Your Report:** {reportLink}

Quick highlights:
- Current market value estimate
- Recent comparable sales
- Market trend analysis
- Your options moving forward

When you're ready to talk through it, here's my calendar: {calendarLink}

15 minutes, no pressure. Just answers to your questions.

{worker}`,
    includesCalendarLink: true,
    includesReportLink: true,
  },
  {
    id: "email_property_3",
    category: "property_valuation",
    subject: "{firstName} - the numbers are in",
    body: `{firstName},

Got your property analysis done. Here's the link: {reportLink}

TL;DR - there's opportunity here. But let's talk about what that actually means for your situation.

Book 15 mins when you have a chance: {calendarLink}

I'll walk you through everything and answer any questions.

{worker}`,
    includesCalendarLink: true,
    includesReportLink: true,
  },
  {
    id: "email_business_1",
    category: "business_valuation",
    subject: "{firstName}, your business analysis is ready",
    body: `Hey {firstName},

As promised - here's that analysis we talked about:

📊 **Your Business Report**
{reportLink}

I looked at efficiency opportunities, time savings, and where AI could help {companyName} run smoother. Some quick wins in there.

🗓️ **15-Min Strategy Call**
{calendarLink}

Let's talk through what makes sense for YOUR business. No generic advice - specific to what you're dealing with.

{worker}`,
    includesCalendarLink: true,
    includesReportLink: true,
  },
  {
    id: "email_exit_1",
    category: "exit_strategy",
    subject: "{firstName} - your exit strategy guide",
    body: `{firstName},

Here's that exit strategy info I mentioned: {reportLink}

Whether you're thinking about selling in 1 year or 10, this covers:
- How to maximize your business value
- What buyers are looking for
- Timeline and preparation steps
- Common mistakes to avoid

Ready to talk specifics? {calendarLink}

{worker}`,
    includesCalendarLink: true,
    includesReportLink: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT LINK RESPONSES - 2-BRACKET SMS FLOW (Permission → Link Delivery)
// ═══════════════════════════════════════════════════════════════════════════════
//
// FLOW: "Can I send you [Medium article / newsletter / blueprint]?" → "Yes" → Send link via SMS
// Same 2-bracket structure as email capture, but Value X is a link sent via SMS
//
// ═══════════════════════════════════════════════════════════════════════════════

export interface ContentLinkTemplate {
  id: string;
  category: "standard" | "article" | "newsletter" | "blueprint" | "video" | "warm" | "quick";
  template: string;
  variables: string[]; // {firstName}, {contentUrl}, {contentTitle}, {worker}
  contentType?: "MEDIUM_ARTICLE" | "NEWSLETTER" | "VIDEO" | "EBOOK" | "ONE_PAGER" | "CASE_STUDY";
}

export const CONTENT_LINK_CONFIRMATIONS: ContentLinkTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // STANDARD - Generic content link sends
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "cl_standard_1",
    category: "standard",
    template: "Great! Here it is: {contentUrl}\n\nLet me know what you think! - {worker}",
    variables: ["contentUrl", "worker"],
  },
  {
    id: "cl_standard_2",
    category: "standard",
    template: "You got it! {contentUrl}\n\nCurious to hear your thoughts - {worker}",
    variables: ["contentUrl", "worker"],
  },
  {
    id: "cl_standard_3",
    category: "standard",
    template: "Here you go {firstName}: {contentUrl}\n\nShoot me a text after you check it out! - {worker}",
    variables: ["firstName", "contentUrl", "worker"],
  },
  {
    id: "cl_standard_4",
    category: "standard",
    template: "Sending now! {contentUrl}\n\nQuick read - worth it. - {worker}",
    variables: ["contentUrl", "worker"],
  },
  {
    id: "cl_standard_5",
    category: "standard",
    template: "{firstName} here's that link: {contentUrl}\n\nLet me know if you have questions! - {worker}",
    variables: ["firstName", "contentUrl", "worker"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ARTICLE - Medium articles, blog posts
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "cl_article_1",
    category: "article",
    template: "Here's the article: {contentUrl}\n\n5 min read - some good stuff in there! - {worker}",
    variables: ["contentUrl", "worker"],
    contentType: "MEDIUM_ARTICLE",
  },
  {
    id: "cl_article_2",
    category: "article",
    template: "{firstName} - here it is: {contentUrl}\n\nI think you'll find the section on AI efficiency particularly interesting. - {worker}",
    variables: ["firstName", "contentUrl", "worker"],
    contentType: "MEDIUM_ARTICLE",
  },
  {
    id: "cl_article_3",
    category: "article",
    template: "You got it! {contentUrl}\n\nLet me know which part resonates with you - {worker}",
    variables: ["contentUrl", "worker"],
    contentType: "MEDIUM_ARTICLE",
  },
  {
    id: "cl_article_4",
    category: "article",
    template: "Great! Here's the piece I wrote: {contentUrl}\n\nWould love your feedback! - {worker}",
    variables: ["contentUrl", "worker"],
    contentType: "MEDIUM_ARTICLE",
  },
  {
    id: "cl_article_5",
    category: "article",
    template: "Perfect {firstName}! Check it out: {contentUrl}\n\nLots of folks in {industry} have found this helpful. - {worker}",
    variables: ["firstName", "contentUrl", "industry", "worker"],
    contentType: "MEDIUM_ARTICLE",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NEWSLETTER - Newsletter signups, recurring content
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "cl_newsletter_1",
    category: "newsletter",
    template: "Here's the newsletter: {contentUrl}\n\nWe send out weekly tips - this one's a good preview! - {worker}",
    variables: ["contentUrl", "worker"],
    contentType: "NEWSLETTER",
  },
  {
    id: "cl_newsletter_2",
    category: "newsletter",
    template: "{firstName} - here you go: {contentUrl}\n\nLet me know if you want to get on the regular list! - {worker}",
    variables: ["firstName", "contentUrl", "worker"],
    contentType: "NEWSLETTER",
  },
  {
    id: "cl_newsletter_3",
    category: "newsletter",
    template: "You got it! {contentUrl}\n\nThis is our latest edition - packed with actionable stuff. - {worker}",
    variables: ["contentUrl", "worker"],
    contentType: "NEWSLETTER",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // BLUEPRINT - AI blueprints, guides, one-pagers
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "cl_blueprint_1",
    category: "blueprint",
    template: "Here's the AI blueprint: {contentUrl}\n\nSome quick wins in there for {industry}! - {worker}",
    variables: ["contentUrl", "industry", "worker"],
    contentType: "ONE_PAGER",
  },
  {
    id: "cl_blueprint_2",
    category: "blueprint",
    template: "{firstName} - sending that blueprint now: {contentUrl}\n\nLet me know what you think! - {worker}",
    variables: ["firstName", "contentUrl", "worker"],
    contentType: "ONE_PAGER",
  },
  {
    id: "cl_blueprint_3",
    category: "blueprint",
    template: "Perfect! Here's the guide: {contentUrl}\n\nIt covers the 5 biggest time-savers. - {worker}",
    variables: ["contentUrl", "worker"],
    contentType: "EBOOK",
  },
  {
    id: "cl_blueprint_4",
    category: "blueprint",
    template: "You got it! {contentUrl}\n\nThis is the same blueprint we use with our partners. Good stuff! - {worker}",
    variables: ["contentUrl", "worker"],
    contentType: "ONE_PAGER",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // VIDEO - Video content links
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "cl_video_1",
    category: "video",
    template: "Here's the video: {contentUrl}\n\nAbout 8 mins - worth watching! - {worker}",
    variables: ["contentUrl", "worker"],
    contentType: "VIDEO",
  },
  {
    id: "cl_video_2",
    category: "video",
    template: "{firstName} - check this out: {contentUrl}\n\nI walk through the whole process. - {worker}",
    variables: ["firstName", "contentUrl", "worker"],
    contentType: "VIDEO",
  },
  {
    id: "cl_video_3",
    category: "video",
    template: "Sending now! {contentUrl}\n\nWatch the first 2 mins - you'll get the idea. - {worker}",
    variables: ["contentUrl", "worker"],
    contentType: "VIDEO",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // WARM - When lead seems very interested
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "cl_warm_1",
    category: "warm",
    template: "Awesome! Here it is: {contentUrl}\n\nI think you're gonna love this! - {worker}",
    variables: ["contentUrl", "worker"],
  },
  {
    id: "cl_warm_2",
    category: "warm",
    template: "{firstName} you're gonna dig this! {contentUrl}\n\nLet's chat after you read it! - {worker}",
    variables: ["firstName", "contentUrl", "worker"],
  },
  {
    id: "cl_warm_3",
    category: "warm",
    template: "Love the enthusiasm! Here you go: {contentUrl}\n\nCan't wait to hear your thoughts! - {worker}",
    variables: ["contentUrl", "worker"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // QUICK - Short and sweet
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "cl_quick_1",
    category: "quick",
    template: "Here it is: {contentUrl} - {worker}",
    variables: ["contentUrl", "worker"],
  },
  {
    id: "cl_quick_2",
    category: "quick",
    template: "{contentUrl}\n\nEnjoy! - {worker}",
    variables: ["contentUrl", "worker"],
  },
  {
    id: "cl_quick_3",
    category: "quick",
    template: "Sent! {contentUrl} - {worker}",
    variables: ["contentUrl", "worker"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT LINK FOLLOW-UPS - After sending link, circle back for engagement
// ─────────────────────────────────────────────────────────────────────────────

export const CONTENT_LINK_FOLLOWUPS: FollowUpTemplate[] = [
  // 24 hours after link sent
  {
    id: "cl_followup_24h_1",
    timing: "24h",
    template: "Hey {firstName}! Did you get a chance to check out that article? What did you think? - {worker}",
    variables: ["firstName", "worker"],
  },
  {
    id: "cl_followup_24h_2",
    timing: "24h",
    template: "{firstName} - thoughts on that piece I sent? If you liked it, I've got more where that came from! - {worker}",
    variables: ["firstName", "worker"],
  },
  {
    id: "cl_followup_24h_3",
    timing: "24h",
    template: "{firstName}, hope you got a chance to read it! Curious which part stood out to you. - {worker}",
    variables: ["firstName", "worker"],
  },

  // 48 hours - pivot to email capture
  {
    id: "cl_followup_48h_1",
    timing: "48h",
    template: "Hey {firstName}! If you liked that article, I've got a full guide I can send. What's the best email? - {worker}",
    variables: ["firstName", "worker"],
  },
  {
    id: "cl_followup_48h_2",
    timing: "48h",
    template: "{firstName} - got some more in-depth stuff if you're interested. Best email to send it to? - {worker}",
    variables: ["firstName", "worker"],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FOLLOW-UP AFTER EMAIL SENT - Strategy session scheduling nudges
// ═══════════════════════════════════════════════════════════════════════════════

export interface FollowUpTemplate {
  id: string;
  timing: "24h" | "48h" | "72h" | "1week";
  template: string;
  variables: string[];
}

export const STRATEGY_SESSION_FOLLOWUPS: FollowUpTemplate[] = [
  // 24 hours after email sent
  {
    id: "followup_24h_1",
    timing: "24h",
    template: "Hey {firstName}! Did you get a chance to look at that report I sent? Any questions? - {worker}",
    variables: ["firstName", "worker"],
  },
  {
    id: "followup_24h_2",
    timing: "24h",
    template: "{firstName} - checking in! Saw the email went through. What did you think of the numbers? - {worker}",
    variables: ["firstName", "worker"],
  },
  {
    id: "followup_24h_3",
    timing: "24h",
    template: "{firstName}, hope you got the report! Ready to chat whenever you are. - {worker}",
    variables: ["firstName", "worker"],
  },

  // 48 hours
  {
    id: "followup_48h_1",
    timing: "48h",
    template: "{firstName} - just following up on that analysis I sent. Worth a 15-min chat? - {worker}",
    variables: ["firstName", "worker"],
  },
  {
    id: "followup_48h_2",
    timing: "48h",
    template: "Hey {firstName}! Any thoughts on the report? Happy to walk through it with you. - {worker}",
    variables: ["firstName", "worker"],
  },

  // 72 hours
  {
    id: "followup_72h_1",
    timing: "72h",
    template: "{firstName}, still thinking about that property? I'm here when you're ready to chat. - {worker}",
    variables: ["firstName", "worker"],
  },
  {
    id: "followup_72h_2",
    timing: "72h",
    template: "Hey {firstName} - no pressure, just wanted to make sure you saw the report. Let me know! - {worker}",
    variables: ["firstName", "worker"],
  },

  // 1 week
  {
    id: "followup_1week_1",
    timing: "1week",
    template: "{firstName}! Quick check-in. Still interested in discussing that analysis? - {worker}",
    variables: ["firstName", "worker"],
  },
  {
    id: "followup_1week_2",
    timing: "1week",
    template: "Hey {firstName}, just circling back. Happy to answer any questions when you're ready. - {worker}",
    variables: ["firstName", "worker"],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a random email capture confirmation template
 */
export function getEmailCaptureConfirmation(
  category: EmailCaptureTemplate["category"] = "standard",
  context?: {
    firstName?: string;
    email?: string;
    propertyAddress?: string;
    worker?: string;
    timing?: EmailCaptureTemplate["timing"];
  }
): string {
  const templates = EMAIL_CAPTURE_CONFIRMATIONS.filter((t) => t.category === category);
  const template = templates[Math.floor(Math.random() * templates.length)];

  let message = template.template;

  // Replace variables
  if (context?.firstName) message = message.replace(/{firstName}/g, context.firstName);
  if (context?.email) message = message.replace(/{email}/g, context.email);
  if (context?.propertyAddress) message = message.replace(/{propertyAddress}/g, context.propertyAddress);
  if (context?.worker) message = message.replace(/{worker}/g, context.worker);

  return message;
}

/**
 * Get best template based on context
 */
export function getBestEmailCaptureTemplate(context: {
  hasPropertyAddress: boolean;
  isBusinessLead: boolean;
  isWeekend: boolean;
  leadSentiment: "warm" | "neutral" | "brief";
}): EmailCaptureTemplate {
  let category: EmailCaptureTemplate["category"] = "standard";

  if (context.isWeekend) {
    category = "weekend";
  } else if (context.leadSentiment === "warm") {
    category = "warm";
  } else if (context.leadSentiment === "brief") {
    category = "quick";
  } else if (context.hasPropertyAddress) {
    category = "property";
  } else if (context.isBusinessLead) {
    category = "business";
  }

  const templates = EMAIL_CAPTURE_CONFIRMATIONS.filter((t) => t.category === category);
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Check if today is weekend for template selection
 */
export function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6 || day === 5; // Sun, Sat, or Friday (promise weekend delivery)
}

/**
 * Get follow-up sequence for a lead after email capture
 */
export function getFollowUpSequence(worker: string = "Gianna"): FollowUpTemplate[] {
  return STRATEGY_SESSION_FOLLOWUPS.map((t) => ({
    ...t,
    template: t.template.replace(/{worker}/g, worker),
  }));
}

/**
 * Get content link confirmation template
 */
export function getContentLinkConfirmation(
  category: ContentLinkTemplate["category"] = "standard",
  context?: {
    firstName?: string;
    contentUrl?: string;
    industry?: string;
    worker?: string;
  }
): string {
  const templates = CONTENT_LINK_CONFIRMATIONS.filter((t) => t.category === category);
  const template = templates[Math.floor(Math.random() * templates.length)];

  let message = template.template;

  if (context?.firstName) message = message.replace(/{firstName}/g, context.firstName);
  if (context?.contentUrl) message = message.replace(/{contentUrl}/g, context.contentUrl);
  if (context?.industry) message = message.replace(/{industry}/g, context.industry);
  if (context?.worker) message = message.replace(/{worker}/g, context.worker);

  return message;
}

/**
 * Detect if response is permission to send content
 */
export function isContentPermission(message: string): boolean {
  const PERMISSION_KEYWORDS = [
    "YES", "SURE", "SEND IT", "SEND ME", "YEAH", "YEP", "OK", "OKAY",
    "PLEASE", "GO AHEAD", "ABSOLUTELY", "OF COURSE", "DEFINITELY",
    "SOUNDS GOOD", "WOULD LOVE", "LOVE TO", "INTERESTED", "SEND",
  ];
  const upper = message.toUpperCase().trim();
  // Must be short (under 50 chars) and contain a permission keyword
  // Also must NOT contain an email (that's email capture, not content permission)
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(message);
  return !hasEmail && upper.length < 50 && PERMISSION_KEYWORDS.some(kw => upper.includes(kw));
}

// ═══════════════════════════════════════════════════════════════════════════════
// "DID YOU KNOW?" NURTURE DRIPS - Quick facts about neighborhoods/states
// ═══════════════════════════════════════════════════════════════════════════════
//
// Short SMS drips with interesting local facts to keep leads warm
// Format: "Hey did you know [fact about their area]?"
//
// ═══════════════════════════════════════════════════════════════════════════════

export interface DidYouKnowTemplate {
  id: string;
  state: string;
  neighborhood?: string;
  city?: string;
  fact: string;
  template: string;
}

export const DID_YOU_KNOW_FACTS: DidYouKnowTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // NEW YORK - Brooklyn
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "dyk_ny_bushwick_1",
    state: "NY",
    neighborhood: "Bushwick",
    city: "Brooklyn",
    fact: "Bushwick was originally a Dutch settlement called Boswijck meaning 'little town in the woods'",
    template: "Hey did you know Bushwick was originally a Dutch settlement called 'Boswijck' - little town in the woods? 🌳 - {worker}",
  },
  {
    id: "dyk_ny_bushwick_2",
    state: "NY",
    neighborhood: "Bushwick",
    city: "Brooklyn",
    fact: "Bushwick was the beer brewing capital of the US in the 1800s with 14 breweries",
    template: "Quick fact - Bushwick had 14 breweries in the 1800s and was the beer capital of the US! 🍺 - {worker}",
  },
  {
    id: "dyk_ny_williamsburg_1",
    state: "NY",
    neighborhood: "Williamsburg",
    city: "Brooklyn",
    fact: "Williamsburg Bridge opened in 1903 and was the longest suspension bridge at the time",
    template: "Hey did you know the Williamsburg Bridge was the longest suspension bridge in the world when it opened in 1903? - {worker}",
  },
  {
    id: "dyk_ny_bedstuy_1",
    state: "NY",
    neighborhood: "Bed-Stuy",
    city: "Brooklyn",
    fact: "Bed-Stuy has one of the largest collections of Victorian architecture in the US",
    template: "Fun fact - Bed-Stuy has one of the largest collections of Victorian brownstones in the entire US! 🏠 - {worker}",
  },
  {
    id: "dyk_ny_redhook_1",
    state: "NY",
    neighborhood: "Red Hook",
    city: "Brooklyn",
    fact: "Red Hook got its name from the red clay soil and the hook shape of the peninsula",
    template: "Hey did you know Red Hook got its name from the red clay soil and the hook-shaped peninsula? 🪝 - {worker}",
  },
  {
    id: "dyk_ny_dumbo_1",
    state: "NY",
    neighborhood: "DUMBO",
    city: "Brooklyn",
    fact: "DUMBO stands for Down Under the Manhattan Bridge Overpass - coined by artists in the 1970s",
    template: "Quick one - DUMBO stands for 'Down Under the Manhattan Bridge Overpass' - artists named it in the 70s! - {worker}",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NEW YORK - Staten Island
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "dyk_ny_si_1",
    state: "NY",
    city: "Staten Island",
    fact: "Staten Island was almost sold to New Jersey in 1687 for $12,000",
    template: "Hey did you know Staten Island was almost sold to New Jersey in 1687 for just $12K? Close call! 😅 - {worker}",
  },
  {
    id: "dyk_ny_si_2",
    state: "NY",
    city: "Staten Island",
    fact: "Fresh Kills Landfill was once the largest man-made structure visible from space",
    template: "Wild fact - Fresh Kills Landfill used to be the largest man-made structure visible from space! Now it's a park. - {worker}",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NEW JERSEY
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "dyk_nj_1",
    state: "NJ",
    fact: "New Jersey has the most diners in the world - over 500",
    template: "Hey did you know NJ has more diners than anywhere in the world? Over 500! 🍳 - {worker}",
  },
  {
    id: "dyk_nj_2",
    state: "NJ",
    fact: "The first baseball game was played in Hoboken NJ in 1846",
    template: "Quick fact - the first ever baseball game was played in Hoboken NJ in 1846! ⚾ - {worker}",
  },
  {
    id: "dyk_nj_newark_1",
    state: "NJ",
    city: "Newark",
    fact: "Newark is the third oldest city in the US, founded in 1666",
    template: "Hey did you know Newark is one of the oldest cities in America? Founded in 1666! - {worker}",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // FLORIDA
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "dyk_fl_1",
    state: "FL",
    fact: "St. Augustine FL is the oldest continuously occupied European settlement in the US (1565)",
    template: "Hey did you know St. Augustine is the oldest city in the US? Founded 1565 - 55 years before Plymouth Rock! - {worker}",
  },
  {
    id: "dyk_fl_miami_1",
    state: "FL",
    city: "Miami",
    fact: "Miami is the only major US city founded by a woman - Julia Tuttle",
    template: "Quick fact - Miami is the only major US city founded by a woman! Julia Tuttle in 1896. 👏 - {worker}",
  },
  {
    id: "dyk_fl_2",
    state: "FL",
    fact: "Florida has more golf courses than any other state - over 1,250",
    template: "Hey did you know Florida has more golf courses than any other state? Over 1,250! ⛳ - {worker}",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TEXAS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "dyk_tx_1",
    state: "TX",
    fact: "Texas is the only state that was its own country (Republic of Texas 1836-1845)",
    template: "Hey did you know Texas was its own country for 9 years? Republic of Texas 1836-1845! 🤠 - {worker}",
  },
  {
    id: "dyk_tx_houston_1",
    state: "TX",
    city: "Houston",
    fact: "Houston has no zoning laws - one of the only major US cities without them",
    template: "Quick fact - Houston has no zoning laws! One of the only major cities in the US without them. - {worker}",
  },
  {
    id: "dyk_tx_austin_1",
    state: "TX",
    city: "Austin",
    fact: "Austin has the largest urban bat colony in North America - 1.5 million bats",
    template: "Hey did you know Austin has 1.5 million bats living under Congress Ave Bridge? Largest urban colony in NA! 🦇 - {worker}",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CALIFORNIA
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "dyk_ca_1",
    state: "CA",
    fact: "California's economy is larger than most countries - 5th largest in the world",
    template: "Hey did you know California's economy is the 5th largest in the entire world? Bigger than the UK! - {worker}",
  },
  {
    id: "dyk_ca_la_1",
    state: "CA",
    city: "Los Angeles",
    fact: "LA's full name is 'El Pueblo de Nuestra Señora la Reina de los Ángeles del Río Porciúncula'",
    template: "Fun fact - LA's full original name is 44 letters long! 'El Pueblo de Nuestra Señora la Reina de los Ángeles...' - {worker}",
  },
  {
    id: "dyk_ca_sf_1",
    state: "CA",
    city: "San Francisco",
    fact: "The Golden Gate Bridge was almost painted black and yellow like a bumblebee",
    template: "Hey did you know the Golden Gate Bridge was almost painted black and yellow? Navy wanted it for visibility! 🐝 - {worker}",
  },
];

/**
 * Get a random "Did You Know" fact for a location
 */
export function getDidYouKnowFact(context: {
  state?: string;
  city?: string;
  neighborhood?: string;
  worker?: string;
}): string | null {
  let facts = DID_YOU_KNOW_FACTS;

  // Filter by location specificity
  if (context.neighborhood) {
    const neighborhoodFacts = facts.filter(f =>
      f.neighborhood?.toLowerCase() === context.neighborhood?.toLowerCase()
    );
    if (neighborhoodFacts.length > 0) facts = neighborhoodFacts;
  } else if (context.city) {
    const cityFacts = facts.filter(f =>
      f.city?.toLowerCase() === context.city?.toLowerCase()
    );
    if (cityFacts.length > 0) facts = cityFacts;
  } else if (context.state) {
    const stateFacts = facts.filter(f =>
      f.state.toLowerCase() === context.state?.toLowerCase()
    );
    if (stateFacts.length > 0) facts = stateFacts;
  }

  if (facts.length === 0) return null;

  const fact = facts[Math.floor(Math.random() * facts.length)];
  let message = fact.template;

  if (context.worker) message = message.replace(/{worker}/g, context.worker);

  return message;
}

export default {
  EMAIL_CAPTURE_CONFIRMATIONS,
  EMAIL_INTRO_TEMPLATES,
  STRATEGY_SESSION_FOLLOWUPS,
  CONTENT_LINK_CONFIRMATIONS,
  CONTENT_LINK_FOLLOWUPS,
  DID_YOU_KNOW_FACTS,
  getEmailCaptureConfirmation,
  getBestEmailCaptureTemplate,
  isWeekend,
  getFollowUpSequence,
  getContentLinkConfirmation,
  isContentPermission,
  getDidYouKnowFact,
};
