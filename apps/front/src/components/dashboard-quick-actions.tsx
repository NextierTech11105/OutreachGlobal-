"use client";

import {
  Send,
  Phone,
  Calendar,
  MessageSquare,
  PhoneOutgoing,
  ExternalLink,
  Zap,
  Users,
  ArrowRight,
  Upload,
  UserPlus,
  Building2,
  Search,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGlobalActions } from "@/lib/providers/global-actions-provider";
import { TeamLink } from "@/features/team/components/team-link";
import { gql, useQuery } from "@apollo/client";
import { useCurrentTeam } from "@/features/team/team.context";

// Query to check if we have leads (just check if edges exist, totalCount not in schema)
const LEAD_COUNT_QUERY = gql`
  query LeadCount($teamId: ID!) {
    leads(teamId: $teamId, first: 1) {
      edges {
        cursor
      }
    }
  }
`;

export function DashboardQuickActions() {
  const { team } = useCurrentTeam();
  const {
    openSMSDialog,
    openScheduleCallDialog,
    openCalendar,
    smsCampaignQueue,
    scheduledCalls,
    calendarEvents,
  } = useGlobalActions();

  // Check if we have leads
  const { data: leadData } = useQuery(LEAD_COUNT_QUERY, {
    variables: { teamId: team.id },
    fetchPolicy: "cache-first",
  });

  const hasLeads = (leadData?.leads?.edges?.length || 0) > 0;
  const pendingSMS = smsCampaignQueue.filter((s) => s.status === "queued").length;
  const pendingCalls = scheduledCalls.filter((c) => c.status === "pending").length;
  const todayEvents = calendarEvents.filter((e) => {
    const today = new Date();
    const eventDate = new Date(e.startTime);
    return (
      eventDate.getFullYear() === today.getFullYear() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getDate() === today.getDate()
    );
  }).length;

  // Show different actions based on whether we have leads
  if (!hasLeads) {
    return (
      <div className="space-y-4">
        {/* Get Started Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Get Started
          </h3>
          <p className="text-sm text-muted-foreground">
            Import leads to unlock all features
          </p>
        </div>

        {/* Getting Started Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Import Leads */}
          <TeamLink href="/leads/import-companies">
            <Card className="cursor-pointer hover:border-blue-500/50 hover:shadow-md transition-all group h-full">
              <CardContent className="pt-6">
                <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors w-fit">
                  <Upload className="h-6 w-6 text-blue-500" />
                </div>
                <h4 className="mt-4 font-semibold">Import Leads</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload CSV or import from Apollo
                </p>
              </CardContent>
            </Card>
          </TeamLink>

          {/* Search Properties */}
          <TeamLink href="/properties">
            <Card className="cursor-pointer hover:border-green-500/50 hover:shadow-md transition-all group h-full">
              <CardContent className="pt-6">
                <div className="p-3 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors w-fit">
                  <Building2 className="h-6 w-6 text-green-500" />
                </div>
                <h4 className="mt-4 font-semibold">Search Properties</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Find property owners to contact
                </p>
              </CardContent>
            </Card>
          </TeamLink>

          {/* Skip Trace */}
          <TeamLink href="/valuation">
            <Card className="cursor-pointer hover:border-purple-500/50 hover:shadow-md transition-all group h-full">
              <CardContent className="pt-6">
                <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors w-fit">
                  <Search className="h-6 w-6 text-purple-500" />
                </div>
                <h4 className="mt-4 font-semibold">Property Valuation</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Get property data and owner info
                </p>
              </CardContent>
            </Card>
          </TeamLink>

          {/* Add Lead Manually */}
          <TeamLink href="/leads">
            <Card className="cursor-pointer hover:border-orange-500/50 hover:shadow-md transition-all group h-full">
              <CardContent className="pt-6">
                <div className="p-3 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors w-fit">
                  <UserPlus className="h-6 w-6 text-orange-500" />
                </div>
                <h4 className="mt-4 font-semibold">Add Lead</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Manually create a new lead
                </p>
              </CardContent>
            </Card>
          </TeamLink>
        </div>

        {/* Quick Navigation */}
        <div className="flex flex-wrap gap-2 pt-2">
          <TeamLink href="/leads/import-companies">
            <Button variant="default" size="sm" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Import CSV
              <ArrowRight className="h-3 w-3" />
            </Button>
          </TeamLink>
          <TeamLink href="/properties">
            <Button variant="outline" size="sm" className="gap-2">
              <Building2 className="h-4 w-4" />
              Properties
              <ArrowRight className="h-3 w-3" />
            </Button>
          </TeamLink>
          <TeamLink href="/campaigns">
            <Button variant="outline" size="sm" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Campaigns
              <ArrowRight className="h-3 w-3" />
            </Button>
          </TeamLink>
        </div>
      </div>
    );
  }

  // Has leads - show campaign actions
  return (
    <div className="space-y-4">
      {/* Quick Actions Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Quick Actions
        </h3>
        <p className="text-sm text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+K</kbd> for command palette
        </p>
      </div>

      {/* Main Action Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Push to SMS Campaign */}
        <Card
          className="cursor-pointer hover:border-blue-500/50 hover:shadow-md transition-all group"
          onClick={() => openSMSDialog()}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                <Send className="h-6 w-6 text-blue-500" />
              </div>
              {pendingSMS > 0 && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                  {pendingSMS} queued
                </Badge>
              )}
            </div>
            <h4 className="mt-4 font-semibold">Push to SMS Campaign</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Add leads to initial message queue
            </p>
          </CardContent>
        </Card>

        {/* Schedule Call */}
        <Card
          className="cursor-pointer hover:border-green-500/50 hover:shadow-md transition-all group"
          onClick={() => openScheduleCallDialog()}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                <PhoneOutgoing className="h-6 w-6 text-green-500" />
              </div>
              {pendingCalls > 0 && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                  {pendingCalls} scheduled
                </Badge>
              )}
            </div>
            <h4 className="mt-4 font-semibold">Push to Phone Center</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Schedule calls for power dialer
            </p>
          </CardContent>
        </Card>

        {/* Open Calendar */}
        <Card
          className="cursor-pointer hover:border-purple-500/50 hover:shadow-md transition-all group"
          onClick={() => openCalendar()}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                <Calendar className="h-6 w-6 text-purple-500" />
              </div>
              {todayEvents > 0 && (
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">
                  {todayEvents} today
                </Badge>
              )}
            </div>
            <h4 className="mt-4 font-semibold">Open Calendar</h4>
            <p className="text-sm text-muted-foreground mt-1">
              View schedule & Google Calendar
            </p>
          </CardContent>
        </Card>

        {/* Google Calendar Link */}
        <Card
          className="cursor-pointer hover:border-red-500/50 hover:shadow-md transition-all group"
          onClick={() => window.open("https://calendar.google.com", "_blank")}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
                <Calendar className="h-6 w-6 text-red-500" />
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>
            <h4 className="mt-4 font-semibold">Google Calendar</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Open Google Calendar directly
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <div className="flex flex-wrap gap-2 pt-2">
        <TeamLink href="/leads">
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="h-4 w-4" />
            Leads
            <ArrowRight className="h-3 w-3" />
          </Button>
        </TeamLink>
        <TeamLink href="/sms-queue">
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS Queue
            {pendingSMS > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {pendingSMS}
              </Badge>
            )}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </TeamLink>
        <TeamLink href="/call-center">
          <Button variant="outline" size="sm" className="gap-2">
            <Phone className="h-4 w-4" />
            Call Center
            <ArrowRight className="h-3 w-3" />
          </Button>
        </TeamLink>
        <TeamLink href="/calendar">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
            <ArrowRight className="h-3 w-3" />
          </Button>
        </TeamLink>
      </div>
    </div>
  );
}
