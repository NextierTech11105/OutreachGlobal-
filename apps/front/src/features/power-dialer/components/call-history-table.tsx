"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Eye, Phone, Clock, Calendar } from "lucide-react";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { usePowerDialerContext } from "../power-dialer.context";
import { CALL_HISTORIES_QUERY } from "../queries/call-history.queries";
import { useCurrentTeam } from "@/features/team/team.context";
import { DialerMode } from "@nextier/common";
import { format } from "date-fns";

export function CallHistoryTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dispositionFilter, setDispositionFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [{ powerDialer }] = usePowerDialerContext();
  const { team } = useCurrentTeam();
  const [histories = [], pageInfo] = useConnectionQuery(CALL_HISTORIES_QUERY, {
    pick: "callHistories",
    variables: {
      teamId: team.id,
      powerDialerId: powerDialer.id,
    },
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const uniqueDispositions = [
    ...new Set(histories.map((call) => call.disposition || "interested")),
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Call History ({histories.length} calls)
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats - moved to top */}
        {histories.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold">{pageInfo?.total || 0}</p>
              <p className="text-sm text-muted-foreground">Total Calls</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {formatTime(powerDialer.totalDuration)}
              </p>
              <p className="text-sm text-muted-foreground">Total Duration</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {powerDialer.successRate.toFixed(2)}%
              </p>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search calls..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={dispositionFilter}
            onValueChange={setDispositionFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by disposition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dispositions</SelectItem>
              {uniqueDispositions.map((disposition) => (
                <SelectItem key={disposition} value={disposition}>
                  {disposition}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Disposition</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Date</TableHead>
                {/* <TableHead>Actions</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {histories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No calls found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                histories.map((call) => (
                  <TableRow key={call.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{call.contact.lead.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {call.contact.lead.phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {call.contact.lead.company || "-"}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {call.contact.lead.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {call.contact.lead.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{call.contact.lead.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono">
                          {formatTime(call.duration)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="capitalize">
                        {call.disposition || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <Badge
                          variant={
                            call.dialerMode === DialerMode.AI_SDR
                              ? "default"
                              : "secondary"
                          }
                        >
                          {call.dialerMode === DialerMode.AI_SDR
                            ? "AI SDR"
                            : "Manual"}
                        </Badge>
                        {/* {call.dialerMode === DialerMode.AI_SDR && (
                          <p className="text-xs text-muted-foreground mt-1">
                            TODO
                          </p>
                        )}
                        {call.dialerMode === DialerMode.MANUAL && (
                          <p className="text-xs text-muted-foreground mt-1">
                            TODO
                          </p>
                        )} */}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm">
                            {format(call.createdAt, "PPp")}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    {/* <TableCell>
                      <Button
                        // onClick={() => setSelectedCall(call)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Review
                      </Button>
                    </TableCell> */}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Call Review Modal */}
        {/* {selectedCall && (
          <CallReviewModal
            isOpen={!!selectedCall}
            onClose={() => setSelectedCall(null)}
            callData={selectedCall}
          />
        )} */}
      </CardContent>
    </Card>
  );
}
