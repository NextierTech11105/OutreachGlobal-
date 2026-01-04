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
    title: "Business Growth Insight",
    platform: "LinkedIn",
    category: "Business Tips",
    content: `📈 Business Growth Insight - [MONTH] 2026

Key strategies driving results this month:

🎯 Lead conversion: [X]% improvement
📊 Pipeline value: [UP/DOWN] [X]% vs last quarter
⏱️ Average deal cycle: [X] days
💰 Revenue per client: $[X]

What's working for top performers:
• [Strategy 1]
• [Strategy 2]
• [Strategy 3]

Want to discuss growth strategies for your business? Let's connect! 👇

#BusinessGrowth #B2B #Sales #LeadGeneration`,
    tags: ["business", "linkedin", "growth"],
    createdAt: "2026-01-01",
  },
  {
    id: "sm-2",
    title: "Client Success Story",
    platform: "LinkedIn",
    category: "Success Story",
    content: `🎉 CLIENT WIN!

[Client Company Name]
[Industry]

📊 Results achieved:
• [X]% increase in qualified leads
• [X] new deals closed
• $[X] revenue generated

"[Short testimonial quote from client]"

It was an honor to partner with them on this journey. Here's to continued growth! 🚀

Looking to achieve similar results? Let's talk! Link in bio 👆

#ClientSuccess #B2BSales #BusinessDevelopment #ResultsDriven`,
    tags: ["success story", "linkedin", "testimonial"],
    createdAt: "2026-01-02",
  },
  {
    id: "sm-3",
    title: "Service Spotlight Post",
    platform: "LinkedIn",
    category: "Services",
    content: `✨ SPOTLIGHT: [Service Name]

🎯 What we deliver:
• [Benefit 1]
• [Benefit 2]
• [Benefit 3]

📊 By the numbers:
• [X]+ clients served
• [X]% average improvement
• [X]-day implementation

Perfect for businesses that:
✓ [Ideal client trait 1]
✓ [Ideal client trait 2]
✓ [Ideal client trait 3]

Ready to learn more? DM or comment below! 📲

#B2BServices #BusinessSolutions #Growth #Strategy`,
    tags: ["services", "linkedin", "spotlight"],
    createdAt: "2025-12-28",
  },
  {
    id: "sm-4",
    title: "Quick Business Tip",
    platform: "Twitter/X",
    category: "Tips",
    content: `💡 Quick tip for business owners:

[One clear, actionable insight]

Reply with your thoughts! 👇

#BusinessTips #Entrepreneurship #Growth`,
    tags: ["tips", "twitter", "quick"],
    createdAt: "2025-12-25",
  },
];

const NEWSLETTER_TEMPLATES = [
  {
    id: "nl-1",
    title: "Monthly Business Insights",
    category: "Insights",
    subject: "[MONTH] Business Growth Update: Key Trends to Watch",
    content: `Hi [First Name],

Hope you're doing well! Here's your monthly update on business growth trends and opportunities.

📊 BY THE NUMBERS
• Pipeline conversion: [X]% ([UP/DOWN] from last month)
• Average deal size: $[X]
• New leads generated: [X]
• Response rate: [X]%

🔥 TOP STRATEGIES THIS MONTH
1. [Strategy 1] - [Why it works]
2. [Strategy 2] - [Why it works]
3. [Strategy 3] - [Why it works]

💡 WHAT THIS MEANS FOR YOUR BUSINESS
[2-3 sentences of analysis tailored to your audience]

📅 UPCOMING OPPORTUNITIES
• [Opportunity 1]: [Details]
• [Opportunity 2]: [Details]

Have questions about scaling your outreach? Hit reply - I'm always happy to chat!

Best,
[Your Name]

P.S. Know someone looking to grow their business? I'd love an introduction!`,
    tags: ["monthly", "insights", "newsletter"],
    createdAt: "2026-01-01",
  },
  {
    id: "nl-2",
    title: "New Opportunity Alert",
    category: "Opportunities",
    subject: "🎯 Hot New Opportunities This Week",
    content: `Hi [First Name],

I wanted to share some exciting opportunities we've identified:

🎯 FEATURED OPPORTUNITY
[Company/Industry]
Potential value: $[X] | Timeline: [X] weeks
[2-3 sentence description]
[Next steps]

MORE OPPORTUNITIES:
• [Opportunity 2] - $[X] potential - [Quick highlight]
• [Opportunity 3] - $[X] potential - [Quick highlight]
• [Opportunity 4] - $[X] potential - [Quick highlight]

These won't last long! Let me know if any align with your goals.

Talk soon,
[Your Name]`,
    tags: ["opportunities", "weekly", "alert"],
    createdAt: "2025-12-30",
  },
  {
    id: "nl-3",
    title: "Quarterly Business Review",
    category: "Value Add",
    subject: "Q[X] Business Performance Review 📊",
    content: `Hi [First Name],

As we close out the quarter, here's a look at what's working and where to focus next:

✅ WINS THIS QUARTER
• [Win 1]
• [Win 2]
• [Win 3]

📈 KEY METRICS
• [Metric 1]: [Result]
• [Metric 2]: [Result]
• [Metric 3]: [Result]

🎯 FOCUS AREAS FOR NEXT QUARTER
• [Priority 1]
• [Priority 2]

💡 PRO TIP: [Specific actionable advice]

Want to discuss strategy for the upcoming quarter? Let's schedule a call!

Best,
[Your Name]`,
    tags: ["quarterly", "review", "performance"],
    createdAt: "2025-12-20",
  },
];

const MEDIUM_ARTICLES = [
  {
    id: "ma-1",
    title: "The Complete Guide to B2B Lead Generation in 2026",
    category: "Lead Generation",
    readTime: "8 min read",
    outline: `# The Complete Guide to B2B Lead Generation in 2026

## Introduction
Hook: The B2B landscape has evolved dramatically...
Thesis: This guide walks you through everything you need to know...

## Section 1: Building Your Target List
- Identifying ideal customer profiles (ICP)
- Data sources and validation
- List hygiene best practices

## Section 2: Multi-Channel Outreach
- SMS strategies that work
- Email sequences that convert
- Cold calling frameworks

## Section 3: Message Personalization
- Variable personalization at scale
- Industry-specific messaging
- Timing and frequency optimization

## Section 4: Response Handling
- Qualification frameworks
- Objection handling scripts
- Handoff to sales protocols

## Section 5: Measuring Success
- Key metrics to track
- Pipeline attribution
- ROI calculation

## Conclusion
Recap + CTA for strategy consultation`,
    tags: ["lead generation", "guide", "comprehensive"],
    createdAt: "2026-01-01",
  },
  {
    id: "ma-2",
    title: "5 Mistakes Businesses Make With Outreach (And How to Avoid Them)",
    category: "Outreach Tips",
    readTime: "5 min read",
    outline: `# 5 Mistakes Businesses Make With Outreach (And How to Avoid Them)

## Introduction
Opening statistic: X% of outreach campaigns fail to generate ROI...
Promise: Avoid these common pitfalls...

## Mistake #1: Not Validating Your Data First
- Why data quality matters
- Costs of bad data
- Validation best practices

## Mistake #2: Generic Messaging
- The personalization imperative
- Segmentation strategies
- Template optimization

## Mistake #3: Wrong Channel Selection
- Understanding channel preferences
- Multi-touch approaches
- Channel-specific best practices

## Mistake #4: Ignoring Response Timing
- Optimal response windows
- Follow-up cadence
- Automation vs. human touch

## Mistake #5: No Clear CTA
- Single vs. multiple CTAs
- Friction reduction
- Testing and iteration

## Conclusion
Encouragement + offer to help`,
    tags: ["outreach", "mistakes", "tips"],
    createdAt: "2025-12-28",
  },
  {
    id: "ma-3",
    title: "B2B Sales Trends for 2026: What's Working Now",
    category: "Industry Analysis",
    readTime: "6 min read",
    outline: `# B2B Sales Trends for 2026: What's Working Now

## Introduction
Where we've been and where we're going...

## Trend 1: AI-Powered Personalization
- Current AI capabilities
- Implementation strategies
- ROI expectations

## Trend 2: SMS as Primary Channel
- SMS open rates vs. email
- Compliance considerations
- Best practices

## Trend 3: Buyer Journey Changes
- Self-service research
- Multi-stakeholder decisions
- Timing considerations

## Trend 4: Technology Stack Evolution
- CRM integrations
- Automation platforms
- Analytics tools

## Trend 5: Team Structure Changes
- SDR/BDR models
- AI assistants
- Performance metrics

## What This Means for Your Business
- Quick wins
- Long-term investments
- Getting started

## Conclusion
Key takeaways and action items`,
    tags: ["sales trends", "2026", "B2B"],
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
