"use client";

import { useState } from "react";
import {
  Send,
  Target,
  Plus,
  Play,
  Pause,
  Filter,
  Users,
  MessageSquare,
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

interface OutreachCampaign {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  type: "cold" | "warm" | "re-engagement";
  leadCount: number;
  sent: number;
  responded: number;
  scheduled: string;
}

export default function InitialOutreachPage() {
  const [campaigns] = useState<OutreachCampaign[]>([
    {
      id: "1",
      name: "Q1 Business Owner Outreach",
      status: "active",
      type: "cold",
      leadCount: 500,
      sent: 320,
      responded: 45,
      scheduled: "Daily at 9 AM",
    },
    {
      id: "2",
      name: "Trade Show Follow-Up",
      status: "active",
      type: "warm",
      leadCount: 150,
      sent: 150,
      responded: 38,
      scheduled: "Completed",
    },
    {
      id: "3",
      name: "Inactive Lead Revival",
      status: "paused",
      type: "re-engagement",
      leadCount: 1200,
      sent: 400,
      responded: 22,
      scheduled: "Paused",
    },
  ]);

  const getStatusColor = (status: OutreachCampaign["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "draft":
        return "bg-gray-500";
      case "paused":
        return "bg-yellow-500";
      case "completed":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTypeColor = (type: OutreachCampaign["type"]) => {
    switch (type) {
      case "cold":
        return "outline";
      case "warm":
        return "secondary";
      case "re-engagement":
        return "default";
      default:
        return "outline";
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Initial Outreach
          </h1>
          <p className="text-muted-foreground">
            First-touch campaigns to new leads
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Campaigns
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter((c) => c.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns
                .reduce((sum, c) => sum + c.leadCount, 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.reduce((sum, c) => sum + c.sent, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responses</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.reduce((sum, c) => sum + c.responded, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns */}
      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {campaign.name}
                      <Badge
                        className={
                          getStatusColor(campaign.status) + " text-white"
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant={getTypeColor(campaign.type) as any}>
                        {campaign.type}
                      </Badge>
                      <span>{campaign.scheduled}</span>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  {campaign.status === "active" ? (
                    <Button variant="outline" size="sm">
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </Button>
                  ) : campaign.status === "paused" ? (
                    <Button variant="outline" size="sm">
                      <Play className="mr-2 h-4 w-4" />
                      Resume
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span>
                    {campaign.sent} / {campaign.leadCount} sent
                  </span>
                </div>
                <Progress value={(campaign.sent / campaign.leadCount) * 100} />
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Leads</span>
                    <p className="font-medium">{campaign.leadCount}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sent</span>
                    <p className="font-medium">{campaign.sent}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Responses</span>
                    <p className="font-medium">
                      {campaign.responded} (
                      {Math.round((campaign.responded / campaign.sent) * 100)}%)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
