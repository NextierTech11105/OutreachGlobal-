"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox } from "lucide-react";

export default function InboundProcessingPage() {
  const params = useParams();
  const teamId = (params?.team as string) || "default";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Inbound Processing</h1>
        <p className="text-muted-foreground">
          AI-classified inbound responses and lead management
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Inbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Inbound message processing will appear here. Configure your
            SignalHouse integration to receive messages.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
