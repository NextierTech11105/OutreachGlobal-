"use client";

import { useState } from "react";
import {
  Bell,
  Plus,
  Play,
  Pause,
  Trash2,
  Clock,
  MessageSquare,
  Zap,
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
import { Switch } from "@/components/ui/switch";

interface NudgeRule {
  id: string;
  name: string;
  trigger: string;
  delay: string;
  action: string;
  enabled: boolean;
  nudgesSent: number;
  conversions: number;
}

export default function NudgerPage() {
  const [rules, setRules] = useState<NudgeRule[]>([
    {
      id: "1",
      name: "No Response Follow-Up",
      trigger: "No reply after initial outreach",
      delay: "48 hours",
      action: "Send follow-up SMS",
      enabled: true,
      nudgesSent: 234,
      conversions: 45,
    },
    {
      id: "2",
      name: "Appointment Reminder",
      trigger: "24 hours before scheduled call",
      delay: "24 hours before",
      action: "Send reminder SMS",
      enabled: true,
      nudgesSent: 156,
      conversions: 142,
    },
    {
      id: "3",
      name: "Cold Lead Revival",
      trigger: "No activity for 30 days",
      delay: "30 days",
      action: "Send re-engagement email",
      enabled: false,
      nudgesSent: 89,
      conversions: 12,
    },
    {
      id: "4",
      name: "Post-Call Check-In",
      trigger: "After completed call",
      delay: "2 hours",
      action: "Send thank you + next steps",
      enabled: true,
      nudgesSent: 78,
      conversions: 34,
    },
  ]);

  const toggleRule = (id: string) => {
    setRules(
      rules.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule,
      ),
    );
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nudge Engine</h1>
          <p className="text-muted-foreground">
            Automated follow-up rules to keep leads engaged
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rules.filter((r) => r.enabled).length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {rules.length} total rules
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nudges Sent</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rules.reduce((sum, r) => sum + r.nudgesSent, 0)}
            </div>
            <p className="text-xs text-muted-foreground">this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                (rules.reduce((sum, r) => sum + r.conversions, 0) /
                  rules.reduce((sum, r) => sum + r.nudgesSent, 0)) *
                  100,
              )}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              responses from nudges
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rules */}
      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card
            key={rule.id}
            className={`transition-all ${!rule.enabled ? "opacity-60" : ""}`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${rule.enabled ? "bg-green-500/20" : "bg-muted"}`}
                  >
                    <Bell
                      className={`h-5 w-5 ${rule.enabled ? "text-green-500" : "text-muted-foreground"}`}
                    />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {rule.name}
                      {rule.enabled && (
                        <Badge
                          variant="secondary"
                          className="bg-green-500/20 text-green-700"
                        >
                          Active
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{rule.trigger}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => toggleRule(rule.id)}
                  />
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Delay
                  </div>
                  <p className="font-medium">{rule.delay}</p>
                </div>
                <div>
                  <div className="text-muted-foreground">Action</div>
                  <p className="font-medium">{rule.action}</p>
                </div>
                <div>
                  <div className="text-muted-foreground">Sent</div>
                  <p className="font-medium">{rule.nudgesSent}</p>
                </div>
                <div>
                  <div className="text-muted-foreground">Conversions</div>
                  <p className="font-medium">
                    {rule.conversions} (
                    {Math.round((rule.conversions / rule.nudgesSent) * 100)}%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
