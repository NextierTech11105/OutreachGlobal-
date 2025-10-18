"use client";

import { useCurrentTeam } from "@/features/team/team.context";
import { AnimatePresence } from "motion/react";
import { POWER_DIALERS_QUERY } from "../queries/power-dialer.queries";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading/loading-overlay";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamLink } from "@/features/team/components/team-link";
import { formatTime } from "@/lib/utils";
import { PowerDialerModal } from "./power-dialer-modal";

export const PowerDialerList: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const { team } = useCurrentTeam();

  const [powerDialers, pageInfo, { loading }] = useConnectionQuery(
    POWER_DIALERS_QUERY,
    {
      pick: "powerDialers",
      variables: { teamId: team.id, first: 100 },
    },
  );

  return (
    <>
      <div className="mb-4 flex justify-end items-center">
        <Button onClick={() => setModalOpen(true)}>
          Create Advance Power Dialer
        </Button>
      </div>

      <Card className="relative overflow-hidden">
        {loading && <LoadingOverlay />}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Total Duration</TableHead>
              <TableHead>Success Rate</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>

          <TableBody>
            {powerDialers?.map((powerDialer) => (
              <TableRow key={powerDialer.id}>
                <TableCell>{powerDialer.title}</TableCell>
                <TableCell>{formatTime(powerDialer.totalDuration)}</TableCell>
                <TableCell>{powerDialer.successRate.toFixed(2)}%</TableCell>
                <TableCell className="text-right">
                  <TeamLink href={`/power-dialers/${powerDialer.id}`}>
                    View
                  </TeamLink>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <AnimatePresence>
        {modalOpen && (
          <PowerDialerModal open={modalOpen} onOpenChange={setModalOpen} />
        )}
      </AnimatePresence>
    </>
  );
};
