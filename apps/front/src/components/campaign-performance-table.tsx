"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, UserCog } from "lucide-react";

interface CampaignPerformanceTableProps {
  detailed?: boolean;
}

export function CampaignPerformanceTable({
  detailed = false,
}: CampaignPerformanceTableProps) {
  const campaigns = [
    {
      name: "High Equity AI",
      type: "ai",
      leads: 124,
      engagement: 42,
      conversion: 18,
      revenue: "$22,500",
      cost: "$620",
      roi: "3,529%",
      status: "active",
    },
    {
      name: "Pre-Foreclosure AI",
      type: "ai",
      leads: 86,
      engagement: 38,
      conversion: 15,
      revenue: "$12,000",
      cost: "$430",
      roi: "2,691%",
      status: "active",
    },
    {
      name: "Senior Owner AI",
      type: "ai",
      leads: 38,
      engagement: 45,
      conversion: 22,
      revenue: "$8,000",
      cost: "$190",
      roi: "4,111%",
      status: "active",
    },
    {
      name: "High Value SDR",
      type: "sdr",
      leads: 112,
      engagement: 52,
      conversion: 28,
      revenue: "$35,000",
      cost: "$2,240",
      roi: "1,463%",
      status: "active",
    },
    {
      name: "Distressed SDR",
      type: "sdr",
      leads: 83,
      engagement: 48,
      conversion: 24,
      revenue: "$18,000",
      cost: "$1,660",
      roi: "984%",
      status: "active",
    },
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Campaign</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Leads</TableHead>
          <TableHead>Engagement</TableHead>
          <TableHead>Conversion</TableHead>
          {detailed && (
            <>
              <TableHead>Revenue</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>ROI</TableHead>
            </>
          )}
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((campaign, i) => (
          <TableRow key={i}>
            <TableCell className="font-medium">{campaign.name}</TableCell>
            <TableCell>
              <div className="flex items-center">
                {campaign.type === "ai" ? (
                  <Bot className="mr-2 h-4 w-4 text-primary" />
                ) : campaign.type === "sdr" ? (
                  <UserCog className="mr-2 h-4 w-4 text-amber-500" />
                ) : (
                  <Send className="mr-2 h-4 w-4 text-muted-foreground" />
                )}
                <span>
                  {campaign.type === "ai"
                    ? "AI SDR"
                    : campaign.type === "sdr"
                      ? "Human SDR"
                      : "Nurture"}
                </span>
              </div>
            </TableCell>
            <TableCell>{campaign.leads}</TableCell>
            <TableCell>{campaign.engagement}%</TableCell>
            <TableCell>{campaign.conversion}%</TableCell>
            {detailed && (
              <>
                <TableCell>{campaign.revenue}</TableCell>
                <TableCell>{campaign.cost}</TableCell>
                <TableCell>{campaign.roi}</TableCell>
              </>
            )}
            <TableCell>
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
              >
                Active
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
