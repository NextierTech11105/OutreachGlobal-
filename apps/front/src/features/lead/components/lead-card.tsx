"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamLink } from "@/features/team/components/team-link";
import { formatDistanceToNow } from "date-fns";
import { LeadContactPills } from "@/components/lead-quick-actions";

interface LeadCardProps {
  lead: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    status?: string | null;
    tags?: string[] | null;
    createdAt: string;
    property?: {
      address?: string | null;
    } | null;
  };
}

export function LeadCard({ lead }: LeadCardProps) {
  return (
    <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
      <CardContent className="p-3">
        <div className="space-y-2">
          <TeamLink href={`/leads/${lead.id}`} className="block">
            <div className="font-medium truncate">{lead.name || "Unknown"}</div>
            {lead.property?.address && (
              <div className="text-xs text-muted-foreground truncate">
                {lead.property.address}
              </div>
            )}
          </TeamLink>

          {/* Click-to-Call/SMS/Email Actions */}
          <LeadContactPills
            phone={lead.phone}
            email={lead.email}
            leadName={lead.name}
            leadId={lead.id}
          />

          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {lead.status || "New"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(lead.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
