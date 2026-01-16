"use client";

import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Zap,
  Search,
  Calendar,
  Bot,
} from "lucide-react";
import type { SDRActivity } from "@/hooks/use-sdr-stream";

interface AgentActivityFeedProps {
  activities: SDRActivity[];
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  suggestion: MessageSquare,
  approval: CheckCircle2,
  rejection: XCircle,
  auto_send: Zap,
  enrichment: Search,
  booking: Calendar,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-500",
  approved: "text-green-500",
  rejected: "text-red-500",
  auto_sent: "text-blue-500",
  expired: "text-gray-500",
};

const AGENT_COLORS: Record<string, string> = {
  GIANNA: "text-purple-600",
  CATHY: "text-amber-600",
  SABRINA: "text-pink-600",
  LUCI: "text-blue-600",
  COPILOT: "text-green-600",
};

export function AgentActivityFeed({ activities }: AgentActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Bot className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No recent activity</p>
        <p className="text-xs text-muted-foreground">
          Agent actions will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto">
      {activities.map((activity) => {
        const Icon = ACTION_ICONS[activity.action] || Bot;
        const statusColor = STATUS_COLORS[activity.status] || "text-gray-500";
        const agentColor = AGENT_COLORS[activity.agent] || "text-gray-600";

        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className={cn("mt-0.5", statusColor)}>
              <Icon className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn("font-medium text-sm", agentColor)}>
                  {activity.agent}
                </span>
                <Badge variant="outline" className="text-xs">
                  {activity.action}
                </Badge>
              </div>

              {/* Show suggestion preview if available */}
              {activity.payload &&
                typeof activity.payload === "object" &&
                "suggestion" in activity.payload && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {String(activity.payload.suggestion)}
                  </p>
                )}

              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    activity.status === "pending"
                      ? "secondary"
                      : activity.status === "approved"
                        ? "default"
                        : "destructive"
                  }
                  className="text-xs"
                >
                  {activity.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
