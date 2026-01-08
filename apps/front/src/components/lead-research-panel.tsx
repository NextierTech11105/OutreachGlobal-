"use client";

import { useState } from "react";
import {
  Building2,
  User,
  Phone,
  Calendar,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Loader2,
  X,
  Clock,
  DollarSign,
  Users,
  Zap,
  Shield,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Message } from "@/types/message";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES - Matches NEVA research output
// ═══════════════════════════════════════════════════════════════════════════════

export interface BusinessValidation {
  isOperating: boolean;
  confidence: number;
  lastVerified: string;
  sources: string[];
  warnings: string[];
}

export interface FinancialHealth {
  estimatedRevenue: string | null;
  fundingStage: string | null;
  recentFunding: string | null;
  profitability: "profitable" | "break_even" | "growth_stage" | "unknown";
  signals: string[];
}

export interface Stakeholder {
  name: string;
  title: string;
  role: "champion" | "decision_maker" | "influencer" | "blocker" | "unknown";
  linkedIn: string | null;
  notes: string;
}

export interface Competitor {
  name: string;
  relationship: "current_vendor" | "past_vendor" | "evaluating" | "none";
  strengths: string[];
  weaknesses: string[];
  battleCard: string;
}

export interface Risk {
  category: string;
  description: string;
  mitigation: string;
}

export interface RiskAssessment {
  overallRisk: "high" | "medium" | "low";
  risks: Risk[];
}

export interface EngagementStrategy {
  entryPoint: string;
  valueProp: string;
  nextSteps: string[];
  timeline: string;
  talkingPoints: string[];
}

export interface PainPoint {
  category: string;
  description: string;
  severity: "high" | "medium" | "low";
  solutionFit: string;
}

export interface LeadResearchResult {
  companyName: string;
  validation?: BusinessValidation;
  opportunityScore: number;
  financialHealth?: FinancialHealth;
  stakeholders?: Stakeholder[];
  competitiveLandscape?: Competitor[];
  riskAssessment?: RiskAssessment;
  engagementStrategy?: EngagementStrategy;
  painPoints?: PainPoint[];
  researchedAt: string;
  executionTimeMs?: number;
}

interface LeadResearchPanelProps {
  message: Message;
  result: LeadResearchResult | null;
  isLoading: boolean;
  onClose: () => void;
  onCallNow: () => void;
  onAddBooking: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LeadResearchPanel({
  message,
  result,
  isLoading,
  onClose,
  onCallNow,
  onAddBooking,
}: LeadResearchPanelProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getRiskColor = (risk: "high" | "medium" | "low") => {
    switch (risk) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-amber-500";
      case "low":
        return "bg-green-500";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
              Researching Lead...
            </CardTitle>
            <CardDescription>
              NEVA is gathering intelligence via Perplexity AI
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto" />
            <div className="space-y-2">
              <p className="font-medium">
                Analyzing {message.companyName || message.fromName}...
              </p>
              <p className="text-sm text-muted-foreground">
                Checking business status, financials, stakeholders, and
                competitive landscape
              </p>
            </div>
            <div className="flex gap-2 justify-center flex-wrap text-xs">
              <Badge variant="outline" className="animate-pulse">
                <Building2 className="h-3 w-3 mr-1" />
                Company Intel
              </Badge>
              <Badge variant="outline" className="animate-pulse delay-100">
                <Users className="h-3 w-3 mr-1" />
                Stakeholders
              </Badge>
              <Badge variant="outline" className="animate-pulse delay-200">
                <Target className="h-3 w-3 mr-1" />
                Pain Points
              </Badge>
              <Badge variant="outline" className="animate-pulse delay-300">
                <Zap className="h-3 w-3 mr-1" />
                Strategy
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>No Research Data</CardTitle>
          <CardDescription>Research results not available</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onClose}>Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      {/* Header with score and actions */}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {result.companyName}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {message.fromName && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {message.fromName}
                </span>
              )}
              {message.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {message.phone}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Opportunity Score */}
            <div className="text-right">
              <div
                className={cn(
                  "text-2xl font-bold",
                  getScoreColor(result.opportunityScore),
                )}
              >
                {result.opportunityScore}
              </div>
              <div className="text-xs text-muted-foreground">Opp Score</div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            onClick={onCallNow}
            className="gap-1 bg-green-600 hover:bg-green-700"
          >
            <Phone className="h-4 w-4" />
            Call Now
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onAddBooking}
            className="gap-1"
          >
            <Calendar className="h-4 w-4" />
            Book Appointment
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => {
              const talkingPoints =
                result.engagementStrategy?.talkingPoints?.join("\n• ") || "";
              copyToClipboard(
                `Talking Points:\n• ${talkingPoints}`,
                "Talking points",
              );
            }}
          >
            <Copy className="h-4 w-4" />
            Copy Script
          </Button>
        </div>
      </CardHeader>

      {/* Tabbed content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <div className="px-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview" className="text-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="strategy" className="text-xs">
              Strategy
            </TabsTrigger>
            <TabsTrigger value="stakeholders" className="text-xs">
              People
            </TabsTrigger>
            <TabsTrigger value="competition" className="text-xs">
              Competition
            </TabsTrigger>
            <TabsTrigger value="risks" className="text-xs">
              Risks
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 px-6 pb-4">
          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Validation Status */}
            {result.validation && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {result.validation.isOperating ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    Business Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        result.validation.isOperating
                          ? "default"
                          : "destructive"
                      }
                    >
                      {result.validation.isOperating
                        ? "Operating"
                        : "Not Found"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {result.validation.confidence}% confidence
                    </span>
                  </div>
                  {result.validation.warnings?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {result.validation.warnings.map((warning, i) => (
                        <p
                          key={i}
                          className="text-xs text-amber-600 flex items-center gap-1"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Financial Health */}
            {result.financialHealth && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Financial Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {result.financialHealth.estimatedRevenue && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Est. Revenue
                      </span>
                      <span className="font-medium">
                        {result.financialHealth.estimatedRevenue}
                      </span>
                    </div>
                  )}
                  {result.financialHealth.fundingStage && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Funding Stage
                      </span>
                      <Badge variant="outline">
                        {result.financialHealth.fundingStage}
                      </Badge>
                    </div>
                  )}
                  {result.financialHealth.signals?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        Signals:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {result.financialHealth.signals.map((signal, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs"
                          >
                            {signal}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pain Points */}
            {result.painPoints && result.painPoints.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Pain Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {result.painPoints.map((pain, i) => (
                    <div
                      key={i}
                      className="border-l-2 border-purple-500 pl-3 py-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {pain.category}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            pain.severity === "high" &&
                              "border-red-500 text-red-600",
                            pain.severity === "medium" &&
                              "border-amber-500 text-amber-600",
                            pain.severity === "low" &&
                              "border-green-500 text-green-600",
                          )}
                        >
                          {pain.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pain.description}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        <Sparkles className="h-3 w-3 inline mr-1" />
                        {pain.solutionFit}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* STRATEGY TAB */}
          <TabsContent value="strategy" className="mt-4 space-y-4">
            {result.engagementStrategy && (
              <>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Entry Point
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm">
                      {result.engagementStrategy.entryPoint}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Value Proposition
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm">
                      {result.engagementStrategy.valueProp}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-purple-500 bg-purple-50 dark:bg-purple-950/20">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Talking Points
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 ml-auto"
                        onClick={() => {
                          const points =
                            result.engagementStrategy?.talkingPoints?.join(
                              "\n• ",
                            );
                          copyToClipboard(`• ${points}`, "Talking points");
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-2">
                      {result.engagementStrategy.talkingPoints?.map(
                        (point, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm"
                          >
                            <ChevronRight className="h-4 w-4 mt-0.5 text-purple-500 flex-shrink-0" />
                            {point}
                          </li>
                        ),
                      )}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Next Steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-2">
                      Timeline: {result.engagementStrategy.timeline}
                    </p>
                    <ol className="space-y-1">
                      {result.engagementStrategy.nextSteps?.map((step, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Badge
                            variant="outline"
                            className="h-5 w-5 rounded-full p-0 justify-center"
                          >
                            {i + 1}
                          </Badge>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* STAKEHOLDERS TAB */}
          <TabsContent value="stakeholders" className="mt-4 space-y-4">
            {result.stakeholders && result.stakeholders.length > 0 ? (
              result.stakeholders.map((stakeholder, i) => (
                <Card key={i}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {stakeholder.name}
                      </CardTitle>
                      <Badge
                        variant={
                          stakeholder.role === "decision_maker"
                            ? "default"
                            : "outline"
                        }
                        className={cn(
                          stakeholder.role === "champion" && "bg-green-500",
                          stakeholder.role === "blocker" && "bg-red-500",
                        )}
                      >
                        {stakeholder.role.replace("_", " ")}
                      </Badge>
                    </div>
                    <CardDescription>{stakeholder.title}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      {stakeholder.notes}
                    </p>
                    {stakeholder.linkedIn && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 text-xs h-7"
                        onClick={() =>
                          window.open(stakeholder.linkedIn!, "_blank")
                        }
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        LinkedIn
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No stakeholder information available</p>
              </div>
            )}
          </TabsContent>

          {/* COMPETITION TAB */}
          <TabsContent value="competition" className="mt-4 space-y-4">
            {result.competitiveLandscape &&
            result.competitiveLandscape.length > 0 ? (
              result.competitiveLandscape.map((competitor, i) => (
                <Card key={i}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        {competitor.name}
                      </CardTitle>
                      <Badge
                        variant={
                          competitor.relationship === "current_vendor"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {competitor.relationship.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {competitor.strengths?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-600 mb-1">
                          Strengths
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {competitor.strengths.map((s, j) => (
                            <Badge
                              key={j}
                              variant="secondary"
                              className="text-xs"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {competitor.weaknesses?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-red-600 mb-1">
                          Weaknesses
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {competitor.weaknesses.map((w, j) => (
                            <Badge
                              key={j}
                              variant="outline"
                              className="text-xs border-red-200"
                            >
                              {w}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="border-l-2 border-purple-500 pl-3 bg-purple-50 dark:bg-purple-950/20 py-2 rounded-r">
                      <p className="text-xs font-medium text-purple-600 mb-1">
                        Battle Card
                      </p>
                      <p className="text-sm">{competitor.battleCard}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No competitive intelligence available</p>
              </div>
            )}
          </TabsContent>

          {/* RISKS TAB */}
          <TabsContent value="risks" className="mt-4 space-y-4">
            {result.riskAssessment && (
              <>
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Overall Risk</CardTitle>
                      <Badge
                        className={getRiskColor(
                          result.riskAssessment.overallRisk,
                        )}
                      >
                        {result.riskAssessment.overallRisk.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>

                {result.riskAssessment.risks?.map((risk, i) => (
                  <Card key={i}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        {risk.category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {risk.description}
                      </p>
                      <div className="bg-green-50 dark:bg-green-950/20 p-2 rounded border-l-2 border-green-500">
                        <p className="text-xs font-medium text-green-600 mb-1">
                          Mitigation
                        </p>
                        <p className="text-sm">{risk.mitigation}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Footer with research metadata */}
      <div className="border-t px-6 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <span>Researched {new Date(result.researchedAt).toLocaleString()}</span>
        {result.executionTimeMs && (
          <span>
            {(result.executionTimeMs / 1000).toFixed(1)}s via NEVA + Perplexity
          </span>
        )}
      </div>
    </Card>
  );
}
