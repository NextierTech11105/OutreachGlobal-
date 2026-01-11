"use client";

import { GitBranch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PipelinesPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipelines</h1>
          <p className="text-muted-foreground">
            Manage your sales stages and deal flow
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Create Pipeline
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No pipelines yet</h3>
          <p className="text-muted-foreground text-center mt-1 max-w-md">
            Pipelines help you track deals through your sales process.
            Pipeline management is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
