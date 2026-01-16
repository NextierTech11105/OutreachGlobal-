"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SDRActivity } from "@/hooks/use-sdr-stream";

interface AgentConfig {
  id: string;
  name: string;
  role: string;
  color: string;
  bgColor: string;
}

interface AgentStatusBarProps {
  agents: AgentConfig[];
  activities: SDRActivity[];
  selectedAgent: string | null;
  onSelectAgent: (agentId: string | null) => void;
}

export function AgentStatusBar({
  agents,
  activities,
  selectedAgent,
  onSelectAgent,
}: AgentStatusBarProps) {
  // Count activities per agent
  const activityCounts = agents.reduce(
    (acc, agent) => {
      acc[agent.id] = {
        total: activities.filter((a) => a.agent === agent.id).length,
        pending: activities.filter(
          (a) => a.agent === agent.id && a.requiresApproval && a.status === "pending",
        ).length,
      };
      return acc;
    },
    {} as Record<string, { total: number; pending: number }>,
  );

  return (
    <div className="flex flex-wrap gap-2">
      {/* All agents button */}
      <button
        onClick={() => onSelectAgent(null)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
          selectedAgent === null
            ? "border-primary bg-primary/10"
            : "border-border hover:bg-muted",
        )}
      >
        <span className="font-medium">All Agents</span>
        <Badge variant="secondary">
          {activities.length}
        </Badge>
      </button>

      {/* Individual agent buttons */}
      {agents.map((agent) => {
        const counts = activityCounts[agent.id] || { total: 0, pending: 0 };
        const isSelected = selectedAgent === agent.id;

        return (
          <button
            key={agent.id}
            onClick={() => onSelectAgent(isSelected ? null : agent.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
              isSelected
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-muted",
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                counts.total > 0 ? "bg-green-500" : "bg-gray-300",
              )}
            />
            <span className={cn("font-medium", agent.color)}>{agent.name}</span>
            <span className="text-xs text-muted-foreground">{agent.role}</span>
            {counts.pending > 0 && (
              <Badge variant="destructive" className="ml-1">
                {counts.pending}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
