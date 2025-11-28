"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Calendar } from "lucide-react";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { CALL_HISTORIES_QUERY } from "../queries/call-history.queries";
import { useCurrentTeam } from "@/features/team/team.context";
import { DialerMode } from "@nextier/common";
import { format } from "date-fns";
import { createDefaultCursor } from "@/graphql/graphql-utils";
import { useState } from "react";
import { CursorPagination } from "@/components/pagination/cursor-pagination";

const LIMIT = 10;
const defaultCursor = createDefaultCursor({
  first: LIMIT,
});

export function CallHistoryList() {
  const { team } = useCurrentTeam();
  const [cursor, setCursor] = useState(defaultCursor);
  const [histories = [], pageInfo] = useConnectionQuery(CALL_HISTORIES_QUERY, {
    pick: "callHistories",
    variables: {
      ...cursor,
      teamId: team.id,
    },
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="relative overflow-hidden">
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
                        <Badge key={tag} variant="outline" className="text-xs">
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
                      <p className="text-sm">{format(call.createdAt, "PPp")}</p>
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
      {!!pageInfo && (
        <CursorPagination
          data={pageInfo}
          onPageChange={setCursor}
          limit={LIMIT}
          variant="table-footer"
          className="border-t"
        />
      )}
    </Card>
  );
}
