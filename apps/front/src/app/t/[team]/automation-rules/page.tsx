"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, CheckCircle, Zap } from "lucide-react";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { TeamDescription } from "@/features/team/layouts/team-description";
import { WorkflowModal } from "@/features/workflow/components/workflow-modal";
import { AnimatePresence } from "motion/react";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { WORKFLOWS_QUERY } from "@/features/workflow/queries/workflow.queries";
import { useCurrentTeam } from "@/features/team/team.context";

export default function Page() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { teamId, isTeamReady } = useCurrentTeam();
  const [tab, setTab] = useState("active");
  const [workflows, pageInfo, { loading }] = useConnectionQuery(
    WORKFLOWS_QUERY,
    {
      pick: "workflows",
      variables: {
        teamId,
        active: tab === "active",
      },
      skip: !isTeamReady,
    },
  );

  if (!isTeamReady) return null;

  const toggleRuleStatus = (id: string) => {
    //
  };

  return (
    <TeamSection>
      <TeamHeader title="Automation Rules" />

      <div className="container space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <TeamTitle>Automation Rules</TeamTitle>
            <TeamDescription>
              Configure automated rules and triggers for your outreach campaigns
            </TeamDescription>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Automation Rule
          </Button>
        </div>

        <Card className="relative">
          <CardContent>
            <Tabs
              defaultValue={tab}
              onValueChange={setTab}
              className="space-y-4"
            >
              <TabsList>
                <TabsTrigger value="active">Active Rules</TabsTrigger>
                <TabsTrigger value="inactive">Inactive Rules</TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Trigger Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Run</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!loading && !workflows?.length && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No workflows found.
                        </TableCell>
                      </TableRow>
                    )}
                    {workflows?.map((workflow) => (
                      <TableRow key={workflow.id}>
                        <TableCell className="font-medium">
                          {workflow.name}
                        </TableCell>
                        <TableCell>{workflow.trigger.label}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-green-500/10 text-green-500 border-green-500/20"
                          >
                            <CheckCircle className="mr-1 h-3 w-3" /> Active
                          </Badge>
                        </TableCell>
                        <TableCell>Never</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="inactive">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Trigger Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!loading && !workflows?.length && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No workflows found.
                        </TableCell>
                      </TableRow>
                    )}
                    {workflows?.map((workflow) => (
                      <TableRow key={workflow.id}>
                        <TableCell className="font-medium">
                          {workflow.name}
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                          >
                            <Clock className="mr-1 h-3 w-3" /> Inactive
                          </Badge>
                        </TableCell>
                        <TableCell>Never</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <AnimatePresence>
          {isModalOpen && (
            <WorkflowModal open={isModalOpen} onOpenChange={setIsModalOpen} />
          )}
        </AnimatePresence>
      </div>
    </TeamSection>
  );
}
