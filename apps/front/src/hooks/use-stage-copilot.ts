/**
 * USE STAGE COPILOT HOOK
 * ═══════════════════════════════════════════════════════════════════════════════
 * "Synergistic orchestration with high-impact predictability"
 *
 * React hook that provides stage-aware AI assistance for any lead context.
 * The copilot adapts based on WHERE the lead is in the execution loop.
 *
 * KEY PRINCIPLES:
 * - SYNERGISTIC: Workers (GIANNA, CATHY, SABRINA) collaborate, not compete
 * - ORCHESTRATION: Central AI coordinates all touchpoints
 * - REPETITION: The loop compounds - each cycle builds on the last
 * - HIGH-IMPACT PREDICTABILITY: Consistent execution = predictable results
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useMemo } from "react";
import {
  LeadStage,
  StageCopilot,
  AIWorker,
  getCopilotForStage,
  getNextStage,
  getSuggestedActions,
  getStagePromptAddition,
  getPrimaryWorkerForStage,
  getWorkerStages,
  formatStageName,
  getStageColor,
  STAGE_COPILOTS,
} from "@/lib/ai/stage-copilots";

export interface LeadContext {
  id: string;
  stage: LeadStage;
  name?: string;
  phone?: string;
  email?: string;
  lastActivity?: Date;
  responseCount?: number;
  sentiment?: "positive" | "neutral" | "negative";
  tags?: string[];
}

export interface CopilotSuggestion {
  action: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  worker: AIWorker;
  automated: boolean;
}

export interface UseStageCopilotReturn {
  // Current copilot config
  copilot: StageCopilot;
  worker: AIWorker;
  stage: LeadStage;

  // Display helpers
  stageName: string;
  stageColor: string;
  icon: string;

  // Actions
  suggestedActions: CopilotSuggestion[];
  getAIPrompt: (userMessage: string) => string;
  transitionTo: (
    action:
      | "respond"
      | "qualify"
      | "book"
      | "propose"
      | "close"
      | "lose"
      | "nurture",
  ) => LeadStage;

  // Worker info
  isGiannaStage: boolean;
  isCathyStage: boolean;
  isSabrinaStage: boolean;

  // Orchestration stats
  stageStats: {
    urgentStages: LeadStage[];
    workerLoadout: Record<AIWorker, LeadStage[]>;
    loopPosition: number; // 1-10 in the execution loop
  };
}

/**
 * Hook to get stage-aware copilot for a lead
 */
export function useStageCopilot(
  leadContext?: LeadContext,
): UseStageCopilotReturn {
  const stage = leadContext?.stage || "data_prep";

  // Get copilot configuration for this stage
  const copilot = useMemo(() => getCopilotForStage(stage), [stage]);
  const worker = useMemo(() => getPrimaryWorkerForStage(stage), [stage]);

  // Generate AI-enhanced suggestions based on context
  const suggestedActions = useMemo((): CopilotSuggestion[] => {
    const baseActions = getSuggestedActions(stage);

    return baseActions.map((action, index) => ({
      action,
      description: `${copilot.focus}: ${action}`,
      priority: index === 0 ? copilot.priority : "medium",
      worker: copilot.primaryWorker,
      automated: copilot.automationRules.some((rule) =>
        rule.toLowerCase().includes(action.toLowerCase()),
      ),
    }));
  }, [stage, copilot]);

  // Build context-aware AI prompt
  const getAIPrompt = useCallback(
    (userMessage: string): string => {
      const stagePrompt = getStagePromptAddition(stage);
      const context = leadContext
        ? `
LEAD CONTEXT:
- Name: ${leadContext.name || "Unknown"}
- Stage: ${formatStageName(stage)}
- Response count: ${leadContext.responseCount || 0}
- Sentiment: ${leadContext.sentiment || "unknown"}
- Last activity: ${leadContext.lastActivity?.toLocaleDateString() || "Never"}
`
        : "";

      return `${stagePrompt}
${context}

USER REQUEST: ${userMessage}

Provide stage-appropriate assistance. Remember:
- You are ${copilot.name}
- Focus: ${copilot.focus}
- Primary worker: ${worker}
`;
    },
    [stage, leadContext, copilot, worker],
  );

  // Calculate stage transition
  const transitionTo = useCallback(
    (
      action:
        | "respond"
        | "qualify"
        | "book"
        | "propose"
        | "close"
        | "lose"
        | "nurture",
    ): LeadStage => {
      return getNextStage(stage, action);
    },
    [stage],
  );

  // Worker stage assignments
  const isGiannaStage =
    worker === "GIANNA" || copilot.supportWorkers.includes("GIANNA");
  const isCathyStage =
    worker === "CATHY" || copilot.supportWorkers.includes("CATHY");
  const isSabrinaStage =
    worker === "SABRINA" || copilot.supportWorkers.includes("SABRINA");

  // Loop position (1-10)
  const loopPosition = useMemo(() => {
    const stageOrder: LeadStage[] = [
      "data_prep",
      "campaign_prep",
      "outbound_sms",
      "inbound_response",
      "hot_call_queue",
      "discovery",
      "strategy",
      "proposal",
      "deal",
      "won",
    ];
    const index = stageOrder.indexOf(stage);
    return index >= 0 ? index + 1 : 0;
  }, [stage]);

  // Stage stats for orchestration view
  const stageStats = useMemo(
    () => ({
      urgentStages: Object.entries(STAGE_COPILOTS)
        .filter(([, config]) => config.priority === "urgent")
        .map(([s]) => s as LeadStage),
      workerLoadout: {
        GIANNA: getWorkerStages("GIANNA"),
        CATHY: getWorkerStages("CATHY"),
        SABRINA: getWorkerStages("SABRINA"),
        COPILOT: getWorkerStages("COPILOT"),
      },
      loopPosition,
    }),
    [loopPosition],
  );

  return {
    copilot,
    worker,
    stage,
    stageName: formatStageName(stage),
    stageColor: getStageColor(stage),
    icon: copilot.icon,
    suggestedActions,
    getAIPrompt,
    transitionTo,
    isGiannaStage,
    isCathyStage,
    isSabrinaStage,
    stageStats,
  };
}

/**
 * Hook to get orchestration overview across all leads
 */
export function useOrchestrationOverview(leads: LeadContext[]) {
  return useMemo(() => {
    // Count leads per stage
    const stageCounts: Record<LeadStage, number> = {} as Record<
      LeadStage,
      number
    >;
    const workerCounts: Record<AIWorker, number> = {
      GIANNA: 0,
      CATHY: 0,
      SABRINA: 0,
      COPILOT: 0,
    };

    leads.forEach((lead) => {
      stageCounts[lead.stage] = (stageCounts[lead.stage] || 0) + 1;

      const worker = getPrimaryWorkerForStage(lead.stage);
      workerCounts[worker]++;
    });

    // Calculate loop velocity (leads moving forward per day)
    const urgentLeads = leads.filter((l) => {
      const copilot = getCopilotForStage(l.stage);
      return copilot.priority === "urgent";
    });

    // Synergy score: How well are workers collaborating?
    const synergyScore = calculateSynergyScore(leads);

    // Predictability score: How consistent is progression?
    const predictabilityScore = calculatePredictabilityScore(leads);

    return {
      totalLeads: leads.length,
      stageCounts,
      workerCounts,
      urgentLeads: urgentLeads.length,
      synergyScore,
      predictabilityScore,

      // Recommendations
      recommendations: generateOrchestrationRecommendations(
        stageCounts,
        workerCounts,
      ),
    };
  }, [leads]);
}

/**
 * Calculate synergy score (0-100)
 * Higher = better worker collaboration
 */
function calculateSynergyScore(leads: LeadContext[]): number {
  if (leads.length === 0) return 100;

  // Check for bottlenecks (too many leads stuck in one stage)
  const stageCounts: Record<string, number> = {};
  leads.forEach((l) => {
    stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1;
  });

  const maxInOneStage = Math.max(...Object.values(stageCounts));
  const bottleneckPenalty = Math.min(40, (maxInOneStage / leads.length) * 100);

  // Check for handoff efficiency (leads with recent activity)
  const recentActivity = leads.filter(
    (l) =>
      l.lastActivity &&
      Date.now() - l.lastActivity.getTime() < 7 * 24 * 60 * 60 * 1000,
  );
  const activityBonus = (recentActivity.length / leads.length) * 30;

  return Math.round(
    Math.max(0, Math.min(100, 60 - bottleneckPenalty + activityBonus)),
  );
}

/**
 * Calculate predictability score (0-100)
 * Higher = more consistent progression through loop
 */
function calculatePredictabilityScore(leads: LeadContext[]): number {
  if (leads.length === 0) return 100;

  // Ideal: leads distributed across stages, not clustered
  const stageOrder: LeadStage[] = [
    "data_prep",
    "campaign_prep",
    "outbound_sms",
    "inbound_response",
    "hot_call_queue",
    "discovery",
    "strategy",
    "proposal",
    "deal",
  ];

  const positions = leads.map((l) => {
    const idx = stageOrder.indexOf(l.stage);
    return idx >= 0 ? idx : 0;
  });

  // Calculate distribution evenness
  const avg = positions.reduce((a, b) => a + b, 0) / positions.length;
  const variance =
    positions.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) /
    positions.length;
  const stdDev = Math.sqrt(variance);

  // Higher std dev = more spread = better
  const spreadScore = Math.min(50, stdDev * 10);

  // Response rate bonus
  const hasResponses = leads.filter((l) => (l.responseCount || 0) > 0);
  const responseBonus = (hasResponses.length / leads.length) * 50;

  return Math.round(Math.max(0, Math.min(100, spreadScore + responseBonus)));
}

/**
 * Generate orchestration recommendations
 */
function generateOrchestrationRecommendations(
  stageCounts: Record<LeadStage, number>,
  workerCounts: Record<AIWorker, number>,
): string[] {
  const recommendations: string[] = [];

  // Check for stage bottlenecks
  const entries = Object.entries(stageCounts);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  entries.forEach(([stage, count]) => {
    const percentage = (count / total) * 100;
    if (percentage > 30) {
      const copilot = getCopilotForStage(stage as LeadStage);
      recommendations.push(
        `${Math.round(percentage)}% of leads stuck in ${copilot.name}. Review ${copilot.suggestedActions[0]}.`,
      );
    }
  });

  // Check worker balance
  if (workerCounts.GIANNA > workerCounts.SABRINA * 3) {
    recommendations.push(
      "GIANNA is overloaded vs SABRINA. More leads need to qualify for calls.",
    );
  }

  if (workerCounts.CATHY > total * 0.4) {
    recommendations.push(
      "40%+ leads in nurture (CATHY). Consider re-engagement campaigns.",
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Loop is flowing well. Maintain current pace.");
  }

  return recommendations;
}

export default useStageCopilot;
