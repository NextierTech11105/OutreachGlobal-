"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Clock,
  MessageSquare,
  AlertCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPLIANCE_RULES } from "@/lib/templates/nextier-defaults";

interface SequenceStep {
  id: string;
  type: "sms" | "email" | "call" | "wait" | "condition";
  templateId?: string;
  template?: {
    characterCount?: number;
    content?: string;
    complianceApproved?: boolean;
  };
  waitDays?: number;
  waitHours?: number;
  condition?: {
    type: string;
    threshold?: number;
    thenAction: string;
    escalateTo?: string;
  };
}

interface ComplianceCheckerProps {
  steps: SequenceStep[];
}

interface ComplianceIssue {
  severity: "error" | "warning" | "info";
  stepId?: string;
  stepIndex?: number;
  message: string;
  rule: string;
  suggestion?: string;
}

export function ComplianceChecker({ steps }: ComplianceCheckerProps) {
  const issues = useMemo(() => {
    const result: ComplianceIssue[] = [];
    let smsCount = 0;
    let lastSmsIndex = -1;
    let daysSinceLastSms = 0;
    let totalDays = 0;

    steps.forEach((step, index) => {
      // Track timing
      if (step.type === "wait") {
        totalDays += step.waitDays || 0;
        totalDays += Math.floor((step.waitHours || 0) / 24);
        daysSinceLastSms += step.waitDays || 0;
      }

      // Check SMS-specific rules
      if (step.type === "sms") {
        smsCount++;

        // Character count
        if (
          step.template?.characterCount &&
          step.template.characterCount > 160
        ) {
          result.push({
            severity: "warning",
            stepId: step.id,
            stepIndex: index + 1,
            message: `SMS exceeds 160 characters (${step.template.characterCount})`,
            rule: "SMS Length",
            suggestion: "Consider shortening to avoid message splitting",
          });
        }

        // Message spacing
        if (lastSmsIndex !== -1 && daysSinceLastSms < 1) {
          result.push({
            severity: "error",
            stepId: step.id,
            stepIndex: index + 1,
            message: "Less than 24 hours between SMS messages",
            rule: "TCPA Spacing",
            suggestion: "Add at least 24 hours between SMS messages",
          });
        }

        // Too aggressive
        if (
          smsCount > 3 &&
          !steps.slice(0, index).some((s) => s.type === "condition")
        ) {
          result.push({
            severity: "warning",
            stepId: step.id,
            stepIndex: index + 1,
            message: "More than 3 SMS without a condition check",
            rule: "Escalation Required",
            suggestion:
              "Add a condition to check for response before continuing",
          });
        }

        lastSmsIndex = index;
        daysSinceLastSms = 0;
      }

      // Check condition rules
      if (step.type === "condition") {
        if (
          !step.condition?.threshold &&
          step.condition?.type === "no-response"
        ) {
          result.push({
            severity: "info",
            stepId: step.id,
            stepIndex: index + 1,
            message: "No time threshold set for condition",
            rule: "Condition Timing",
            suggestion: "Set a time window for better control",
          });
        }
      }
    });

    // Global checks
    const smsSteps = steps.filter((s) => s.type === "sms");
    if (smsSteps.length > 0 && !steps.some((s) => s.type === "condition")) {
      result.push({
        severity: "warning",
        message: "Sequence has no conditions for response handling",
        rule: "Response Handling",
        suggestion: "Add IF/THEN conditions to handle lead responses",
      });
    }

    // No escalation path
    if (
      steps.length > 0 &&
      !steps.some((s) => s.condition?.thenAction === "escalate")
    ) {
      result.push({
        severity: "info",
        message: "No escalation to other workers configured",
        rule: "Worker Handoff",
        suggestion:
          "Consider adding escalation to CATHY or SABRINA for unresponsive leads",
      });
    }

    // Sequence too long
    if (totalDays > 14) {
      result.push({
        severity: "info",
        message: `Sequence spans ${totalDays} days`,
        rule: "Sequence Length",
        suggestion:
          "Long sequences may have diminishing returns. Consider breaking into phases.",
      });
    }

    return result;
  }, [steps]);

  const complianceScore = useMemo(() => {
    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;
    const infoCount = issues.filter((i) => i.severity === "info").length;

    // Calculate score (100 - penalties)
    const score = Math.max(
      0,
      100 - errorCount * 20 - warningCount * 10 - infoCount * 2,
    );
    return score;
  }, [issues]);

  const getScoreColor = () => {
    if (complianceScore >= 90) return "text-green-600";
    if (complianceScore >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = () => {
    if (complianceScore >= 90) return "bg-green-50 border-green-200";
    if (complianceScore >= 70) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  const getSeverityIcon = (severity: ComplianceIssue["severity"]) => {
    switch (severity) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityStyle = (severity: ComplianceIssue["severity"]) => {
    switch (severity) {
      case "error":
        return "border-red-200 bg-red-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      case "info":
        return "border-blue-200 bg-blue-50";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Compliance Check</h3>
        </div>

        {/* Score */}
        <Card className={cn("border", getScoreBg())}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Compliance Score</span>
              <span className={cn("text-2xl font-bold", getScoreColor())}>
                {complianceScore}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  complianceScore >= 90
                    ? "bg-green-500"
                    : complianceScore >= 70
                      ? "bg-yellow-500"
                      : "bg-red-500",
                )}
                style={{ width: `${complianceScore}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="px-4 py-3 border-b grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 text-red-500">
            <XCircle className="h-4 w-4" />
            <span className="font-bold text-lg">
              {issues.filter((i) => i.severity === "error").length}
            </span>
          </div>
          <span className="text-sm font-medium text-red-600">Errors</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-bold text-lg">
              {issues.filter((i) => i.severity === "warning").length}
            </span>
          </div>
          <span className="text-sm font-medium text-amber-600">Warnings</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 text-blue-500">
            <Info className="h-4 w-4" />
            <span className="font-bold text-lg">
              {issues.filter((i) => i.severity === "info").length}
            </span>
          </div>
          <span className="text-sm font-medium text-blue-600">Info</span>
        </div>
      </div>

      {/* Issues List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {issues.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="font-medium text-green-700">All checks passed!</p>
              <p className="text-sm text-muted-foreground">
                Your sequence follows compliance best practices
              </p>
            </div>
          ) : (
            issues.map((issue, idx) => (
              <Card
                key={idx}
                className={cn("border", getSeverityStyle(issue.severity))}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge
                          variant="outline"
                          className="text-xs px-2 py-0.5 font-semibold"
                        >
                          {issue.rule}
                        </Badge>
                        {issue.stepIndex && (
                          <span className="text-xs font-medium text-slate-500">
                            Step {issue.stepIndex}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {issue.message}
                      </p>
                      {issue.suggestion && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5">
                          💡 {issue.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Rules Reference */}
      <div className="p-4 border-t bg-muted/30">
        <div className="space-y-2">
          <div className="font-semibold text-sm text-foreground mb-3">
            TCPA Compliance Rules
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>
              Min {COMPLIANCE_RULES.minMessageSpacingHours}h between SMS
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>
              Max {COMPLIANCE_RULES.maxMessagesBeforeEscalation} SMS before
              escalation
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>
              Business hours: {COMPLIANCE_RULES.businessHoursStart}AM-
              {COMPLIANCE_RULES.businessHoursEnd - 12}PM
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>Auto-stop on STOP keywords</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComplianceChecker;
