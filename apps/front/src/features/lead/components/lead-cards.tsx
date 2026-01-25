"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentTeam } from "@/features/team/team.context";
import { createDefaultCursor } from "@/graphql/graphql-utils";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { LEADS_QUERY } from "../queries/lead.queries";
import { LoadingOverlay } from "@/components/ui/loading/loading-overlay";
import { CursorPagination } from "@/components/pagination/cursor-pagination";
import { TeamLink } from "@/features/team/components/team-link";
import {
  Phone,
  Mail,
  MessageSquare,
  Building2,
  MapPin,
  Tag,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LIMIT = 24;
const defaultCursor = createDefaultCursor({ first: LIMIT });

// Auto-tag colors
const TAG_COLORS: Record<string, string> = {
  "Hot Lead": "bg-red-500",
  "Responded": "bg-green-500",
  "No Response": "bg-yellow-500",
  "Qualified": "bg-blue-500",
  "Follow Up": "bg-purple-500",
  "New": "bg-emerald-500",
};

export function LeadCards() {
  const { teamId } = useCurrentTeam();
  const { data, loading, cursor, setCursor, pageInfo } = useConnectionQuery(
    LEADS_QUERY,
    {
      variables: { teamId },
      cursor: defaultCursor,
    }
  );

  const leads = data?.leads?.edges?.map((e: any) => e.node) || [];

  return (
    <div className="relative">
      <LoadingOverlay visible={loading} />

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {leads.map((lead: any) => (
          <Card key={lead.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <TeamLink href={`/leads/${lead.id}`} className="font-medium hover:underline">
                    {lead.firstName} {lead.lastName}
                  </TeamLink>
                  {lead.company && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Building2 className="w-3 h-3" />
                      {lead.company}
                    </div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send SMS
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Phone className="w-4 h-4 mr-2" />
                      Call
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Tag className="w-4 h-4 mr-2" />
                      Add Tag
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Contact Info */}
              <div className="space-y-1 text-sm mb-3">
                {lead.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    {lead.phone}
                  </div>
                )}
                {lead.email && (
                  <div className="flex items-center gap-2 text-muted-foreground truncate">
                    <Mail className="w-3 h-3" />
                    {lead.email}
                  </div>
                )}
                {(lead.city || lead.state) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {[lead.city, lead.state].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {/* Auto-generated tags based on status */}
                {lead.status === "hot_lead" && (
                  <Badge className="bg-red-500 text-xs">Hot Lead</Badge>
                )}
                {lead.status === "responded" && (
                  <Badge className="bg-green-500 text-xs">Responded</Badge>
                )}
                {lead.status === "new" && (
                  <Badge className="bg-emerald-500 text-xs">New</Badge>
                )}
                {lead.pipelineStatus && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {lead.pipelineStatus.replace(/_/g, " ")}
                  </Badge>
                )}
                {/* Custom tags */}
                {lead.tags?.map((tag: string) => (
                  <Badge
                    key={tag}
                    className={`text-xs ${TAG_COLORS[tag] || "bg-gray-500"}`}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {!loading && leads.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No leads found. Import or create leads to get started.
        </div>
      )}

      {/* Pagination */}
      {pageInfo && (
        <div className="mt-6">
          <CursorPagination
            cursor={cursor}
            setCursor={setCursor}
            pageInfo={pageInfo}
            limit={LIMIT}
          />
        </div>
      )}
    </div>
  );
}
