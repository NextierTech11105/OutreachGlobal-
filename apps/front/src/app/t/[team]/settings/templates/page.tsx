"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ============================================================
// ATLANTIC COAST TEMPLATES - Dealerships + Moving Companies
// ============================================================
const ATLANTIC_COAST_TEMPLATES = {
  dealership: {
    name: "Dealerships",
    description: "Vehicle transport for dealer trades, auctions, deliveries",
    templates: [
      { name: "Dealer Trade Partner", content: "Hi {first_name}, Atlantic Coast Auto Transport here. We help dealerships like {company_name} move vehicles fast - dealer trades, auctions, customer deliveries. 15 min with Frank to discuss?" },
      { name: "Overflow Capacity", content: "{first_name}, when {company_name} needs cars moved fast, do you have reliable backup? We partner with dealerships for overflow transport. Quick call with Frank?" },
      { name: "Auction Runs", content: "Hi {first_name}, Atlantic Coast here. We move 500+ vehicles/month for dealerships - auctions, trades, customer deliveries. 15 min to see if we can help {company_name}?" },
      { name: "Customer Delivery", content: "{first_name}, customers at {company_name} ever need cars delivered? We handle that. Also dealer trades and auction pickups. Worth a 15 min chat with Frank?" },
      { name: "Fast Turnaround", content: "Hey {first_name}, Atlantic Coast Auto Transport. We get cars where they need to go - fast. Partnering with dealerships in {state}. 15 min with Frank this week?" },
      { name: "[Nudge] Checking In", content: "Hey {first_name}, following up on Atlantic Coast. Still looking for a transport partner for {company_name}? Frank's got a few minutes this week." },
      { name: "[Nudge] Trade Season", content: "{first_name}, dealer trade season is picking up. Atlantic Coast can handle your overflow. 15 min with Frank to get set up before you need us?" },
      { name: "[Closer] Book Frank", content: "Great {first_name}! Let's get you 15 min with Frank to discuss the partnership. What day works this week - Tues or Thurs?" },
    ],
  },
  moving: {
    name: "Moving Companies",
    description: "Referral partnership for auto transport add-on",
    templates: [
      { name: "Add-On Service", content: "Hi {first_name}, Atlantic Coast Auto Transport here. When {company_name} moves a family, do they ask about their cars? We can be your add-on partner. 15 min?" },
      { name: "Referral Revenue", content: "{first_name}, moving companies like {company_name} get asked about car transport all the time. We handle it + referral fees. Quick call with Frank?" },
      { name: "Complete Relocation", content: "Hi {first_name}, families want complete relocation - household AND vehicles. Atlantic Coast partners with moving companies for the auto piece. 15 min to explore?" },
      { name: "Easy Handoff", content: "{first_name}, when customers at {company_name} need cars moved, we take it off your plate. Reliable, insured, you look good. Worth a chat with Frank?" },
      { name: "Partner Program", content: "Hey {first_name}, Atlantic Coast has a partner program for moving companies. Referral fees + white-glove service for your clients. 15 min to discuss?" },
      { name: "[Nudge] Easy Money", content: "Hey {first_name}, it's easy referral revenue. Customer needs car moved, you hand them to us, you get paid. Atlantic Coast makes you look good. Chat?" },
      { name: "[Closer] Book Frank", content: "Perfect {first_name}! Frank can walk you through the partnership program. Does Tues or Wed work better for a 15 min call?" },
    ],
  },
  carrier: {
    name: "Carriers",
    description: "Overflow capacity partnership",
    templates: [
      { name: "Overflow Network", content: "Hey {first_name}, Atlantic Coast Auto Transport here. We're building our carrier network in {state}. Got overflow loads that need moving. Interested in partnering?" },
      { name: "Consistent Loads", content: "{first_name}, looking for consistent loads in {state}? Atlantic Coast moves 500+ vehicles/month. Let's get you on our dispatch list. 15 min with Frank?" },
      { name: "Fill Your Lanes", content: "Hi {first_name}, Atlantic Coast here. We can help {company_name} fill lanes and keep trucks moving. Fair rates, fast pay. Worth a 15 min call?" },
    ],
  },
  frank: {
    name: "Frank Partnership (Generic)",
    description: "High-value partnership templates signed by Frank",
    templates: [
      { name: "Standards + Margin", content: "We move cars at the highest standards for partners, with dependable service and real margin on every load. Open to a quick 15 min partnership call? – Frank." },
      { name: "True Partner", content: "We move cars at the highest standards and act as a true partner, with reliable service and room for profit. Open to a 15 min call to connect? – Frank." },
      { name: "Reliability Focus", content: "We move cars at the highest standards for partners who value reliability and margin. Open to a quick 15 min call to explore fit? – Frank." },
      { name: "Long-term Partners", content: "We move cars at the highest standards and focus on long-term partners, not one-offs, with room for you to make money. 15 min call? – Frank." },
      { name: "Dependable + Margin", content: "We move cars at the highest standards, built around partners who want dependable service and margin. Open to a quick 15 min intro call? – Frank." },
    ],
  },
};

// ============================================================
// NEXTIER TEMPLATES - Property & Business Valuations
// ============================================================
const NEXTIER_TEMPLATES = {
  property: {
    name: "Property Openers",
    description: "Real estate valuation outreach",
    templates: [
      { name: "Value Drop", content: "{firstName}, your property at {address} - I ran numbers. You're sitting on more equity than you think. Want the report?" },
      { name: "Quick Math", content: "{firstName}, quick math on {address}: current market says you're undervaluing it. Free analysis if you want it." },
      { name: "Moving Fast", content: "Hey {firstName}. Properties like yours at {address} are moving fast. Want to know what yours is worth? Free report." },
      { name: "FOMO - Block Sales", content: "{firstName}, 3 properties on your block sold last month. You know what yours is worth? I'll tell you free." },
      { name: "Direct Truth", content: "{firstName}. {address}. I can tell you in 2 mins if you're sitting on gold or not. Want the truth?" },
      { name: "No BS", content: "No BS {firstName} - I'll tell you exactly what {address} is worth today. Free. Interested?" },
      { name: "Curiosity Gap", content: "{firstName}, something interesting about {address}... want me to send over what I found?" },
      { name: "Social Proof", content: "{firstName}, just helped 3 owners on {street} understand their equity. Your turn?" },
      { name: "Challenge", content: "{firstName}, bet you don't know what {address} would sell for today. Want to find out?" },
    ],
  },
  business: {
    name: "Business Openers",
    description: "Blue collar / trades business outreach",
    templates: [
      { name: "Time Savings", content: "{firstName}, businesses like {companyName} are leaving 10+ hours/week on the table. Want to see where?" },
      { name: "AI Angle", content: "{firstName}, AI isn't replacing {industry} - it's making owners like you more money. Curious?" },
      { name: "Pain Point", content: "{firstName}, tired of the phone ringing 24/7? AI can handle it. Seriously." },
      { name: "Numbers Game", content: "{firstName}, I'll show you exactly how much time {companyName} is wasting. Free analysis." },
      { name: "FOMO", content: "{firstName}, your competitors are automating. {companyName} should too. Quick chat?" },
      { name: "Direct Challenge", content: "{firstName}, you've been running {companyName} the hard way. Want to see the easy way?" },
      { name: "Exit Planning", content: "{firstName}, when you're ready to sell {companyName}, buyers want automation. Start now." },
    ],
  },
  general: {
    name: "General Openers",
    description: "Universal templates",
    templates: [
      { name: "Pattern Interrupt", content: "Not a sales call {firstName}. Just curious if you've looked at AI for your business yet." },
      { name: "Confidence", content: "{firstName}, I've got 15 mins that could change how you think about your business. In?" },
      { name: "Numbers", content: "{firstName}, 15 minutes. Free. No pitch. Just strategy. What's the downside?" },
      { name: "Scarcity", content: "{firstName}, I only do a few of these calls per week. This week you're on my list." },
    ],
  },
  nyDirect: {
    name: "NY Direct",
    description: "Blunt, aggressive NY-style",
    templates: [
      { name: "Your Call", content: "{firstName}. Your property. Your call. Want the numbers or not?" },
      { name: "60 Seconds", content: "{firstName}. 60 seconds. Tell me about {companyName}. I'll tell you how to fix it." },
      { name: "Growing or Dying", content: "{firstName}, you're either growing or dying. Which one is {companyName}?" },
      { name: "In or Out", content: "Hey {firstName}, I don't do maybes. You in or you out?" },
      { name: "Fortune Bold", content: "{firstName}, fortune favors the bold. Be bold. Call me." },
    ],
  },
};

// ============================================================
// REBUTTAL TEMPLATES
// ============================================================
const REBUTTAL_TEMPLATES = {
  notInterested: {
    name: "Not Interested",
    templates: [
      { name: "Clarify", content: "Fair enough {firstName}. Quick though - is that because you've already got this handled, or because you haven't had time to look into it?" },
      { name: "Understand", content: "Respect that {firstName}. Just curious - what would make you interested? Trying to understand." },
      { name: "Final", content: "No worries {firstName}. I'll check back in 6 months - market changes fast. Good luck." },
    ],
  },
  tooBusy: {
    name: "Too Busy",
    templates: [
      { name: "Time ROI", content: "That's exactly why you need this {firstName}. 15 mins now = 15 hrs/week back. Worth it?" },
      { name: "Busy = Need", content: "Busy is good - means you've built something. But busy also means you need automation. Quick 15?" },
    ],
  },
  alreadyHave: {
    name: "Already Have Solution",
    templates: [
      { name: "Stage Check", content: "Cool - what are you using? Always curious what's working. Most people aren't getting the full potential yet." },
      { name: "Fine vs Great", content: "Works fine vs works great = thousands of dollars. Just saying. Offer's open if you want a comparison." },
    ],
  },
  cost: {
    name: "Cost Concerns",
    templates: [
      { name: "Free First", content: "The strategy session is free {firstName}. Zero cost. We figure out if it makes sense, then talk numbers IF you want." },
      { name: "ROI Focus", content: "I'm not here to sell you something you can't afford. I'm here to show you ROI. Big difference." },
    ],
  },
};

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================
export default function TemplatesPage() {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyTemplate = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const TemplateCard = ({ name, content, id }: { name: string; content: string; id: string }) => (
    <Card className="hover:border-blue-500 transition-colors">
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <p className="font-medium text-sm mb-2">{name}</p>
            <p className="text-sm text-muted-foreground">{content}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyTemplate(content, id)}
            className="shrink-0"
          >
            {copiedId === id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex gap-1 mt-3 flex-wrap">
          {content.match(/\{[^}]+\}/g)?.map((field, i) => (
            <Badge key={i} variant="outline" className="text-xs">{field}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const TemplateGroup = ({ group, templates }: { group: { name: string; description: string; templates: { name: string; content: string }[] }; prefix: string }) => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{group.name}</h3>
        <p className="text-sm text-muted-foreground">{group.description}</p>
        <Badge variant="secondary" className="mt-1">{group.templates.length} templates</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {group.templates.map((t, i) => (
          <TemplateCard key={i} name={t.name} content={t.content} id={`${prefix}-${i}`} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Template Library</h1>
        <p className="text-muted-foreground">Click any template to copy it. Use in Pre-Queue or SMS.</p>
      </div>

      {/* Tabs by Tenant */}
      <Tabs defaultValue="atlantic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="atlantic">Atlantic Coast</TabsTrigger>
          <TabsTrigger value="nextier">Nextier</TabsTrigger>
          <TabsTrigger value="rebuttals">Rebuttals</TabsTrigger>
        </TabsList>

        {/* ATLANTIC COAST */}
        <TabsContent value="atlantic" className="space-y-8">
          <TemplateGroup group={ATLANTIC_COAST_TEMPLATES.dealership} prefix="dealer" />
          <TemplateGroup group={ATLANTIC_COAST_TEMPLATES.moving} prefix="moving" />
          <TemplateGroup group={ATLANTIC_COAST_TEMPLATES.carrier} prefix="carrier" />
          <TemplateGroup group={ATLANTIC_COAST_TEMPLATES.frank} prefix="frank" />
        </TabsContent>

        {/* NEXTIER */}
        <TabsContent value="nextier" className="space-y-8">
          <TemplateGroup group={NEXTIER_TEMPLATES.property} prefix="prop" />
          <TemplateGroup group={NEXTIER_TEMPLATES.business} prefix="biz" />
          <TemplateGroup group={NEXTIER_TEMPLATES.general} prefix="gen" />
          <TemplateGroup group={NEXTIER_TEMPLATES.nyDirect} prefix="ny" />
        </TabsContent>

        {/* REBUTTALS */}
        <TabsContent value="rebuttals" className="space-y-8">
          <TemplateGroup group={REBUTTAL_TEMPLATES.notInterested} prefix="ni" />
          <TemplateGroup group={REBUTTAL_TEMPLATES.tooBusy} prefix="tb" />
          <TemplateGroup group={REBUTTAL_TEMPLATES.alreadyHave} prefix="ah" />
          <TemplateGroup group={REBUTTAL_TEMPLATES.cost} prefix="cost" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
