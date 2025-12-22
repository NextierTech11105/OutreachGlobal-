"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  User,
  Building2,
  DollarSign,
  MapPin,
  Phone,
  Copy,
  Sparkles,
  CheckCircle2,
  Play,
} from "lucide-react";
import { sf } from "@/lib/utils/safe-format";

// Audience Personas - Organized by Category
const AUDIENCE_PERSONAS = [
  // === RESIDENTIAL PROPERTY ===
  {
    id: "distressed_seller",
    name: "Distressed Seller",
    description:
      "Pre-foreclosure, tax delinquent, or high-equity owners who may need quick sale",
    tone: "empathetic",
    urgency: "high",
    category: "residential",
  },
  {
    id: "absentee_owner",
    name: "Absentee Owner",
    description:
      "Property owners who don't live at the property - likely landlords or inherited",
    tone: "professional",
    urgency: "medium",
    category: "residential",
  },
  {
    id: "free_clear",
    name: "Free & Clear Owner",
    description:
      "No mortgage - maximum equity, may be open to selling or cash-out",
    tone: "respectful",
    urgency: "low",
    category: "residential",
  },
  {
    id: "high_equity",
    name: "High Equity Owner",
    description: "50%+ equity position, strong negotiating position",
    tone: "confident",
    urgency: "medium",
    category: "residential",
  },
  {
    id: "investor_flip",
    name: "Investment Property",
    description: "Multi-family or rental properties owned by investors",
    tone: "business",
    urgency: "medium",
    category: "residential",
  },

  // === COMMERCIAL REAL ESTATE ===
  {
    id: "cre_multifamily",
    name: "Multi-Family Owner",
    description: "Apartment buildings, duplexes, 5+ units - investor mindset",
    tone: "business",
    urgency: "medium",
    category: "commercial",
  },
  {
    id: "cre_retail",
    name: "Retail/Strip Center",
    description: "Shopping centers, strip malls, retail storefronts",
    tone: "professional",
    urgency: "medium",
    category: "commercial",
  },
  {
    id: "cre_office",
    name: "Office Building Owner",
    description: "Office properties - may want to exit in current market",
    tone: "consultative",
    urgency: "high",
    category: "commercial",
  },
  {
    id: "cre_industrial",
    name: "Industrial/Warehouse",
    description: "Warehouses, distribution centers - hot market",
    tone: "business",
    urgency: "medium",
    category: "commercial",
  },
  {
    id: "cre_mixed_use",
    name: "Mixed-Use Property",
    description: "Commercial + residential combo properties",
    tone: "professional",
    urgency: "medium",
    category: "commercial",
  },
  {
    id: "cre_land",
    name: "Land Owner",
    description: "Vacant land, development parcels, agricultural",
    tone: "patient",
    urgency: "low",
    category: "commercial",
  },

  // === BUSINESS OWNERS - AI & TECHNOLOGY ===
  {
    id: "b2b_ai_adoption",
    name: "AI-Ready Business",
    description: "Business owners looking to modernize with AI and automation",
    tone: "innovative",
    urgency: "medium",
    category: "business",
  },
  {
    id: "b2b_tech_laggard",
    name: "Tech Modernization",
    description: "Traditional business that needs digital transformation",
    tone: "educational",
    urgency: "medium",
    category: "business",
  },

  // === BUSINESS OWNERS - GROWTH ===
  {
    id: "b2b_expansion",
    name: "Growth-Mode Business",
    description: "Business actively looking to expand, add locations, or scale",
    tone: "ambitious",
    urgency: "medium",
    category: "business",
  },
  {
    id: "b2b_acquisition",
    name: "Acquisition Target",
    description: "Profitable business that could be acquired or merged",
    tone: "respectful",
    urgency: "low",
    category: "business",
  },

  // === BUSINESS OWNERS - EXIT ===
  {
    id: "b2b_exit_ready",
    name: "Exit-Ready Owner",
    description: "Owner actively preparing to sell their business",
    tone: "supportive",
    urgency: "high",
    category: "business",
  },
  {
    id: "b2b_exit_curious",
    name: "Exit-Curious Owner",
    description: "Thinking about exit but not actively planning yet",
    tone: "educational",
    urgency: "low",
    category: "business",
  },
  {
    id: "b2b_tech_exit",
    name: "Tech-Prep Exit",
    description: "Wants to implement tech/AI to increase valuation before exit",
    tone: "strategic",
    urgency: "medium",
    category: "business",
  },
  {
    id: "b2b_succession",
    name: "Succession Planning",
    description: "Planning family or employee transition of ownership",
    tone: "thoughtful",
    urgency: "low",
    category: "business",
  },

  // === BUSINESS OWNERS - CHALLENGES ===
  {
    id: "b2b_struggling",
    name: "Struggling Business",
    description: "Business facing challenges, may need turnaround help or exit",
    tone: "empathetic",
    urgency: "high",
    category: "business",
  },
  {
    id: "b2b_burnout",
    name: "Burned-Out Owner",
    description: "Long-time owner ready for change but unsure of options",
    tone: "understanding",
    urgency: "medium",
    category: "business",
  },
  {
    id: "b2b_retirement",
    name: "Retirement-Age Owner",
    description: "Owner approaching retirement, needs exit strategy",
    tone: "respectful",
    urgency: "medium",
    category: "business",
  },

  // === BUSINESS OWNERS - GENERAL ===
  {
    id: "b2b_general",
    name: "Business Owner",
    description: "General B2B outreach to business owners",
    tone: "professional",
    urgency: "low",
    category: "business",
  },
];

// Persona Categories for dropdown - Commercial & Business are PRIMARY for NEXTIER
const PERSONA_CATEGORIES = [
  { id: "business", name: "Business Owners", icon: "💼", primary: true },
  {
    id: "commercial",
    name: "Commercial Real Estate",
    icon: "🏢",
    primary: true,
  },
  {
    id: "residential",
    name: "Residential Property",
    icon: "🏠",
    primary: false,
  },
];

// Available Variables
const VARIABLES = [
  // Contact
  {
    key: "{{firstName}}",
    label: "First Name",
    example: "John",
    category: "contact",
  },
  {
    key: "{{lastName}}",
    label: "Last Name",
    example: "Smith",
    category: "contact",
  },
  {
    key: "{{fullName}}",
    label: "Full Name",
    example: "John Smith",
    category: "contact",
  },

  // Property
  {
    key: "{{propertyAddress}}",
    label: "Property Address",
    example: "123 Main St",
    category: "property",
  },
  { key: "{{city}}", label: "City", example: "Brooklyn", category: "property" },
  { key: "{{state}}", label: "State", example: "NY", category: "property" },
  { key: "{{beds}}", label: "Bedrooms", example: "3", category: "property" },
  { key: "{{baths}}", label: "Bathrooms", example: "2", category: "property" },
  { key: "{{sqft}}", label: "Sq Ft", example: "1,850", category: "property" },
  {
    key: "{{yearBuilt}}",
    label: "Year Built",
    example: "1985",
    category: "property",
  },
  {
    key: "{{propertyType}}",
    label: "Property Type",
    example: "Single Family",
    category: "property",
  },
  { key: "{{units}}", label: "# Units", example: "4", category: "property" },

  // Valuation
  {
    key: "{{estimatedValue}}",
    label: "Est. Value",
    example: "$850,000",
    category: "valuation",
  },
  {
    key: "{{equity}}",
    label: "Equity",
    example: "$450,000",
    category: "valuation",
  },
  {
    key: "{{equityPercent}}",
    label: "Equity %",
    example: "53%",
    category: "valuation",
  },
  {
    key: "{{capRate}}",
    label: "Cap Rate",
    example: "6.5%",
    category: "valuation",
  },
  { key: "{{noi}}", label: "NOI", example: "$55,000", category: "valuation" },

  // Business
  {
    key: "{{companyName}}",
    label: "Company",
    example: "ABC Plumbing",
    category: "business",
  },
  {
    key: "{{industry}}",
    label: "Industry",
    example: "Plumbing Services",
    category: "business",
  },
  {
    key: "{{sicCode}}",
    label: "SIC Code",
    example: "1711",
    category: "business",
  },
  {
    key: "{{revenue}}",
    label: "Revenue",
    example: "$2.5M",
    category: "business",
  },
  {
    key: "{{employees}}",
    label: "Employees",
    example: "15",
    category: "business",
  },
  {
    key: "{{yearsInBusiness}}",
    label: "Years in Business",
    example: "12",
    category: "business",
  },
  {
    key: "{{businessValue}}",
    label: "Business Value",
    example: "$1.2M",
    category: "business",
  },
];

// Gianna Initial Message Templates - Focus on CRE & Business Advisory
// ALL TEMPLATES MUST BE ≤160 CHARS FOR SINGLE SMS
const GIANNA_TEMPLATES = [
  // === BUSINESS ADVISORY - AI & TECH ===
  {
    id: "b2b_ai_intro",
    name: "AI Adoption Intro",
    persona: "b2b_ai_adoption",
    category: "business",
    message: `Hi {{firstName}}, {{companyName}} caught my eye. We help {{industry}} businesses use AI to cut costs. Curious if you've explored this?`,
    variables: ["firstName", "companyName", "industry"],
  },
  {
    id: "b2b_tech_modernize",
    name: "Tech Modernization",
    persona: "b2b_tech_laggard",
    category: "business",
    message: `{{firstName}}, many {{industry}} businesses run outdated systems. We help modernize without disruption. Quick call to see if there's a fit?`,
    variables: ["firstName", "industry"],
  },

  // === BUSINESS ADVISORY - EXIT ===
  {
    id: "b2b_exit_valuation",
    name: "Exit - Valuation Curiosity",
    persona: "b2b_exit_curious",
    category: "business",
    message: `Hi {{firstName}}, curious what {{companyName}} might be worth? Even if not selling, knowing your number is valuable. Quick analysis?`,
    variables: ["firstName", "companyName"],
  },
  {
    id: "b2b_exit_ready",
    name: "Exit - Ready to Sell",
    persona: "b2b_exit_ready",
    category: "business",
    message: `{{firstName}}, with {{companyName}} at {{revenue}}/yr, buyers are interested. Thinking about your next chapter? Happy to share what I'm seeing.`,
    variables: ["firstName", "companyName", "revenue"],
  },
  {
    id: "b2b_tech_exit",
    name: "Tech-Prep for Exit",
    persona: "b2b_tech_exit",
    category: "business",
    message: `Hi {{firstName}}, modern systems = 20-30% higher valuations at exit. Want to see how smart owners prep {{companyName}} for max value?`,
    variables: ["firstName", "companyName"],
  },

  // === BUSINESS ADVISORY - GROWTH ===
  {
    id: "b2b_expansion",
    name: "Expansion Support",
    persona: "b2b_expansion",
    category: "business",
    message: `{{firstName}}, {{companyName}} is growing in {{city}}! We help with expansion - new locations, acquisitions, scaling. Worth a quick chat?`,
    variables: ["firstName", "companyName", "city"],
  },
  {
    id: "b2b_acquisition",
    name: "Acquisition Interest",
    persona: "b2b_acquisition",
    category: "business",
    message: `Hi {{firstName}}, buyers are looking at {{industry}} in {{state}}. {{companyName}} came up. Open to hearing offers? No pressure.`,
    variables: ["firstName", "industry", "state", "companyName"],
  },

  // === BUSINESS ADVISORY - CHALLENGES ===
  {
    id: "b2b_struggling",
    name: "Turnaround Support",
    persona: "b2b_struggling",
    category: "business",
    message: `{{firstName}}, {{industry}} can be tough. We help owners navigate challenges and come out stronger. Want to talk through options? No judgment.`,
    variables: ["firstName", "industry"],
  },
  {
    id: "b2b_retirement",
    name: "Retirement Planning",
    persona: "b2b_retirement",
    category: "business",
    message: `Hi {{firstName}}, after {{yearsInBusiness}} yrs building {{companyName}}, you've earned what's next. I help owners plan smooth exits. Coffee?`,
    variables: ["firstName", "yearsInBusiness", "companyName"],
  },

  // === COMMERCIAL REAL ESTATE ===
  {
    id: "cre_multifamily",
    name: "Multi-Family Inquiry",
    persona: "cre_multifamily",
    category: "commercial",
    message: `{{firstName}}, your {{units}}-unit at {{propertyAddress}} - thought about options? I work with investors looking in {{city}}.`,
    variables: ["firstName", "units", "propertyAddress", "city"],
  },
  {
    id: "cre_office",
    name: "Office Building Outreach",
    persona: "cre_office",
    category: "commercial",
    message: `Hi {{firstName}}, office market has shifted. Thought about repositioning or selling {{propertyAddress}}? Happy to share what I'm seeing.`,
    variables: ["firstName", "propertyAddress"],
  },
  {
    id: "cre_retail",
    name: "Retail Property Interest",
    persona: "cre_retail",
    category: "commercial",
    message: `{{firstName}}, retail is strong in {{city}}. Your property at {{propertyAddress}} - I have buyers looking. Open to a quick call?`,
    variables: ["firstName", "city", "propertyAddress"],
  },
  {
    id: "cre_industrial",
    name: "Industrial/Warehouse",
    persona: "cre_industrial",
    category: "commercial",
    message: `Hi {{firstName}}, industrial is hot. Your warehouse at {{propertyAddress}} is what my buyers want. Worth exploring offers?`,
    variables: ["firstName", "propertyAddress"],
  },
  {
    id: "cre_land",
    name: "Land Development",
    persona: "cre_land",
    category: "commercial",
    message: `{{firstName}}, developers looking for land in {{city}}. Your parcel at {{propertyAddress}} came up. Interested in discussing?`,
    variables: ["firstName", "city", "propertyAddress"],
  },
  {
    id: "cre_value_add",
    name: "CRE Value Add",
    persona: "cre_mixed_use",
    category: "commercial",
    message: `Hi {{firstName}}, {{propertyAddress}} may have untapped value. I help owners maximize CRE returns. Want an analysis?`,
    variables: ["firstName", "propertyAddress"],
  },

  // === RESIDENTIAL (Secondary) ===
  {
    id: "res_warm_intro",
    name: "Residential - Warm Intro",
    persona: "distressed_seller",
    category: "residential",
    message: `Hey {{firstName}}, saw your place at {{propertyAddress}} in {{city}}. I work with buyers in that area. Consider selling if the price is right?`,
    variables: ["firstName", "city", "propertyAddress"],
  },
  {
    id: "res_equity",
    name: "Residential - High Equity",
    persona: "high_equity",
    category: "residential",
    message: `Hi {{firstName}}! {{propertyAddress}} could be worth ~{{estimatedValue}} based on recent sales. Thought about what to do with that equity?`,
    variables: ["firstName", "propertyAddress", "estimatedValue"],
  },

  // === FOLLOW UPS ===
  {
    id: "follow_up_business",
    name: "Follow Up - Business",
    persona: "any",
    category: "business",
    message: `Hey {{firstName}}, following up on {{companyName}}. Any questions or want to chat? No pressure - just let me know!`,
    variables: ["firstName", "companyName"],
  },
  {
    id: "follow_up_cre",
    name: "Follow Up - CRE",
    persona: "any",
    category: "commercial",
    message: `{{firstName}}, circling back on {{propertyAddress}}. Market moving fast - curious about options? Happy to share what I'm seeing.`,
    variables: ["firstName", "propertyAddress"],
  },
];

// Campaign Types for ML classification and workflow orchestration
export type CampaignType = "initial" | "nudger" | "nurture";

const CAMPAIGN_TYPES: { id: CampaignType; name: string; description: string; icon: string }[] = [
  {
    id: "initial",
    name: "Initial Outreach",
    description: "First contact - Day 1 opener to new leads",
    icon: "🎯",
  },
  {
    id: "nudger",
    name: "Nudger",
    description: "Gentle follow-up for non-responders (CATHY)",
    icon: "👋",
  },
  {
    id: "nurture",
    name: "Nurture",
    description: "Long-term engagement for warm leads",
    icon: "🌱",
  },
];

interface SMSCampaignSetupProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  dataType: "property" | "business";
  onSubmit: (config: SMSCampaignConfig) => void;
}

export interface SMSCampaignConfig {
  category: string;
  persona: string;
  template: string;
  customMessage: string;
  campaignName: string;
  audienceDescription: string; // Custom context from user
  // === ML & Tracking Fields ===
  campaignType: CampaignType; // initial | nudger | nurture
  // Attempt tracking (auto-populated on creation)
  attemptNumber: number; // Which attempt is this (1 = first, 2 = second, etc.)
  totalAttemptsSinceInception: number; // Total attempts across all campaign types
  lastAttemptedAt: string | null; // ISO timestamp of last attempt
  // ML Labels
  mlLabels: {
    campaignType: CampaignType;
    attemptSequence: number;
    createdAtUtc: string;
    scheduledAtUtc: string | null;
    audienceContext: string;
    personaId: string;
  };
}

export function SMSCampaignSetup({
  isOpen,
  onClose,
  selectedCount,
  dataType,
  onSubmit,
}: SMSCampaignSetupProps) {
  // Default to "business" category for NEXTIER focus
  const [selectedCategory, setSelectedCategory] = useState("business");
  const [selectedPersona, setSelectedPersona] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [audienceDescription, setAudienceDescription] = useState("");
  const [activeTab, setActiveTab] = useState("templates");
  // Campaign Type - Initial, Nudger, or Nurture
  const [campaignType, setCampaignType] = useState<CampaignType>("initial");

  // Filter personas by selected category
  const filteredPersonas = AUDIENCE_PERSONAS.filter(
    (p) => p.category === selectedCategory,
  );

  // Filter templates by category and persona
  const filteredTemplates = GIANNA_TEMPLATES.filter((t) => {
    const matchesCategory = t.category === selectedCategory;
    const matchesPersona =
      !selectedPersona || t.persona === selectedPersona || t.persona === "any";
    return matchesCategory && matchesPersona;
  });

  // Handle template selection
  const selectTemplate = (template: (typeof GIANNA_TEMPLATES)[0]) => {
    setSelectedTemplate(template.id);
    setCustomMessage(template.message);
  };

  // Copy variable to clipboard
  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
  };

  // Insert variable at cursor
  const insertVariable = (variable: string) => {
    setCustomMessage((prev) => prev + " " + variable);
  };

  // Handle submit - include ML tracking fields
  const handleSubmit = () => {
    const now = new Date().toISOString();
    onSubmit({
      category: selectedCategory,
      persona: selectedPersona,
      template: selectedTemplate,
      customMessage,
      campaignName:
        campaignName || `Campaign ${new Date().toLocaleDateString()}`,
      audienceDescription,
      // === ML & Tracking Fields ===
      campaignType,
      attemptNumber: 1, // This is attempt #1 for this campaign
      totalAttemptsSinceInception: 1, // Will be updated by backend with actual count
      lastAttemptedAt: null, // No previous attempt
      mlLabels: {
        campaignType,
        attemptSequence: 1,
        createdAtUtc: now,
        scheduledAtUtc: null, // Will be set when scheduled
        audienceContext: audienceDescription,
        personaId: selectedPersona,
      },
    });
    onClose();
  };

  // Reset persona when category changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedPersona("");
    setSelectedTemplate("");
    setCustomMessage("");
  };

  const selectedPersonaData = AUDIENCE_PERSONAS.find(
    (p) => p.id === selectedPersona,
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            SMS Campaign Setup
          </DialogTitle>
          <DialogDescription>
            Configure your initial message for {sf(selectedCount)} contacts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label>Campaign Name</Label>
            <Input
              placeholder="e.g., NYC Plumbing Contractors - Exit Ready"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>

          {/* Campaign Type - Initial, Nudger, Nurture */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Campaign Type <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {CAMPAIGN_TYPES.map((type) => (
                <Card
                  key={type.id}
                  className={`cursor-pointer transition-all ${
                    campaignType === type.id
                      ? "border-green-500 bg-green-500/5"
                      : "hover:border-muted-foreground/50"
                  }`}
                  onClick={() => setCampaignType(type.id)}
                >
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className="font-medium text-sm">{type.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {type.description}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              ⚡ All attempts logged with timestamps for ML training
            </p>
          </div>

          {/* Category Selection - Business & CRE Primary */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Campaign Category
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {PERSONA_CATEGORIES.map((cat) => (
                <Card
                  key={cat.id}
                  className={`cursor-pointer transition-all ${
                    selectedCategory === cat.id
                      ? "border-green-500 bg-green-500/5"
                      : "hover:border-muted-foreground/50"
                  } ${!cat.primary ? "opacity-70" : ""}`}
                  onClick={() => handleCategoryChange(cat.id)}
                >
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl mb-1">{cat.icon}</div>
                    <div className="font-medium text-sm">{cat.name}</div>
                    {!cat.primary && (
                      <div className="text-xs text-muted-foreground">
                        (Secondary)
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Audience Description - REQUIRED for accuracy */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Describe Your Audience <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Be specific! Example: 'Plumbing contractors in Brooklyn doing $1-5M revenue who might want to sell in 2-3 years and could benefit from AI/tech modernization before exit'"
              value={audienceDescription}
              onChange={(e) => setAudienceDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              The more specific you are, the better Gianna can tailor her
              approach
            </p>
          </div>

          {/* Audience Persona */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Select Persona Type
            </Label>
            <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-2">
              {filteredPersonas.map((persona) => (
                <Card
                  key={persona.id}
                  className={`cursor-pointer transition-all ${
                    selectedPersona === persona.id
                      ? "border-green-500 bg-green-500/5"
                      : "hover:border-muted-foreground/50"
                  }`}
                  onClick={() => setSelectedPersona(persona.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="font-medium text-sm">{persona.name}</div>
                      {selectedPersona === persona.id && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {persona.description}
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {persona.tone}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          persona.urgency === "high"
                            ? "bg-red-500/10 text-red-500"
                            : persona.urgency === "medium"
                              ? "bg-yellow-500/10 text-yellow-600"
                              : "bg-blue-500/10 text-blue-500"
                        }`}
                      >
                        {persona.urgency} urgency
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Message Setup */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Gianna Templates
              </TabsTrigger>
              <TabsTrigger value="custom" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Custom Message
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-3 mt-4">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all ${
                    selectedTemplate === template.id
                      ? "border-green-500 bg-green-500/5"
                      : "hover:border-muted-foreground/50"
                  }`}
                  onClick={() => selectTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-medium">{template.name}</div>
                      {selectedTemplate === template.id && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {template.message}
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {template.variables.map((v) => (
                        <Badge key={v} variant="outline" className="text-xs">
                          {`{{${v}}}`}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="custom" className="space-y-4 mt-4">
              {/* Variables Panel */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Click to insert variable:
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.filter((v) =>
                    dataType === "business"
                      ? v.category === "contact" || v.category === "business"
                      : v.category !== "business",
                  ).map((variable) => (
                    <Badge
                      key={variable.key}
                      variant="outline"
                      className="cursor-pointer hover:bg-green-500/10 hover:border-green-500 transition-colors"
                      onClick={() => insertVariable(variable.key)}
                    >
                      {variable.key}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Message Editor */}
              <div className="space-y-2">
                <Label>Your Message (160 char limit)</Label>
                <Textarea
                  placeholder="Type your message here... Use variables like {{firstName}} to personalize"
                  value={customMessage}
                  onChange={(e) => {
                    // Enforce 160 char limit for single SMS
                    if (e.target.value.length <= 160) {
                      setCustomMessage(e.target.value);
                    }
                  }}
                  maxLength={160}
                  rows={4}
                  className={`font-mono text-sm ${customMessage.length >= 150 ? 'border-yellow-500' : ''} ${customMessage.length >= 160 ? 'border-red-500' : ''}`}
                />
                <div className="flex justify-between text-xs">
                  <span className={customMessage.length >= 150 ? (customMessage.length >= 160 ? 'text-red-500 font-medium' : 'text-yellow-500') : 'text-muted-foreground'}>
                    {customMessage.length}/160 characters
                  </span>
                  <span className={customMessage.length > 160 ? 'text-red-500' : 'text-green-500'}>
                    {customMessage.length <= 160 ? '✓ Single SMS' : '⚠ Too long'}
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Preview */}
          {customMessage && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Message Preview
              </Label>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="text-sm whitespace-pre-wrap">
                  {customMessage
                    .replace(/\{\{firstName\}\}/g, "John")
                    .replace(/\{\{lastName\}\}/g, "Smith")
                    .replace(/\{\{fullName\}\}/g, "John Smith")
                    .replace(/\{\{propertyAddress\}\}/g, "123 Main St")
                    .replace(/\{\{city\}\}/g, "Brooklyn")
                    .replace(/\{\{state\}\}/g, "NY")
                    .replace(/\{\{estimatedValue\}\}/g, "$850,000")
                    .replace(/\{\{equity\}\}/g, "$450,000")
                    .replace(/\{\{equityPercent\}\}/g, "53%")
                    .replace(/\{\{companyName\}\}/g, "ABC Plumbing")
                    .replace(/\{\{industry\}\}/g, "Plumbing Services")
                    .replace(/\{\{revenue\}\}/g, "$2.5M")
                    .replace(/\{\{employees\}\}/g, "15")
                    .replace(/\{\{yearsInBusiness\}\}/g, "12")
                    .replace(/\{\{businessValue\}\}/g, "$1.2M")
                    .replace(/\{\{units\}\}/g, "8")
                    .replace(/\{\{capRate\}\}/g, "6.5%")
                    .replace(/\{\{noi\}\}/g, "$55,000")}
                </div>
              </div>
            </div>
          )}

          {/* Audience Context Summary */}
          {audienceDescription && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="text-xs font-medium text-blue-600 mb-1">
                Your Audience Context:
              </div>
              <div className="text-sm text-muted-foreground">
                {audienceDescription}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!customMessage || !audienceDescription}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Play className="h-4 w-4" />
            Push {sf(selectedCount)} to SMS Queue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SMSCampaignSetup;
