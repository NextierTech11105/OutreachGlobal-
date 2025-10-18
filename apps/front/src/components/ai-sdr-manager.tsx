"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle } from "lucide-react";
import { AiSdrForm } from "@/components/ai-sdr-form";
import { AiSdrList } from "@/components/ai-sdr-list";
import { AiSdrDetail } from "@/components/ai-sdr-detail";
import { useToast } from "@/hooks/use-toast";

export type AiSdr = {
  id: number;
  name: string;
  description: string;
  personality: string;
  voiceType: string;
  avatarUrl: string;
  isActive: boolean;
  industry: string;
  mission: string;
  goal: string;
  role: string[];
  faqs: Array<{
    question: string;
    answer: string;
    category?: string;
  }>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export function AiSdrManager() {
  const [activeTab, setActiveTab] = useState("list");
  const [selectedSdr, setSelectedSdr] = useState<AiSdr | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Mock data for demonstration
  const [sdrs, setSdrs] = useState<AiSdr[]>([
    {
      id: 1,
      name: "Sabrina for Elite Homeowner Advisors",
      description: "AI-Powered Foreclosure Strategist & Homeowner Advocate",
      personality: "Empathetic, knowledgeable, and solution-oriented",
      voiceType: "Professional Female",
      avatarUrl: "/stylized-letters-sj.png",
      isActive: true,
      industry: "Real Estate - Foreclosure",
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
          question:
            "How is Elite Homeowner Advisor different from an attorney?",
          answer:
            "We provide free advisory services to help homeowners understand their situation, while attorneys charge substantial legal fees.",
          category: "services",
        },
        {
          question: "I applied for a loan modification. How can you help?",
          answer:
            "We help you understand hidden clauses, repayment terms, and financial impact before committing.",
          category: "loan",
        },
        {
          question:
            "I'm going to a Foreclosure Settlement Conference. How can you assist?",
          answer:
            "We provide a step-by-step breakdown of what to expect and strategic negotiation points.",
          category: "legal",
        },
        {
          question: "My house is going to auction. What are my options?",
          answer:
            "There may still be ways to delay or stop the auction. We'll explore loan negotiations, short sales, and postponement strategies.",
          category: "auction",
        },
        {
          question: "How much do you charge for your services?",
          answer: "$0. We never charge homeowners.",
          category: "pricing",
        },
      ],
      tags: ["foreclosure", "homeowner", "loan-modification", "auction"],
      createdAt: "2023-01-15T12:00:00Z",
      updatedAt: "2023-04-20T14:30:00Z",
    },
    {
      id: 2,
      name: "Sabrina for High-Level Real Estate Consulting",
      description:
        "AI-Powered Consultant for Development, Buyouts & Complex Real Estate Strategies",
      personality: "Strategic, analytical, and business-focused",
      voiceType: "Professional Female",
      avatarUrl: "/stylized-letters-sj.png",
      isActive: true,
      industry: "Real Estate - Consulting",
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
          category: "investment",
        },
        {
          question:
            "I have a commercial property that I want to repurpose. Can you help?",
          answer:
            "Yes. We specialize in repositioning assets for the highest return (office-to-resi, mixed-use conversions, etc.).",
          category: "commercial",
        },
        {
          question: "I want to do a 1031 exchange. Can you guide me?",
          answer:
            "We help identify qualifying replacement properties, timeline compliance, and maximizing tax benefits.",
          category: "tax",
        },
        {
          question: "My property is distressed. Does that limit my options?",
          answer:
            "No. We specialize in turning distressed assets into high-value opportunities.",
          category: "distressed",
        },
        {
          question:
            "I want to sell my retail property but attract multiple bidders. Can you assist?",
          answer:
            "Yes! We specialize in retail bidding war strategies to maximize your sale price.",
          category: "retail",
        },
      ],
      tags: ["development", "1031-exchange", "commercial", "opportunity-zone"],
      createdAt: "2023-02-10T09:15:00Z",
      updatedAt: "2023-05-05T11:45:00Z",
    },
  ]);

  const handleAddNew = () => {
    setSelectedSdr(null);
    setIsEditing(false);
    setActiveTab("form");
  };

  const handleEdit = (sdr: AiSdr) => {
    setSelectedSdr(sdr);
    setIsEditing(true);
    setActiveTab("form");
  };

  const handleView = (sdr: AiSdr) => {
    setSelectedSdr(sdr);
    setActiveTab("detail");
  };

  const handleDuplicate = (sdr: AiSdr) => {
    const newSdr = {
      ...sdr,
      id: Date.now(), // Generate a temporary ID
      name: `${sdr.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSdrs([...sdrs, newSdr]);
    toast({
      title: "Avatar Duplicated",
      description: `${sdr.name} has been duplicated successfully.`,
    });
  };

  const handleDelete = (id: number) => {
    setSdrs(sdrs.filter((sdr) => sdr.id !== id));
    toast({
      title: "Avatar Deleted",
      description: "The AI SDR avatar has been deleted successfully.",
    });
  };

  const handleSave = (sdr: Omit<AiSdr, "id" | "createdAt" | "updatedAt">) => {
    if (isEditing && selectedSdr) {
      // Update existing SDR
      setSdrs(
        sdrs.map((item) =>
          item.id === selectedSdr.id
            ? {
                ...item,
                ...sdr,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      toast({
        title: "Avatar Updated",
        description: `${sdr.name} has been updated successfully.`,
      });
    } else {
      // Add new SDR
      const newSdr = {
        ...sdr,
        id: Date.now(), // Generate a temporary ID
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSdrs([...sdrs, newSdr]);
      toast({
        title: "Avatar Created",
        description: `${sdr.name} has been created successfully.`,
      });
    }
    setActiveTab("list");
  };

  const handleCancel = () => {
    setActiveTab("list");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI SDR Avatar Management</CardTitle>
        <CardDescription>
          Create and manage AI SDR avatars for your campaigns. These avatars can
          be used to automate outreach and follow-ups.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="list">All Avatars</TabsTrigger>
              <TabsTrigger value="form" disabled={activeTab !== "form"}>
                {isEditing ? "Edit Avatar" : "New Avatar"}
              </TabsTrigger>
              <TabsTrigger value="detail" disabled={activeTab !== "detail"}>
                Avatar Details
              </TabsTrigger>
            </TabsList>
            {activeTab === "list" && (
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Avatar
              </Button>
            )}
          </div>

          <TabsContent value="list" className="mt-0">
            <AiSdrList
              sdrs={sdrs}
              onView={handleView}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          </TabsContent>

          <TabsContent value="form" className="mt-0">
            <AiSdrForm
              initialData={isEditing ? selectedSdr : undefined}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </TabsContent>

          <TabsContent value="detail" className="mt-0">
            {selectedSdr && (
              <AiSdrDetail
                sdr={selectedSdr}
                onEdit={() => handleEdit(selectedSdr)}
                onBack={() => setActiveTab("list")}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
