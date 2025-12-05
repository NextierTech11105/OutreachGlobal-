"use client";

import type React from "react";

import { useState } from "react";
import { Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock AI SDR data
const aiSdrs = [
  {
    id: "1",
    name: "Gianna",
    model: "Nextier Business Broker",
    description: "AI-Powered Deal Sourcing & Business Valuation Specialist",
    industry: "real-estate",
    tags: ["foreclosure", "homeowner", "advocate"],
    avatar: "/stylized-letters-sj.png",
    mission:
      "Guide homeowners through foreclosure, auction delays, loan modifications, and equity recovery.",
    goal: "Help clients navigate legal, financial, and strategic options at zero cost while leading them to a consultation.",
    role: [
      "Engage personally (mentions the homeowner's name).",
      "Educate homeowners on foreclosure timelines, legal rights, and financial solutions.",
      "Lead them to a free consultation to explore monetary options, short sales, loan modifications, or delaying foreclosure.",
      "Objection Handling: Overcome fear, misinformation, and procrastination.",
    ],
    faqs: [
      {
        question: "How is Elite Homeowner Advisor different from an attorney?",
        answer:
          "We provide free advisory services to help homeowners understand their situation, while attorneys charge substantial legal fees.",
      },
      {
        question: "I applied for a loan modification. How can you help?",
        answer:
          "We help you understand hidden clauses, repayment terms, and financial impact before committing.",
      },
      {
        question: "My house is going to auction. What are my options?",
        answer:
          "There may still be ways to delay or stop the auction. We'll explore loan negotiations, short sales, and postponement strategies.",
      },
    ],
  },
  {
    id: "2",
    name: "Gianna",
    model: "Nextier M&A Advisory",
    description:
      "AI-Powered M&A Advisory for Business Owners & Exit Planning",
    industry: "real-estate",
    tags: ["development", "buyouts", "consulting"],
    avatar: "/stylized-letters-sj.png",
    mission:
      "Identify high-value exit or repositioning strategies for property owners.",
    goal: "Help clients unlock hidden value in real estate through development, 1031 exchanges, estate sales, and commercial repositioning.",
    role: [
      "Analyze property potential (redevelopment, rezoning, or cash-out strategies).",
      "Assist investors, developers, and owners in navigating 1031 exchanges, buyouts, and high-stakes negotiations.",
      "Connect with property owners for strategic exits (retail bidding wars, distressed asset flips).",
      "Overcome objections and drive action toward an advisory consultation.",
    ],
    faqs: [
      {
        question:
          "I own a property in an Opportunity Zone. What are my options?",
        answer:
          "Tax-advantaged development, long-term investment strategies, or quick-flip sales.",
      },
      {
        question:
          "I have a commercial property that I want to repurpose. Can you help?",
        answer:
          "Yes. We specialize in repositioning assets for the highest return (office-to-resi, mixed-use conversions, etc.).",
      },
      {
        question: "I want to do a 1031 exchange. Can you guide me?",
        answer:
          "We help identify qualifying replacement properties, timeline compliance, and maximizing tax benefits.",
      },
    ],
  },
  {
    id: "3",
    name: "Michael",
    model: "Commercial Investment Advisor",
    description: "AI-Powered Commercial Real Estate Investment Specialist",
    industry: "commercial",
    tags: ["commercial", "investment", "advisor"],
    avatar: "/abstract-geometric-mg.png",
    mission:
      "Help investors identify and capitalize on commercial real estate opportunities.",
    goal: "Guide clients through the commercial investment process from acquisition to exit strategy.",
    role: [
      "Analyze market trends and identify high-potential commercial properties.",
      "Provide detailed ROI analysis and investment projections.",
      "Guide investors through financing options and tax strategies.",
      "Develop exit strategies that maximize returns.",
    ],
    faqs: [
      {
        question: "What types of commercial properties should I consider?",
        answer:
          "It depends on your investment goals, but we can analyze retail, office, industrial, and mixed-use opportunities.",
      },
      {
        question:
          "How do I evaluate the potential ROI of a commercial property?",
        answer:
          "We use a comprehensive analysis including cap rate, cash-on-cash return, IRR, and potential appreciation.",
      },
      {
        question:
          "What financing options are available for commercial properties?",
        answer:
          "We can guide you through traditional bank loans, SBA loans, CMBS, and private equity options.",
      },
    ],
  },
  {
    id: "4",
    name: "Rachel",
    model: "Residential Investment Specialist",
    description: "AI-Powered Residential Real Estate Investment Advisor",
    industry: "residential",
    tags: ["residential", "investment", "specialist"],
    avatar: "/abstract-rj.png",
    mission:
      "Help investors build and optimize residential real estate portfolios.",
    goal: "Guide clients to maximize cash flow and appreciation through strategic residential investments.",
    role: [
      "Identify high-potential residential investment properties.",
      "Analyze cash flow potential and appreciation forecasts.",
      "Guide investors through financing and tax optimization.",
      "Develop portfolio diversification strategies.",
    ],
    faqs: [
      {
        question: "Should I focus on cash flow or appreciation?",
        answer:
          "It depends on your investment goals. We can help you balance both for optimal returns.",
      },
      {
        question: "What markets are best for residential investment?",
        answer:
          "We analyze population growth, job markets, and economic indicators to identify promising markets.",
      },
      {
        question: "How do I scale my residential portfolio?",
        answer:
          "We can guide you through BRRRR strategies, 1031 exchanges, and portfolio financing options.",
      },
    ],
  },
];

interface AiSdrSelectorProps {
  selectedAiSdrId: string | null;
  onSelectAiSdr: (id: string) => void;
}

export function AiSdrSelector({
  selectedAiSdrId,
  onSelectAiSdr,
}: AiSdrSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSdr, setSelectedSdr] = useState<(typeof aiSdrs)[0] | null>(
    null,
  );

  const filteredSdrs = aiSdrs.filter((sdr) => {
    const matchesSearch =
      sdr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sdr.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sdr.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesIndustry =
      industryFilter === "all" || sdr.industry === industryFilter;

    return matchesSearch && matchesIndustry;
  });

  const handleViewDetails = (sdr: (typeof aiSdrs)[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSdr(sdr);
    setDetailsOpen(true);
  };

  const handleSelectSdr = (id: string) => {
    onSelectAiSdr(id);
    setDetailsOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Select AI SDR Avatar</h3>
        <div className="flex items-center space-x-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search avatars..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="all"
        value={industryFilter}
        onValueChange={setIndustryFilter}
      >
        <TabsList>
          <TabsTrigger value="all">All Industries</TabsTrigger>
          <TabsTrigger value="real-estate">Real Estate</TabsTrigger>
          <TabsTrigger value="commercial">Commercial</TabsTrigger>
          <TabsTrigger value="residential">Residential</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredSdrs.map((sdr) => (
          <Card
            key={sdr.id}
            className={`cursor-pointer transition-all hover:border-primary ${selectedAiSdrId === sdr.id ? "border-2 border-primary" : ""}`}
            onClick={() => handleSelectSdr(sdr.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarImage
                    src={sdr.avatar || "/placeholder.svg"}
                    alt={sdr.name}
                  />
                  <AvatarFallback>{sdr.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm font-medium">
                    {sdr.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {sdr.model}
                  </CardDescription>
                </div>
              </div>
              {selectedAiSdrId === sdr.id && (
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  Selected
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm">{sdr.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {sdr.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => handleViewDetails(sdr, e)}
              >
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        {selectedSdr && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={selectedSdr.avatar || "/placeholder.svg"}
                    alt={selectedSdr.name}
                  />
                  <AvatarFallback>
                    {selectedSdr.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                {selectedSdr.name} - {selectedSdr.model}
              </DialogTitle>
              <DialogDescription>{selectedSdr.description}</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="profile">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="role">Role</TabsTrigger>
                <TabsTrigger value="faqs">FAQs</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div>
                  <h4 className="font-medium">Mission</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedSdr.mission}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Goal</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedSdr.goal}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Tags</h4>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedSdr.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="role" className="space-y-4">
                <div>
                  <h4 className="font-medium">Role & Responsibilities</h4>
                  <ul className="mt-2 space-y-2">
                    {selectedSdr.role.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2 text-primary">•</span>
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="faqs" className="space-y-4">
                <div>
                  <h4 className="font-medium">Frequently Asked Questions</h4>
                  <div className="mt-2 space-y-4">
                    {selectedSdr.faqs.map((faq, index) => (
                      <div key={index} className="space-y-1">
                        <h5 className="text-sm font-medium">{faq.question}</h5>
                        <p className="text-sm text-muted-foreground">
                          {faq.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleSelectSdr(selectedSdr.id)}>
                Select Avatar
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
