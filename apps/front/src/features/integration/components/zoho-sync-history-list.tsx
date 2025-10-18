"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentTeam } from "@/features/team/team.context";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { RefreshCwIcon } from "lucide-react";
import { INTEGRATION_TASKS_QUERY } from "../queries/integration-task.queries";
import { formatDate } from "date-fns";
import { useState } from "react";
import { IntegrationSyncModal } from "./integration-sync-modal";
import { AnimatePresence } from "motion/react";

interface Props {
  integrationId: string;
}

export const ZohoSyncHistoryList = ({ integrationId }: Props) => {
  const { team } = useCurrentTeam();
  const [tasks, pageInfo, { loading }] = useConnectionQuery(
    INTEGRATION_TASKS_QUERY,
    {
      pick: "integrationTasks",
      variables: {
        teamId: team.id,
        integrationId,
      },
    },
  );

  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="rounded-md border">
      <div className="px-4 py-3 font-medium border-b flex justify-between items-center">
        <span>Recent Sync Operations</span>

        <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
          <RefreshCwIcon className="size-4" />
          Sync Module
        </Button>

        <AnimatePresence>
          {modalOpen && (
            <IntegrationSyncModal
              open={modalOpen}
              onOpenChange={setModalOpen}
              integrationId={integrationId}
            />
          )}
        </AnimatePresence>
      </div>
      <div className="divide-y">
        {!loading && !tasks?.length && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No Sync History
          </div>
        )}
        {tasks?.map((task) => (
          <div className="p-4 flex justify-between items-center" key={task.id}>
            <div>
              <div className="font-medium">{task.moduleName}</div>
              <div className="text-sm text-muted-foreground">
                {formatDate(task.createdAt, "PPp")}
              </div>
            </div>
            <Badge
              variant={
                task.status === "FAILED"
                  ? "destructive"
                  : task.status === "COMPLETED"
                    ? "secondary"
                    : "default"
              }
            >
              {task.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};
