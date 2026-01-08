"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap, MessageSquare, Phone, Mail } from "lucide-react";

export default function IntegrationsPage() {
  const integrations = [
    { name: "SignalHouse", status: "connected", icon: MessageSquare },
    { name: "Apollo.io", status: "connected", icon: Zap },
    { name: "Twilio", status: "connected", icon: Phone },
    { name: "Gmail", status: "pending", icon: Mail },
  ];

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Integrations</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((int) => (
          <Card key={int.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <int.icon className="h-8 w-8" />
                  <CardTitle>{int.name}</CardTitle>
                </div>
                <Badge className={int.status === "connected" ? "bg-green-500" : ""}>
                  {int.status === "connected" ? <><CheckCircle className="mr-1 h-3 w-3" />Connected</> : "Setup Required"}
                </Badge>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
