"use client";
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
import { PowerDialerModal } from "@/features/power-dialer/components/power-dialer-modal";
import { POWER_DIALERS_QUERY } from "@/features/power-dialer/queries/power-dialer.queries";
import { TeamLink } from "@/features/team/components/team-link";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { useCurrentTeam } from "@/features/team/team.context";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { AnimatePresence } from "motion/react";
import { useState } from "react";

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export default function Page() {
  const [modalOpen, setModalOpen] = useState(false);
  const { teamId, isTeamReady } = useCurrentTeam();

  const [powerDialers, pageInfo, { loading }] = useConnectionQuery(
    POWER_DIALERS_QUERY,
    {
      pick: "powerDialers",
      variables: { teamId, first: 50 },
      skip: !isTeamReady,
    },
  );

  if (!isTeamReady) return null;

  return (
    <TeamSection>
      <TeamHeader title="Power Dialers" />

      <div className="container">
        <div className="mb-4 flex justify-between items-center">
          <TeamTitle>Power Dialers</TeamTitle>
          <Button onClick={() => setModalOpen(true)}>
            Create Power Dialer Campaign
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
                  <TableCell>{powerDialer.successRate}%</TableCell>
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
      </div>

      <AnimatePresence>
        {modalOpen && (
          <PowerDialerModal open={modalOpen} onOpenChange={setModalOpen} />
        )}
      </AnimatePresence>
    </TeamSection>
  );
}
