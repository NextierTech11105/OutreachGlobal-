"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  BookOpen,
  Share2,
  Mail,
  FileText,
  Plus,
  Search,
  Copy,
  ExternalLink,
  Sparkles,
  Calendar,
  Tag,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

/**
 * CONTENT LIBRARY WORKSPACE
 *
 * Central hub for all content assets:
 * - Social Media Blueprints (LinkedIn, Twitter/X, Instagram)
 * - Newsletter Templates
 * - Medium Articles
 *
 * Features:
 * - Browse and search content
 * - Copy to clipboard for quick use
 * - AI-powered content generation
 * - Template management
 */

// Sample content data - in production this would come from an API
const SOCIAL_BLUEPRINTS = [
  {
    id: "sm-1",
    title: "Market Update Announcement",
    platform: "LinkedIn",
    category: "Market Insights",
    content: `🏠 [CITY] Market Update - [MONTH] 2026

Key insights from this month:

📈 Median home prices: [UP/DOWN] [X]% YoY
🏘️ Active listings: [X] (vs [X] last month)
⏱️ Days on market: [X] days average
💰 Price per sq ft: $[X]

What this means for [buyers/sellers]:
• [Insight 1]
• [Insight 2]
• [Insight 3]

Want a personalized analysis for your property? DM me or comment below! 👇

#RealEstate #[City]RealEstate #MarketUpdate #PropertyInvesting`,
    tags: ["market update", "linkedin", "real estate"],
    createdAt: "2026-01-01",
  },
  {
    id: "sm-2",
    title: "Just Sold Celebration",
    platform: "Instagram",
    category: "Success Story",
    content: `🎉 JUST SOLD! 🏡

[Address]
[City, State ZIP]

📍 [Neighborhood]
🛏️ [X] Beds | 🛁 [X] Baths
📐 [X] Sq Ft

Congratulations to [Buyer Name] on finding their perfect home!

It was an honor to help you through this journey. Wishing you many happy memories in your new place! 🔑✨

Thinking about making a move? Let's chat! Link in bio 👆

#JustSold #NewHomeowners #RealEstateAgent #[City]Homes #DreamHome`,
    tags: ["just sold", "instagram", "celebration"],
    createdAt: "2026-01-02",
  },
  {
    id: "sm-3",
    title: "Property Showcase Carousel",
    platform: "Instagram",
    category: "Listing",
    content: `✨ NEW LISTING ✨

📍 [Full Address]
💰 $[Price]

Slide 1: Hero exterior shot
Slide 2: Living room
Slide 3: Kitchen
Slide 4: Master bedroom
Slide 5: Backyard/outdoor space
Slide 6: Floor plan + key details

Caption:
Welcome to your new home! 🏡

This stunning [X]-bedroom gem in [Neighborhood] features:
✓ [Feature 1]
✓ [Feature 2]
✓ [Feature 3]

Open house: [Day], [Date] from [Time]

DM for details or private showing! 📲

#NewListing #ForSale #[City]RealEstate #OpenHouse`,
    tags: ["new listing", "instagram", "carousel"],
    createdAt: "2025-12-28",
  },
  {
    id: "sm-4",
    title: "Quick Market Tip",
    platform: "Twitter/X",
    category: "Tips",
    content: `🏠 Quick tip for [buyers/sellers] in today's market:

[One clear, actionable insight]

Reply with your questions! 👇

#RealEstateTips #[City]Homes`,
    tags: ["tips", "twitter", "quick"],
    createdAt: "2025-12-25",
  },
];

const NEWSLETTER_TEMPLATES = [
  {
    id: "nl-1",
    title: "Monthly Market Digest",
    category: "Market Update",
    subject: "[MONTH] Market Update: What [CITY] Homeowners Need to Know",
    content: `Hi [First Name],

Hope you're doing well! Here's your monthly update on what's happening in the [CITY] real estate market.

📊 BY THE NUMBERS
• Median home price: $[X] ([UP/DOWN] [X]% from last month)
• Homes sold: [X] ([UP/DOWN] [X]% from last year)
• Average days on market: [X]
• Inventory levels: [X] months

🔥 HOT NEIGHBORHOODS THIS MONTH
1. [Neighborhood 1] - [Why]
2. [Neighborhood 2] - [Why]
3. [Neighborhood 3] - [Why]

💡 WHAT THIS MEANS FOR YOU
[2-3 sentences of analysis tailored to your audience]

📅 UPCOMING EVENTS
• [Event 1]: [Date/Time]
• [Event 2]: [Date/Time]

Have questions about your home's value or the best time to make a move? Hit reply - I'm always happy to chat!

Best,
[Your Name]

P.S. Know someone thinking about buying or selling? I'd love an introduction!`,
    tags: ["monthly", "market update", "newsletter"],
    createdAt: "2026-01-01",
  },
  {
    id: "nl-2",
    title: "New Listings Alert",
    category: "Listings",
    subject: "🏠 Hot New Listings in [AREA] This Week",
    content: `Hi [First Name],

I wanted to share some exciting new listings that just hit the market:

🏡 FEATURED PROPERTY
[Address]
$[Price] | [X] Bed | [X] Bath | [X] Sq Ft
[2-3 sentence description]
[Link to listing]

MORE NEW LISTINGS:
• [Address 2] - $[X] - [Quick highlight]
• [Address 3] - $[X] - [Quick highlight]
• [Address 4] - $[X] - [Quick highlight]

These won't last long in today's market! Let me know if any catch your eye.

Talk soon,
[Your Name]`,
    tags: ["listings", "weekly", "alert"],
    createdAt: "2025-12-30",
  },
  {
    id: "nl-3",
    title: "Seasonal Homeowner Tips",
    category: "Value Add",
    subject: "[SEASON] Home Maintenance Checklist 🏠",
    content: `Hi [First Name],

With [SEASON] right around the corner, here are some maintenance tasks to keep your home in top shape:

✅ EXTERIOR
• [Task 1]
• [Task 2]
• [Task 3]

✅ INTERIOR
• [Task 1]
• [Task 2]
• [Task 3]

✅ SYSTEMS
• [Task 1]
• [Task 2]

💡 PRO TIP: [Specific actionable advice]

Need recommendations for contractors or service providers? I've got a great network - just ask!

Stay cozy,
[Your Name]`,
    tags: ["seasonal", "tips", "maintenance"],
    createdAt: "2025-12-20",
  },
];

const MEDIUM_ARTICLES = [
  {
    id: "ma-1",
    title: "The Complete Guide to Selling Your Home in 2026",
    category: "Seller Guide",
    readTime: "8 min read",
    outline: `# The Complete Guide to Selling Your Home in 2026

## Introduction
Hook: The real estate market has evolved dramatically...
Thesis: This guide walks you through everything you need to know...

## Section 1: Preparing Your Home
- Decluttering and staging tips
- Repairs that matter (and those that don't)
- Professional photography importance

## Section 2: Pricing Strategy
- How to research comparable sales
- The dangers of overpricing
- Strategic pricing in different market conditions

## Section 3: Marketing Your Home
- MLS and syndication
- Social media marketing
- Open houses vs. private showings

## Section 4: Navigating Offers
- Understanding contingencies
- Negotiation tactics
- Multiple offer situations

## Section 5: Closing the Deal
- Timeline expectations
- Common hurdles and solutions
- What to expect on closing day

## Conclusion
Recap + CTA to contact for personalized advice`,
    tags: ["selling", "guide", "comprehensive"],
    createdAt: "2026-01-01",
  },
  {
    id: "ma-2",
    title: "5 Mistakes First-Time Homebuyers Make (And How to Avoid Them)",
    category: "Buyer Tips",
    readTime: "5 min read",
    outline: `# 5 Mistakes First-Time Homebuyers Make (And How to Avoid Them)

## Introduction
Opening statistic: X% of first-time buyers report regrets...
Promise: Avoid these common pitfalls...

## Mistake #1: Not Getting Pre-Approved First
- Why this matters
- How pre-approval strengthens your offer
- Steps to get pre-approved

## Mistake #2: Skipping the Home Inspection
- What inspectors look for
- Cost of inspection vs. cost of surprise repairs
- Red flags to watch for

## Mistake #3: Maxing Out Your Budget
- The hidden costs of homeownership
- How to calculate what you can really afford
- Building in a buffer

## Mistake #4: Falling in Love Too Fast
- Emotional vs. logical decisions
- The importance of multiple viewings
- Having a must-have vs. nice-to-have list

## Mistake #5: Going It Alone
- Value of a buyer's agent
- How agents are compensated
- Questions to ask when choosing an agent

## Conclusion
Encouragement + offer to help`,
    tags: ["first-time buyer", "mistakes", "tips"],
    createdAt: "2025-12-28",
  },
  {
    id: "ma-3",
    title: "Understanding the 2026 Real Estate Market: Trends and Predictions",
    category: "Market Analysis",
    readTime: "6 min read",
    outline: `# Understanding the 2026 Real Estate Market: Trends and Predictions

## Introduction
Where we've been and where we're going...

## Trend 1: Interest Rate Environment
- Current rate landscape
- Fed policy expectations
- Impact on affordability

## Trend 2: Inventory Dynamics
- New construction trends
- Resale inventory expectations
- Regional variations

## Trend 3: Buyer Demographics
- Millennial and Gen Z buyers
- Remote work impact
- Migration patterns

## Trend 4: Technology in Real Estate
- AI and automation
- Virtual tours and digital transactions
- Proptech innovations

## Trend 5: Investment Opportunities
- Emerging markets
- Property types to watch
- Risk considerations

## What This Means for You
- For buyers
- For sellers
- For investors

## Conclusion
Key takeaways and action items`,
    tags: ["market trends", "2026", "predictions"],
    createdAt: "2025-12-15",
  },
];

export default function ContentLibraryPage() {
  const params = useParams();
  const teamId = params.team as string;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("social");
  const [generating, setGenerating] = useState(false);

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied "${title}" to clipboard`);
  };

  const handleGenerateContent = async () => {
    setGenerating(true);
    toast.info("AI content generation coming soon!");
    setTimeout(() => setGenerating(false), 1500);
  };

  const filteredSocial = SOCIAL_BLUEPRINTS.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  const filteredNewsletters = NEWSLETTER_TEMPLATES.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  const filteredArticles = MEDIUM_ARTICLES.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-indigo-500" />
          Content Library
        </h1>
        <p className="text-muted-foreground">
          Social media blueprints, newsletter templates, and article outlines
        </p>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleGenerateContent}
          disabled={generating}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Generate with AI
        </Button>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Social Media
          </TabsTrigger>
          <TabsTrigger value="newsletter" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Newsletters
          </TabsTrigger>
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Articles
          </TabsTrigger>
        </TabsList>

        {/* Social Media Blueprints */}
        <TabsContent value="social" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSocial.map((item) => (
              <Card
                key={item.id}
                className="hover:border-indigo-300 transition-colors"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.platform}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {item.content.slice(0, 150)}...
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(item.content, item.title)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredSocial.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Share2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No social media blueprints found</p>
            </div>
          )}
        </TabsContent>

        {/* Newsletter Templates */}
        <TabsContent value="newsletter" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredNewsletters.map((item) => (
              <Card
                key={item.id}
                className="hover:border-indigo-300 transition-colors"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Subject: {item.subject}
                      </p>
                    </div>
                    <Badge variant="secondary">{item.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[150px] mb-3">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
                      {item.content}
                    </pre>
                  </ScrollArea>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <Tag className="h-2 w-2 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(item.content, item.title)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredNewsletters.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No newsletter templates found</p>
            </div>
          )}
        </TabsContent>

        {/* Medium Articles */}
        <TabsContent value="articles" className="mt-6">
          <div className="space-y-4">
            {filteredArticles.map((item) => (
              <Card
                key={item.id}
                className="hover:border-indigo-300 transition-colors"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{item.category}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {item.readTime}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(item.outline, item.title)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Outline
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                      {item.outline}
                    </pre>
                  </ScrollArea>
                  <div className="flex items-center gap-2 mt-4">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag className="h-2 w-2 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredArticles.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No article outlines found</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
