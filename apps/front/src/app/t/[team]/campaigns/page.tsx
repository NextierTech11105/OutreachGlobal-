"use client";

import { useState, useEffect } from "react";
import { CampaignDirector } from "@/features/campaign/components/campaign-director";
import { OutreachCalendar, OutreachEvent } from "@/components/outreach-calendar";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, List, Loader2 } from "lucide-react";
import { TeamLink } from "@/features/team/components/team-link";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { TeamDescription } from "@/features/team/layouts/team-description";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

type ViewMode = "calendar" | "list";

export default function CampaignsPage() {
  const params = useParams();
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch scheduled outreach events for calendar
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const teamId = params.team as string;

        // Fetch scheduled tasks from the database
        const response = await fetch(`/api/outreach/scheduled?teamId=${teamId}`);

        if (response.ok) {
          const data = await response.json();
          setEvents(data.events || []);
        } else {
          // If API doesn't exist yet, use empty array
          setEvents([]);
        }
      } catch (error) {
        console.error("Failed to fetch scheduled events:", error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [params.team]);

  const handleEventClick = (event: OutreachEvent) => {
    console.log("Event clicked:", event);
    // TODO: Open event detail/edit modal
  };

  const handleDateClick = (date: Date) => {
    console.log("Date clicked:", date);
    // TODO: Open create outreach dialog for this date
  };

  return (
    <TeamSection>
      <TeamHeader title="Campaigns" />

      <div className="container">
        <div className="flex items-center justify-between mb-4">
          <div>
            <TeamTitle>Campaign Management</TeamTitle>
            <TeamDescription>
              Create, manage, and monitor your outreach campaigns
            </TeamDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border p-1">
              <Button
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
                className={cn(
                  "gap-1.5",
                  viewMode === "calendar" && "bg-primary"
                )}
              >
                <Calendar className="h-4 w-4" />
                Calendar
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={cn("gap-1.5", viewMode === "list" && "bg-primary")}
              >
                <List className="h-4 w-4" />
                List
              </Button>
            </div>

            <Button asChild>
              <TeamLink href="/campaigns/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </TeamLink>
            </Button>
          </div>
        </div>

        {/* Calendar View (Default) */}
        {viewMode === "calendar" && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-[600px] rounded-lg border bg-muted/20">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Loading calendar...
                  </span>
                </div>
              </div>
            ) : (
              <OutreachCalendar
                events={events}
                onEventClick={handleEventClick}
                onDateClick={handleDateClick}
                className="min-h-[600px]"
              />
            )}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && <CampaignDirector />}
      </div>
    </TeamSection>
  );
}
