"use client";

import { useState } from "react";
import { TeamHeader } from "@/features/team/layouts/team-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Phone,
  Copy,
  Check,
  Eye,
  Sparkles,
  User,
  Bot,
  Building,
  MapPin,
  DollarSign,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Personalization variables available
const PERSONALIZATION_VARS = [
  { key: "{{name}}", label: "Lead Name", example: "John" },
  { key: "{{first_name}}", label: "First Name", example: "John" },
  { key: "{{last_name}}", label: "Last Name", example: "Smith" },
  {
    key: "{{business_name}}",
    label: "Business Name",
    example: "Smith Auto Repair",
  },
  { key: "{{sender_name}}", label: "Sender Name", example: "Gianna" },
  { key: "{{company}}", label: "Your Company", example: "Nextier" },
  { key: "{{city}}", label: "City", example: "Brooklyn" },
  { key: "{{state}}", label: "State", example: "NY" },
  { key: "{{industry}}", label: "Industry", example: "auto repair" },
  { key: "{{revenue_range}}", label: "Revenue Range", example: "$1-5M" },
];

// SMS Templates - Gianna's voice (or configurable sender) - ALL UNDER 160 CHARS
const INITIAL_SMS_TEMPLATES = [
  {
    id: "sms-1",
    name: "Valuation Curiosity",
    message:
      "Hey {{name}}, {{sender_name}} with {{company}}. Ever wonder what your business could sell for? I can get you a valuation. Best email?",
    category: "opening",
    tags: ["valuation", "soft-open"],
  },
  {
    id: "sms-2",
    name: "Hidden Value",
    message:
      "Hey {{name}}, most owners have no idea what they're sitting on. Want a quick valuation? Best email to send it?",
    category: "opening",
    tags: ["valuation", "curiosity"],
  },
  {
    id: "sms-3",
    name: "Expand or Exit",
    message:
      "{{sender_name}} here — thinking about expanding or exiting? I can get you a clean valuation. What's a good email?",
    category: "opening",
    tags: ["exit", "expansion"],
  },
  {
    id: "sms-4",
    name: "Free Valuation Offer",
    message:
      "Hey {{name}}, I help owners know what their business can sell for. Want a valuation? What email works?",
    category: "opening",
    tags: ["valuation", "offer"],
  },
  {
    id: "sms-5",
    name: "Know Your Number",
    message:
      "Curious — do you know what your business would sell for right now? I can show you. Best email?",
    category: "opening",
    tags: ["valuation", "direct"],
  },
  {
    id: "sms-6",
    name: "15-Min Chat",
    message:
      "{{sender_name}} from {{company}} — free business valuation, 15-min chat. Worth it? What email should I use?",
    category: "opening",
    tags: ["meeting", "valuation"],
  },
  {
    id: "sms-7",
    name: "Growth or Exit Check",
    message:
      "Hey {{name}}, growth mode or stepping back? I can get you a valuation either way. Best email?",
    category: "opening",
    tags: ["qualification", "valuation"],
  },
  {
    id: "sms-8",
    name: "Tomorrow's Offer",
    message:
      "If someone made you an offer tomorrow — do you know your number? I can get you a valuation. Email?",
    category: "opening",
    tags: ["urgency", "valuation"],
  },
  {
    id: "sms-9",
    name: "Worth Mapping",
    message:
      "{{sender_name}} here — I help owners map out what they're worth. Quick valuation if you want. Email?",
    category: "opening",
    tags: ["valuation", "short"],
  },
  {
    id: "sms-10",
    name: "1-2 Year Horizon",
    message:
      "Hey {{name}}, thinking expansion or exit in the next year or two? I can get you a valuation. Email?",
    category: "opening",
    tags: ["timeline", "valuation"],
  },
  {
    id: "sms-11",
    name: "This Week",
    message:
      "I can run your business valuation this week. Want it? What's the best email for you?",
    category: "opening",
    tags: ["urgency", "action"],
  },
  {
    id: "sms-12",
    name: "Exit Number",
    message:
      "Hey {{name}}, most owners don't know their exit number. Want yours? Best email?",
    category: "opening",
    tags: ["exit", "curiosity"],
  },
  {
    id: "sms-13",
    name: "Quick Intro",
    message:
      "{{sender_name}} with {{company}} — I run valuations for business owners. Want yours? Email?",
    category: "opening",
    tags: ["intro", "valuation"],
  },
  {
    id: "sms-14",
    name: "Head Number",
    message:
      "If you ever sold, what number's in your head? I can get you the real one. Best email?",
    category: "opening",
    tags: ["direct", "valuation"],
  },
  {
    id: "sms-15",
    name: "Step Back Question",
    message:
      "Quick one — thought about stepping back or selling someday? I can get you a valuation. Email?",
    category: "opening",
    tags: ["soft", "exit"],
  },
  {
    id: "sms-16",
    name: "True Worth",
    message:
      "{{sender_name}} here — I help owners figure out what they're really worth. Want yours? Email?",
    category: "opening",
    tags: ["valuation", "worth"],
  },
  {
    id: "sms-17",
    name: "Market Value",
    message:
      "Hey {{name}}, do you know your current market value? I can get it for you. Best email?",
    category: "opening",
    tags: ["market", "valuation"],
  },
  {
    id: "sms-18",
    name: "Buyer Snapshot",
    message:
      "I can get you a valuation + snapshot of what buyers would pay. Want it? Email?",
    category: "opening",
    tags: ["buyers", "valuation"],
  },
  {
    id: "sms-19",
    name: "This Week Batch",
    message:
      "{{sender_name}} at {{company}} — doing valuations this week. Want yours? Email?",
    category: "opening",
    tags: ["batch", "urgency"],
  },
  {
    id: "sms-20",
    name: "Full Valuation",
    message:
      "Ever thought about expanding or exiting? I can get you a full valuation. Best email?",
    category: "opening",
    tags: ["complete", "valuation"],
  },
];

// RETARGET SMS Templates - Cathy's voice - For leads who didn't respond (3+ days) - ALL UNDER 160 CHARS
const RETARGET_SMS_TEMPLATES = [
  {
    id: "retarget-1",
    name: "Quick Check-In",
    message:
      "Hey {{name}}! Just checking in — still interested in chatting? Let me know if now works better!",
    category: "retarget",
    tags: ["soft", "check-in"],
  },
  {
    id: "retarget-2",
    name: "Busy Week",
    message:
      "Hey {{name}}, I know things get busy. Still interested in that valuation? Just reply and we can set up a quick call.",
    category: "retarget",
    tags: ["empathy", "follow-up"],
  },
  {
    id: "retarget-3",
    name: "Making Sure",
    message:
      "Hey {{name}}! Making sure my messages are getting through. If you're still interested, I'm here!",
    category: "retarget",
    tags: ["soft", "confirmation"],
  },
  {
    id: "retarget-4",
    name: "Different Angle",
    message:
      "{{name}}, maybe timing wasn't right before. Still curious about what your business could sell for?",
    category: "retarget",
    tags: ["timing", "curiosity"],
  },
  {
    id: "retarget-5",
    name: "No Pressure",
    message:
      "Hey {{name}}, no pressure at all — just wanted to see if you're still thinking about getting a valuation. Thoughts?",
    category: "retarget",
    tags: ["no-pressure", "soft"],
  },
  {
    id: "retarget-6",
    name: "Circle Back",
    message:
      "{{sender_name}} here again. Wanted to circle back — still interested in knowing what your business is worth?",
    category: "retarget",
    tags: ["follow-up", "direct"],
  },
  {
    id: "retarget-7",
    name: "Quick Question",
    message:
      "Hey {{name}}, quick question — is now a better time to chat about that valuation? Just say the word.",
    category: "retarget",
    tags: ["timing", "question"],
  },
  {
    id: "retarget-8",
    name: "Still Here",
    message:
      "Hey {{name}}! Still here if you want that valuation. No rush — just let me know when you're ready.",
    category: "retarget",
    tags: ["patience", "soft"],
  },
  {
    id: "retarget-9",
    name: "Last Check",
    message:
      "{{name}}, last check-in — still interested in finding out what your business could sell for? Either way, let me know!",
    category: "retarget",
    tags: ["final", "direct"],
  },
  {
    id: "retarget-10",
    name: "Timing Better",
    message:
      "Hey {{name}}, maybe the timing wasn't great before. Would a quick call work better now?",
    category: "retarget",
    tags: ["timing", "call"],
  },
  {
    id: "retarget-11",
    name: "Missed Connection",
    message:
      "{{sender_name}} here — we might have missed each other. Still want that business valuation?",
    category: "retarget",
    tags: ["reconnect", "soft"],
  },
  {
    id: "retarget-12",
    name: "Thinking About It",
    message:
      "Hey {{name}}, been thinking about it? The valuation offer still stands. Just reply when ready.",
    category: "retarget",
    tags: ["patience", "offer"],
  },
  {
    id: "retarget-13",
    name: "Free Reminder",
    message:
      "Quick reminder — that free valuation I mentioned is still available. Worth 5 mins? Let me know!",
    category: "retarget",
    tags: ["reminder", "value"],
  },
  {
    id: "retarget-14",
    name: "New Info",
    message:
      "Hey {{name}}, I've got some new market info that might change your mind. Want to hear it?",
    category: "retarget",
    tags: ["curiosity", "value"],
  },
  {
    id: "retarget-15",
    name: "Changed Mind",
    message:
      "{{name}}, changed your mind? Totally fine — but if you're still curious about your valuation, I'm here.",
    category: "retarget",
    tags: ["understanding", "soft"],
  },
  {
    id: "retarget-16",
    name: "Back to You",
    message:
      "Hey {{name}}, coming back to you. Still thinking about that valuation? Happy to chat whenever.",
    category: "retarget",
    tags: ["follow-up", "patient"],
  },
  {
    id: "retarget-17",
    name: "Market Update",
    message:
      "{{name}}, quick market update — valuations in {{industry}} are shifting. Want to know where you stand?",
    category: "retarget",
    tags: ["urgency", "market"],
  },
  {
    id: "retarget-18",
    name: "Simple Reply",
    message:
      "Hey {{name}}! Just reply YES if you still want that valuation. No if not. Either works!",
    category: "retarget",
    tags: ["direct", "easy"],
  },
  {
    id: "retarget-19",
    name: "Week Later",
    message:
      "It's been a week — figured I'd check in. Still want to know what your business could sell for?",
    category: "retarget",
    tags: ["timeline", "check-in"],
  },
  {
    id: "retarget-20",
    name: "One More Time",
    message:
      "{{sender_name}} here, one more time. Valuation still on the table if you're interested. Just say when!",
    category: "retarget",
    tags: ["final", "offer"],
  },
];

// NUDGE SMS Templates - Cathy's voice - For stale leads in nurturing (2+ days) - ALL UNDER 160 CHARS
const NUDGE_SMS_TEMPLATES = [
  {
    id: "nudge-1",
    name: "Just Checking",
    message:
      "Hey {{name}}, just checking in! Any questions about that valuation? Let me know if now works better to chat.",
    category: "nudge",
    tags: ["soft", "check-in"],
  },
  {
    id: "nudge-2",
    name: "Following Up",
    message:
      "{{sender_name}} here — following up on our conversation. Still thinking about it? Happy to answer questions.",
    category: "nudge",
    tags: ["follow-up", "helpful"],
  },
  {
    id: "nudge-3",
    name: "Quick Reminder",
    message:
      "Hey {{name}}! Quick reminder — I'm here if you have questions about the valuation. No rush!",
    category: "nudge",
    tags: ["reminder", "patient"],
  },
  {
    id: "nudge-4",
    name: "Thoughts",
    message:
      "Hey {{name}}, any thoughts since we last chatted? Let me know if you want to discuss further.",
    category: "nudge",
    tags: ["question", "soft"],
  },
  {
    id: "nudge-5",
    name: "Next Steps",
    message:
      "{{name}}, wanted to check if you're ready for next steps on that valuation. Just say the word!",
    category: "nudge",
    tags: ["action", "direct"],
  },
  {
    id: "nudge-6",
    name: "Questions",
    message:
      "Hey {{name}}! Got any questions I can answer? Happy to help clarify anything about the process.",
    category: "nudge",
    tags: ["helpful", "questions"],
  },
  {
    id: "nudge-7",
    name: "Moving Forward",
    message:
      "{{sender_name}} here — ready to move forward whenever you are. Just let me know what you need!",
    category: "nudge",
    tags: ["action", "supportive"],
  },
  {
    id: "nudge-8",
    name: "Good Time",
    message:
      "Hey {{name}}, is now a good time to continue our conversation? I'm free whenever works for you.",
    category: "nudge",
    tags: ["timing", "flexible"],
  },
  {
    id: "nudge-9",
    name: "Status Check",
    message:
      "Quick status check — where are you at with the valuation idea? Still interested? Let me know!",
    category: "nudge",
    tags: ["status", "direct"],
  },
  {
    id: "nudge-10",
    name: "Clarify Anything",
    message:
      "Hey {{name}}, happy to clarify anything about the valuation process. What would help most?",
    category: "nudge",
    tags: ["helpful", "questions"],
  },
  {
    id: "nudge-11",
    name: "Schedule Call",
    message:
      "{{name}}, want to schedule a quick call to go over next steps? Just 10 mins. What time works?",
    category: "nudge",
    tags: ["call", "scheduling"],
  },
  {
    id: "nudge-12",
    name: "Gentle Push",
    message:
      "Hey {{name}}! Gentle nudge — I don't want you to miss out on this. Ready to move forward?",
    category: "nudge",
    tags: ["urgency", "soft"],
  },
  {
    id: "nudge-13",
    name: "Here to Help",
    message:
      "{{sender_name}} here — just want you to know I'm here to help whenever you're ready. No pressure!",
    category: "nudge",
    tags: ["supportive", "patient"],
  },
  {
    id: "nudge-14",
    name: "Quick Chat",
    message:
      "Hey {{name}}, got 5 mins for a quick chat? Can answer any questions you might have.",
    category: "nudge",
    tags: ["call", "quick"],
  },
  {
    id: "nudge-15",
    name: "Still Interested",
    message:
      "{{name}}, still interested in getting that valuation done? I can make it super easy. Let me know!",
    category: "nudge",
    tags: ["easy", "action"],
  },
  {
    id: "nudge-16",
    name: "Thinking It Over",
    message:
      "Hey {{name}}, totally understand if you're thinking it over. Anything I can help clarify?",
    category: "nudge",
    tags: ["understanding", "helpful"],
  },
  {
    id: "nudge-17",
    name: "Ready When You Are",
    message:
      "{{sender_name}} here — ready when you are! Just reply and we can pick up where we left off.",
    category: "nudge",
    tags: ["patient", "easy"],
  },
  {
    id: "nudge-18",
    name: "One Quick Thing",
    message:
      "Hey {{name}}, one quick thing — did you get a chance to review what we discussed? Any thoughts?",
    category: "nudge",
    tags: ["follow-up", "question"],
  },
  {
    id: "nudge-19",
    name: "Move Things Along",
    message:
      "{{name}}, want to move things along? I can send over the next steps right now. Just say yes!",
    category: "nudge",
    tags: ["action", "direct"],
  },
  {
    id: "nudge-20",
    name: "Final Nudge",
    message:
      "Hey {{name}}! Last nudge from me — still want that valuation? Either way, let me know!",
    category: "nudge",
    tags: ["final", "soft"],
  },
];

// FOLLOW-UP NURTURE SMS Templates - For active nurturing leads - ALL UNDER 160 CHARS
const FOLLOWUP_SMS_TEMPLATES = [
  {
    id: "followup-1",
    name: "Value Add",
    message:
      "Hey {{name}}, thought you'd find this interesting — just saw some new data on {{industry}} valuations. Want me to share?",
    category: "follow-up",
    tags: ["value", "helpful"],
  },
  {
    id: "followup-2",
    name: "Check Progress",
    message:
      "{{sender_name}} here — how are things going with your business? Any updates since we last talked?",
    category: "follow-up",
    tags: ["progress", "soft"],
  },
  {
    id: "followup-3",
    name: "Market Insight",
    message:
      "Hey {{name}}, quick market insight: {{industry}} is seeing increased buyer interest. Thought you'd want to know!",
    category: "follow-up",
    tags: ["market", "value"],
  },
  {
    id: "followup-4",
    name: "Resource Share",
    message:
      "{{name}}, I have a resource on business valuation you might like. Want me to send it over? No strings attached.",
    category: "follow-up",
    tags: ["resource", "helpful"],
  },
  {
    id: "followup-5",
    name: "Timeline Check",
    message:
      "Hey {{name}}, has your timeline changed at all? Just checking in to see where you're at with everything.",
    category: "follow-up",
    tags: ["timeline", "question"],
  },
  {
    id: "followup-6",
    name: "Success Story",
    message:
      "{{name}}, just helped another {{industry}} owner get a great valuation. Reminded me of you. How are things?",
    category: "follow-up",
    tags: ["social-proof", "soft"],
  },
  {
    id: "followup-7",
    name: "Quarterly Check",
    message:
      "Hey {{name}}! Quarterly check-in — how's {{business_name}} doing? Any new developments I should know about?",
    category: "follow-up",
    tags: ["regular", "business"],
  },
  {
    id: "followup-8",
    name: "Thinking of You",
    message:
      "{{sender_name}} here — saw something about {{industry}} and thought of you. How's business going?",
    category: "follow-up",
    tags: ["personal", "soft"],
  },
  {
    id: "followup-9",
    name: "Goals Update",
    message:
      "Hey {{name}}, any updates on your goals for this year? I'm here if you want to chat through anything.",
    category: "follow-up",
    tags: ["goals", "supportive"],
  },
  {
    id: "followup-10",
    name: "New Opportunity",
    message:
      "{{name}}, I might have an opportunity that fits your situation. Got a minute to hear about it?",
    category: "follow-up",
    tags: ["opportunity", "value"],
  },
  {
    id: "followup-11",
    name: "Stay Connected",
    message:
      "Hey {{name}}, just staying connected. No agenda — just wanted to see how you're doing!",
    category: "follow-up",
    tags: ["personal", "soft"],
  },
  {
    id: "followup-12",
    name: "Industry News",
    message:
      "{{name}}, big news in {{industry}} this week. Affects valuations. Want me to break it down for you?",
    category: "follow-up",
    tags: ["news", "value"],
  },
  {
    id: "followup-13",
    name: "Helpful Article",
    message:
      "Hey {{name}}, found an article about growing {{industry}} businesses. Thought of you. Want the link?",
    category: "follow-up",
    tags: ["resource", "helpful"],
  },
  {
    id: "followup-14",
    name: "Business Check",
    message:
      "{{sender_name}} checking in — how's {{business_name}} doing lately? Any wins to celebrate?",
    category: "follow-up",
    tags: ["positive", "business"],
  },
  {
    id: "followup-15",
    name: "Ready Talk",
    message:
      "Hey {{name}}, when you're ready to talk next steps, I'm here. No rush — just wanted you to know!",
    category: "follow-up",
    tags: ["patient", "supportive"],
  },
  {
    id: "followup-16",
    name: "New Data",
    message:
      "{{name}}, got some new valuation data for {{city}} area businesses. Interesting stuff. Want to see it?",
    category: "follow-up",
    tags: ["data", "local"],
  },
  {
    id: "followup-17",
    name: "Quick Update",
    message:
      "Hey {{name}}, quick update from my end — got some new tools that could help you. Want to hear more?",
    category: "follow-up",
    tags: ["update", "value"],
  },
  {
    id: "followup-18",
    name: "Seasonal Check",
    message:
      "{{sender_name}} here — how's business this season? {{industry}} usually picks up around now!",
    category: "follow-up",
    tags: ["seasonal", "business"],
  },
  {
    id: "followup-19",
    name: "Growth Chat",
    message:
      "Hey {{name}}, any thoughts on growth this year? I've got some ideas if you want to brainstorm.",
    category: "follow-up",
    tags: ["growth", "helpful"],
  },
  {
    id: "followup-20",
    name: "Touch Base",
    message:
      "{{name}}, just touching base. How are things with {{business_name}}? Anything new happening?",
    category: "follow-up",
    tags: ["regular", "soft"],
  },
];

// RETENTION SMS Templates - For existing clients - ALL UNDER 160 CHARS
const RETENTION_SMS_TEMPLATES = [
  {
    id: "retention-1",
    name: "Check-In",
    message:
      "Hey {{name}}, {{sender_name}} here. Just checking in — how's everything going since we last worked together?",
    category: "retention",
    tags: ["check-in", "soft"],
  },
  {
    id: "retention-2",
    name: "Referral Ask",
    message:
      "{{name}}, quick question — know anyone else who might benefit from what we did for you? Happy to help them too!",
    category: "retention",
    tags: ["referral", "direct"],
  },
  {
    id: "retention-3",
    name: "New Service",
    message:
      "Hey {{name}}, we just added a new service I think would help {{business_name}}. Got a minute to hear about it?",
    category: "retention",
    tags: ["upsell", "value"],
  },
  {
    id: "retention-4",
    name: "Anniversary",
    message:
      "{{name}}, can't believe it's been a year since we started working together! How's everything going?",
    category: "retention",
    tags: ["milestone", "personal"],
  },
  {
    id: "retention-5",
    name: "Feedback Request",
    message:
      "Hey {{name}}, quick favor — how would you rate your experience with us? Your feedback means a lot!",
    category: "retention",
    tags: ["feedback", "soft"],
  },
  {
    id: "retention-6",
    name: "Update Available",
    message:
      "{{sender_name}} here — got an update on {{business_name}}'s valuation. Numbers are looking good. Want to see?",
    category: "retention",
    tags: ["update", "value"],
  },
  {
    id: "retention-7",
    name: "Support Check",
    message:
      "Hey {{name}}, just making sure you have everything you need from us. Anything I can help with?",
    category: "retention",
    tags: ["support", "helpful"],
  },
  {
    id: "retention-8",
    name: "VIP Offer",
    message:
      "{{name}}, as one of our valued clients, wanted to give you first look at something new. Interested?",
    category: "retention",
    tags: ["exclusive", "value"],
  },
  {
    id: "retention-9",
    name: "Results Check",
    message:
      "Hey {{name}}, how are the results looking since we worked together? Would love to hear an update!",
    category: "retention",
    tags: ["results", "positive"],
  },
  {
    id: "retention-10",
    name: "Next Steps",
    message:
      "{{sender_name}} here — ready to take the next step with {{business_name}}? I've got some ideas for you.",
    category: "retention",
    tags: ["action", "growth"],
  },
  {
    id: "retention-11",
    name: "Appreciation",
    message:
      "Hey {{name}}, just wanted to say thanks for trusting us with {{business_name}}. We appreciate you!",
    category: "retention",
    tags: ["gratitude", "personal"],
  },
  {
    id: "retention-12",
    name: "Renewal Reminder",
    message:
      "{{name}}, heads up — your renewal is coming up. Want to chat about what's next?",
    category: "retention",
    tags: ["renewal", "reminder"],
  },
  {
    id: "retention-13",
    name: "Market Update",
    message:
      "Hey {{name}}, market update for existing clients: {{industry}} valuations are shifting. Want the details?",
    category: "retention",
    tags: ["market", "exclusive"],
  },
  {
    id: "retention-14",
    name: "Quick Call",
    message:
      "{{sender_name}} here — got time for a quick call this week? Want to make sure you're getting full value.",
    category: "retention",
    tags: ["call", "support"],
  },
  {
    id: "retention-15",
    name: "Success Share",
    message:
      "Hey {{name}}, would you be open to sharing your success story? Could help other business owners like you!",
    category: "retention",
    tags: ["testimonial", "social-proof"],
  },
  {
    id: "retention-16",
    name: "Loyalty Thank You",
    message:
      "{{name}}, thank you for being a loyal client. Anything we can do to make your experience even better?",
    category: "retention",
    tags: ["gratitude", "improvement"],
  },
  {
    id: "retention-17",
    name: "Exclusive Access",
    message:
      "Hey {{name}}, as a valued client, you get early access to our new {{industry}} report. Want it?",
    category: "retention",
    tags: ["exclusive", "value"],
  },
  {
    id: "retention-18",
    name: "Partner Check",
    message:
      "{{sender_name}} checking in — how's our partnership working for you? Any adjustments needed?",
    category: "retention",
    tags: ["partnership", "support"],
  },
  {
    id: "retention-19",
    name: "Growth Review",
    message:
      "Hey {{name}}, want to schedule a growth review for {{business_name}}? Could uncover new opportunities!",
    category: "retention",
    tags: ["growth", "value"],
  },
  {
    id: "retention-20",
    name: "Stay Connected",
    message:
      "{{name}}, just staying connected! How's {{business_name}} doing? Any big plans coming up?",
    category: "retention",
    tags: ["personal", "business"],
  },
];

// Cold Call Scripts - for Call Center reference
const COLD_CALL_SCRIPTS = [
  {
    id: "call-1",
    name: "Quick Question Open",
    script:
      "Hey, it's {{sender_name}} with {{company}}. Quick question — have you thought about expanding or possibly exiting in the next year or two?",
    tags: ["direct", "timeline"],
  },
  {
    id: "call-2",
    name: "Worth Statement",
    script:
      "{{sender_name}} here with {{company}}. I help owners understand what their business could actually sell for. Worth a quick minute?",
    tags: ["value-prop", "soft"],
  },
  {
    id: "call-3",
    name: "Direction Check",
    script:
      "Calling to see where you're heading — growth, maintaining, or exploring an exit. Mind if I ask one quick thing?",
    tags: ["qualification", "open"],
  },
  {
    id: "call-4",
    name: "Valuation Specialty",
    script:
      "{{sender_name}} at {{company}} — I specialize in business valuations. Wanted to see if you've ever wondered what yours could fetch.",
    tags: ["specialty", "curiosity"],
  },
  {
    id: "call-5",
    name: "Tomorrow Offer",
    script:
      "Quick one — if someone made you an offer tomorrow, do you even know what your business is worth? That's why I'm calling.",
    tags: ["urgency", "direct"],
  },
  {
    id: "call-6",
    name: "No Selling",
    script:
      "I'm not selling anything — just want to see if you've ever thought about expansion or stepping back at any point.",
    tags: ["disarm", "soft"],
  },
  {
    id: "call-7",
    name: "Realistic Number",
    script:
      "{{sender_name}} here — I help owners get a realistic number of what they could sell for. Curious if that's ever crossed your mind?",
    tags: ["realistic", "curiosity"],
  },
  {
    id: "call-8",
    name: "30 Seconds",
    script:
      "Do you have 30 seconds? I'm calling because I can get you a valuation on what your business is worth right now.",
    tags: ["time-bound", "direct"],
  },
  {
    id: "call-9",
    name: "One Sentence",
    script:
      "I'll be quick — I help owners figure out the true market value of their business. Want me to explain in one sentence?",
    tags: ["brief", "hook"],
  },
  {
    id: "call-10",
    name: "Ever Wondered",
    script:
      "Have you ever wondered what your business could sell for? That's exactly what I'm calling about.",
    tags: ["simple", "direct"],
  },
  {
    id: "call-11",
    name: "Industry Talk",
    script:
      "{{sender_name}} here. I talk to a lot of owners in your industry — some expanding, some thinking about an exit. Which bucket are you in?",
    tags: ["industry", "qualification"],
  },
  {
    id: "call-12",
    name: "Real Position",
    script:
      "Not sure if this applies, but I can get you a full valuation on your business so you know your real position.",
    tags: ["no-pressure", "value"],
  },
  {
    id: "call-13",
    name: "7-Figure Exit",
    script:
      "I help owners find out if they're sitting on a potential 7-figure exit. Mind if I ask a quick question to see if it applies to you?",
    tags: ["big-number", "hook"],
  },
  {
    id: "call-14",
    name: "Not a Broker",
    script:
      "I'm not a broker — I originate sellers. Wanted to see if getting a valuation would be useful for you.",
    tags: ["differentiation", "value"],
  },
  {
    id: "call-15",
    name: "Step Back",
    script:
      "Curious — have you ever thought about stepping back or selling someday? That's what I specialize in.",
    tags: ["future", "specialty"],
  },
  {
    id: "call-16",
    name: "Mode Check",
    script:
      "Quick check-in — are you in growth mode, maintain mode, or possibly considering an exit?",
    tags: ["qualification", "modes"],
  },
  {
    id: "call-17",
    name: "Clarity Offer",
    script:
      "I help business owners get clarity on what their business could be worth. Worth a quick conversation?",
    tags: ["clarity", "value"],
  },
  {
    id: "call-18",
    name: "No Pressure",
    script:
      "I can get you a no-pressure valuation so you know what you're sitting on. Interested?",
    tags: ["no-pressure", "direct"],
  },
  {
    id: "call-19",
    name: "Most Don't Know",
    script:
      "Out of curiosity — do you know what your business would sell for today? Most owners don't. I can show you.",
    tags: ["statistics", "value"],
  },
  {
    id: "call-20",
    name: "Send Details",
    script:
      "This is {{sender_name}} with {{company}}. I help owners understand their exit value. Want me to send you the details?",
    tags: ["info-offer", "soft"],
  },
];

export default function MessageTemplatesPage() {
  const [activeTab, setActiveTab] = useState("initial");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // Sender configuration
  const [senderName, setSenderName] = useState("Gianna");
  const [companyName, setCompanyName] = useState("Nextier");

  // Preview variables
  const [previewVars, setPreviewVars] = useState({
    name: "John",
    first_name: "John",
    last_name: "Smith",
    business_name: "Smith Auto Repair",
    city: "Brooklyn",
    state: "NY",
    industry: "auto repair",
    revenue_range: "$1-5M",
  });

  // Replace variables in template
  const replaceVariables = (template: string) => {
    let result = template;
    result = result.replace(/\{\{sender_name\}\}/g, senderName);
    result = result.replace(/\{\{company\}\}/g, companyName);
    result = result.replace(/\{\{name\}\}/g, previewVars.name);
    result = result.replace(/\{\{first_name\}\}/g, previewVars.first_name);
    result = result.replace(/\{\{last_name\}\}/g, previewVars.last_name);
    result = result.replace(
      /\{\{business_name\}\}/g,
      previewVars.business_name,
    );
    result = result.replace(/\{\{city\}\}/g, previewVars.city);
    result = result.replace(/\{\{state\}\}/g, previewVars.state);
    result = result.replace(/\{\{industry\}\}/g, previewVars.industry);
    result = result.replace(
      /\{\{revenue_range\}\}/g,
      previewVars.revenue_range,
    );
    return result;
  };

  // Copy to clipboard
  const handleCopy = async (text: string, id: string) => {
    const processed = replaceVariables(text);
    await navigator.clipboard.writeText(processed);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter templates by search
  const filterTemplates = (
    templates: { name: string; message: string; tags: string[] }[],
  ) =>
    templates.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    );

  const filteredInitial = filterTemplates(INITIAL_SMS_TEMPLATES);
  const filteredRetarget = filterTemplates(RETARGET_SMS_TEMPLATES);
  const filteredNudge = filterTemplates(NUDGE_SMS_TEMPLATES);
  const filteredFollowup = filterTemplates(FOLLOWUP_SMS_TEMPLATES);
  const filteredRetention = filterTemplates(RETENTION_SMS_TEMPLATES);

  const filteredCalls = COLD_CALL_SCRIPTS.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.script.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  return (
    <>
      <TeamHeader
        title="Message Templates"
        links={[{ href: "/campaigns", title: "Campaigns" }]}
      />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Campaign Templates</h1>
            <p className="text-muted-foreground">
              SMS templates for each campaign stage • All under 160 characters
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Sender:</Label>
              <Select value={senderName} onValueChange={setSenderName}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gianna">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      Gianna (AI)
                    </div>
                  </SelectItem>
                  <SelectItem value="Cathy">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      Cathy (AI)
                    </div>
                  </SelectItem>
                  <SelectItem value="Sabrina">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      Sabrina (AI)
                    </div>
                  </SelectItem>
                  <SelectItem value="Tommy">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Tommy
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Company:</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-28"
              />
            </div>
          </div>
        </div>

        {/* Variable Reference */}
        <div className="flex flex-wrap gap-2 mb-6">
          {PERSONALIZATION_VARS.map((v) => (
            <Badge
              key={v.key}
              variant="outline"
              className="text-xs cursor-pointer hover:bg-blue-500/20"
              onClick={() => {
                navigator.clipboard.writeText(v.key);
                toast.success(`Copied ${v.key}`);
              }}
            >
              {v.key} → {v.example}
            </Badge>
          ))}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger
                value="initial"
                className="flex items-center gap-2 data-[state=active]:bg-blue-600"
              >
                <MessageSquare className="w-4 h-4" />
                Initial ({filteredInitial.length})
              </TabsTrigger>
              <TabsTrigger
                value="retarget"
                className="flex items-center gap-2 data-[state=active]:bg-purple-600"
              >
                Retarget ({filteredRetarget.length})
              </TabsTrigger>
              <TabsTrigger
                value="nudge"
                className="flex items-center gap-2 data-[state=active]:bg-pink-600"
              >
                Nudge ({filteredNudge.length})
              </TabsTrigger>
              <TabsTrigger
                value="followup"
                className="flex items-center gap-2 data-[state=active]:bg-amber-600"
              >
                Follow-Up ({filteredFollowup.length})
              </TabsTrigger>
              <TabsTrigger
                value="retention"
                className="flex items-center gap-2 data-[state=active]:bg-emerald-600"
              >
                Retention ({filteredRetention.length})
              </TabsTrigger>
              <TabsTrigger value="calls" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Cold Calls ({filteredCalls.length})
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Template
              </Button>
            </div>
          </div>

          {/* Initial Templates Tab */}
          <TabsContent value="initial" className="space-y-3">
            <Card className="mb-4 bg-blue-500/10 border-blue-500/30">
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">GIANNA - Initial Outreach</span>
                  <Badge variant="outline" className="ml-2">
                    New leads
                  </Badge>
                </div>
              </CardContent>
            </Card>
            {filteredInitial.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="hover:border-blue-500/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{template.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {template.category}
                          </Badge>
                          {template.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono bg-muted/30 p-3 rounded-md">
                          {template.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Preview:{" "}
                          {replaceVariables(template.message).slice(0, 80)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPreviewTemplate(template.message);
                            setShowPreviewDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleCopy(template.message, template.id)
                          }
                        >
                          {copiedId === template.id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* Retarget Templates Tab */}
          <TabsContent value="retarget" className="space-y-3">
            <Card className="mb-4 bg-purple-500/10 border-purple-500/30">
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">CATHY - Retarget</span>
                  <Badge variant="outline" className="ml-2">
                    No response (3+ days)
                  </Badge>
                </div>
              </CardContent>
            </Card>
            {filteredRetarget.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="hover:border-purple-500/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{template.name}</span>
                          {template.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono bg-muted/30 p-3 rounded-md">
                          {template.message}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(template.message, template.id)}
                      >
                        {copiedId === template.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* Nudge Templates Tab */}
          <TabsContent value="nudge" className="space-y-3">
            <Card className="mb-4 bg-pink-500/10 border-pink-500/30">
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-pink-500" />
                  <span className="font-medium">CATHY - Nudge</span>
                  <Badge variant="outline" className="ml-2">
                    Stale nurturing (2+ days)
                  </Badge>
                </div>
              </CardContent>
            </Card>
            {filteredNudge.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="hover:border-pink-500/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{template.name}</span>
                          {template.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono bg-muted/30 p-3 rounded-md">
                          {template.message}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(template.message, template.id)}
                      >
                        {copiedId === template.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* Follow-Up Templates Tab */}
          <TabsContent value="followup" className="space-y-3">
            <Card className="mb-4 bg-amber-500/10 border-amber-500/30">
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-amber-500" />
                  <span className="font-medium">Follow-Up Nurture</span>
                  <Badge variant="outline" className="ml-2">
                    Active nurturing
                  </Badge>
                </div>
              </CardContent>
            </Card>
            {filteredFollowup.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="hover:border-amber-500/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{template.name}</span>
                          {template.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono bg-muted/30 p-3 rounded-md">
                          {template.message}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(template.message, template.id)}
                      >
                        {copiedId === template.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* Retention Templates Tab */}
          <TabsContent value="retention" className="space-y-3">
            <Card className="mb-4 bg-emerald-500/10 border-emerald-500/30">
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-emerald-500" />
                  <span className="font-medium">Retention</span>
                  <Badge variant="outline" className="ml-2">
                    Existing clients
                  </Badge>
                </div>
              </CardContent>
            </Card>
            {filteredRetention.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="hover:border-emerald-500/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{template.name}</span>
                          {template.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono bg-muted/30 p-3 rounded-md">
                          {template.message}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(template.message, template.id)}
                      >
                        {copiedId === template.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* Cold Call Scripts Tab */}
          <TabsContent value="calls" className="space-y-3">
            {filteredCalls.map((script, index) => (
              <motion.div
                key={script.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="hover:border-green-500/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="w-4 h-4 text-green-500" />
                          <span className="font-medium">{script.name}</span>
                          {script.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm font-mono bg-muted/30 p-3 rounded-md">
                          "{replaceVariables(script.script)}"
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(script.script, script.id)}
                        >
                          {copiedId === script.id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* Preview & Test Tab */}
          <TabsContent value="preview" className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Variable Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    Preview Variables
                  </CardTitle>
                  <CardDescription>
                    Set sample values to preview how templates will look
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Lead Name
                      </Label>
                      <Input
                        value={previewVars.name}
                        onChange={(e) =>
                          setPreviewVars({
                            ...previewVars,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Business Name
                      </Label>
                      <Input
                        value={previewVars.business_name}
                        onChange={(e) =>
                          setPreviewVars({
                            ...previewVars,
                            business_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        City
                      </Label>
                      <Input
                        value={previewVars.city}
                        onChange={(e) =>
                          setPreviewVars({
                            ...previewVars,
                            city: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        value={previewVars.state}
                        onChange={(e) =>
                          setPreviewVars({
                            ...previewVars,
                            state: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input
                        value={previewVars.industry}
                        onChange={(e) =>
                          setPreviewVars({
                            ...previewVars,
                            industry: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Revenue Range
                      </Label>
                      <Input
                        value={previewVars.revenue_range}
                        onChange={(e) =>
                          setPreviewVars({
                            ...previewVars,
                            revenue_range: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Live Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-500" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>
                    See how your message will appear to leads
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4 min-h-[200px]">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                        {senderName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{senderName}</span>
                          <span className="text-xs text-muted-foreground">
                            via {companyName}
                          </span>
                        </div>
                        <div className="bg-blue-500/20 rounded-lg p-3 text-sm">
                          {previewTemplate
                            ? replaceVariables(previewTemplate)
                            : replaceVariables(
                                INITIAL_SMS_TEMPLATES[0].message,
                              )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          {
                            (previewTemplate
                              ? replaceVariables(previewTemplate)
                              : replaceVariables(
                                  INITIAL_SMS_TEMPLATES[0].message,
                                )
                            ).length
                          }{" "}
                          characters
                          {(previewTemplate
                            ? replaceVariables(previewTemplate)
                            : replaceVariables(INITIAL_SMS_TEMPLATES[0].message)
                          ).length > 160 && (
                            <span className="text-yellow-500 ml-2">
                              (May split into multiple messages)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const msg =
                          previewTemplate || INITIAL_SMS_TEMPLATES[0].message;
                        handleCopy(msg, "preview");
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Message
                    </Button>
                    <Button className="flex-1">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Use in Campaign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Template Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Select Template to Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {INITIAL_SMS_TEMPLATES.map((t) => (
                    <Button
                      key={t.id}
                      variant={
                        previewTemplate === t.message ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setPreviewTemplate(t.message)}
                      className="justify-start text-xs"
                    >
                      {t.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Preview</DialogTitle>
            <DialogDescription>
              This is how your message will appear with current variables
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                {senderName.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-medium mb-1">{senderName}</div>
                <div className="bg-blue-500/20 rounded-lg p-3 text-sm">
                  {previewTemplate ? replaceVariables(previewTemplate) : ""}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (previewTemplate) handleCopy(previewTemplate, "dialog");
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
