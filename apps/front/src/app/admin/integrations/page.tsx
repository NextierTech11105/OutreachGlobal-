"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  Globe,
  MessageSquare,
  Phone,
  Mail,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface IntegrationStatus {
  configured: boolean;
  loading: boolean;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: typeof Globe;
  path: string;
  checkEndpoint: string;
}

const integrations: Integration[] = [
  {
    id: "apollo",
    name: "Apollo.io",
    description: "Lead enrichment and prospecting",
    icon: Globe,
    path: "/admin/integrations/apollo",
    checkEndpoint: "/api/apollo/test",
  },
  {
    id: "signalhouse",
    name: "SignalHouse",
    description: "SMS messaging and phone verification",
    icon: MessageSquare,
    path: "/admin/integrations/signalhouse",
    checkEndpoint: "/api/signalhouse",
  },
  {
    id: "twilio",
    name: "Twilio",
    description: "Voice calls and phone number management",
    icon: Phone,
    path: "/admin/integrations/twilio",
    checkEndpoint: "/api/twilio/test",
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    description: "Email sending and tracking",
    icon: Mail,
    path: "/admin/integrations/sendgrid",
    checkEndpoint: "/api/sendgrid/test",
  },
];

export default function IntegrationsPage() {
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({});

  useEffect(() => {
    const checkIntegrations = async () => {
      const newStatuses: Record<string, IntegrationStatus> = {};

      // Initialize all as loading
      integrations.forEach((int) => {
        newStatuses[int.id] = { configured: false, loading: true };
      });
      setStatuses(newStatuses);

      // Check each integration
      await Promise.all(
        integrations.map(async (int) => {
          try {
            const res = await fetch(int.checkEndpoint);
            const data = await res.json();
            setStatuses((prev) => ({
              ...prev,
              [int.id]: { configured: data.configured === true, loading: false },
            }));
          } catch {
            setStatuses((prev) => ({
              ...prev,
              [int.id]: { configured: false, loading: false },
            }));
          }
        })
      );
    };

    checkIntegrations();
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Configure your API keys and integration settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => {
          const status = statuses[integration.id];
          const Icon = integration.icon;

          return (
            <Card key={integration.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                  </div>
                  {status?.loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : status?.configured ? (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Not configured
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Link href={integration.path}>
                  <Button variant="outline" className="w-full">
                    Configure
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
