"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  Zap,
  MessageSquare,
  Phone,
  Mail,
  Building2,
  Database,
  Settings,
  ExternalLink,
} from "lucide-react";

interface IntegrationStatus {
  name: string;
  key: string;
  icon: React.ElementType;
  description: string;
  docsUrl?: string;
  configured: boolean;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkIntegrations() {
      try {
        const res = await fetch("/api/integrations/status");
        if (res.ok) {
          const data = await res.json();
          setIntegrations([
            {
              name: "SignalHouse",
              key: "signalhouse",
              icon: MessageSquare,
              description: "SMS/MMS messaging platform for 10DLC campaigns",
              docsUrl: "https://signalhouse.io/docs",
              configured: data.signalhouse || false,
            },
            {
              name: "Apollo.io",
              key: "apollo",
              icon: Zap,
              description: "B2B contact enrichment and decision maker search",
              docsUrl: "https://apolloio.github.io/apollo-api-docs/",
              configured: data.apollo || false,
            },
            {
              name: "Twilio",
              key: "twilio",
              icon: Phone,
              description: "Voice calls, phone lookup, and line type detection",
              docsUrl: "https://www.twilio.com/docs",
              configured: data.twilio || false,
            },
            {
              name: "Real Estate API",
              key: "realestate",
              icon: Building2,
              description: "Property data, skip tracing, and owner lookup",
              docsUrl: "https://www.realestateapi.com/docs",
              configured: data.realestate || false,
            },
            {
              name: "USBizData",
              key: "usbizdata",
              icon: Database,
              description: "B2B business listings with 60M+ companies",
              configured: data.usbizdata || false,
            },
            {
              name: "Gmail",
              key: "gmail",
              icon: Mail,
              description: "Email sending via Gmail SMTP",
              configured: data.gmail || false,
            },
          ]);
        }
      } catch (error) {
        console.error("Failed to check integrations:", error);
        // Set defaults
        setIntegrations([
          {
            name: "SignalHouse",
            key: "signalhouse",
            icon: MessageSquare,
            description: "SMS/MMS messaging platform for 10DLC campaigns",
            configured: false,
          },
          {
            name: "Apollo.io",
            key: "apollo",
            icon: Zap,
            description: "B2B contact enrichment and decision maker search",
            configured: false,
          },
          {
            name: "Twilio",
            key: "twilio",
            icon: Phone,
            description: "Voice calls, phone lookup, and line type detection",
            configured: false,
          },
          {
            name: "Real Estate API",
            key: "realestate",
            icon: Building2,
            description: "Property data, skip tracing, and owner lookup",
            configured: false,
          },
          {
            name: "USBizData",
            key: "usbizdata",
            icon: Database,
            description: "B2B business listings with 60M+ companies",
            configured: false,
          },
          {
            name: "Gmail",
            key: "gmail",
            icon: Mail,
            description: "Email sending via Gmail SMTP",
            configured: false,
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    checkIntegrations();
  }, []);

  const connectedCount = integrations.filter((i) => i.configured).length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">
            {connectedCount} of {integrations.length} services connected
          </p>
        </div>
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Manage API Keys
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-8 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <Card
              key={integration.key}
              className={`transition-all ${integration.configured ? "border-green-500/30" : "border-muted"}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${integration.configured ? "bg-green-500/10" : "bg-muted"}`}
                    >
                      <integration.icon
                        className={`h-6 w-6 ${integration.configured ? "text-green-500" : "text-muted-foreground"}`}
                      />
                    </div>
                    <CardTitle className="text-lg">
                      {integration.name}
                    </CardTitle>
                  </div>
                  <Badge
                    variant={integration.configured ? "default" : "secondary"}
                    className={integration.configured ? "bg-green-500" : ""}
                  >
                    {integration.configured ? (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Connected
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-3 w-3" />
                        Not Configured
                      </>
                    )}
                  </Badge>
                </div>
                <CardDescription className="mt-2">
                  {integration.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {integration.docsUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(integration.docsUrl, "_blank")}
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Docs
                    </Button>
                  )}
                  <Button
                    variant={integration.configured ? "outline" : "default"}
                    size="sm"
                  >
                    {integration.configured ? "Configure" : "Connect"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
