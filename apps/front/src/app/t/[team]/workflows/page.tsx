"use client";

import { Workflow, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function WorkflowsPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground">
            Automated multi-step sequences
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Workflow className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No workflows yet</h3>
          <p className="text-muted-foreground text-center mt-1 max-w-md">
            Workflows automate your outreach sequences with triggers and
            conditions. Workflow automation is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
