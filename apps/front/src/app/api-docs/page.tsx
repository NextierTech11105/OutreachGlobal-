"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Lock,
  Zap,
  Database,
  MessageSquare,
  CreditCard,
  Users,
  Search,
} from "lucide-react";

// API endpoint documentation
const apiEndpoints = {
  billing: {
    icon: CreditCard,
    description: "Manage subscriptions, payments, and usage",
    endpoints: [
      {
        method: "GET",
        path: "/api/billing/my-subscription",
        description:
          "Get current user's subscription, usage, invoices, and payment method",
        auth: "Required",
        response: `{
  "subscription": {
    "id": "uuid",
    "status": "active" | "trialing" | "past_due" | "cancelled",
    "planName": "Pro",
    "planSlug": "pro",
    "priceMonthly": 597,
    "billingCycle": "monthly",
    "currentPeriodEnd": "2025-02-15T00:00:00Z",
    "trialEndsAt": "2025-01-29T00:00:00Z",
    "cancelAtPeriodEnd": false
  },
  "usage": {
    "leads": { "used": 2145, "limit": 5000 },
    "sms": { "used": 1250, "limit": 2500 },
    "skipTraces": { "used": 89, "limit": 250 }
  },
  "invoices": [...],
  "paymentMethod": { "brand": "visa", "last4": "4242" }
}`,
      },
      {
        method: "POST",
        path: "/api/billing/subscribe",
        description: "Create a new subscription with optional 14-day trial",
        auth: "Required",
        body: `{
  "planSlug": "pro",
  "billingCycle": "monthly" | "yearly",
  "withTrial": true
}`,
        response: `{
  "success": true,
  "subscription": {...},
  "trial": {
    "days": 14,
    "endsAt": "2025-01-29T00:00:00Z"
  }
}`,
      },
      {
        method: "POST",
        path: "/api/billing/change-plan",
        description: "Upgrade or downgrade subscription plan",
        auth: "Required",
        body: `{
  "planSlug": "agency",
  "billingCycle": "monthly"
}`,
      },
      {
        method: "POST",
        path: "/api/billing/cancel",
        description: "Cancel subscription at period end",
        auth: "Required",
        body: `{
  "reason": "too_expensive" | "not_using" | "missing_features",
  "feedback": "Optional feedback text"
}`,
      },
      {
        method: "POST",
        path: "/api/billing/reactivate",
        description: "Reactivate a cancelled subscription",
        auth: "Required",
      },
      {
        method: "GET",
        path: "/api/billing/plans",
        description: "List available subscription plans",
        auth: "Public",
        response: `{
  "plans": [
    {
      "slug": "starter",
      "name": "Starter",
      "priceMonthly": 297,
      "priceYearly": 2970,
      "features": ["1,000 Leads/month", "500 SMS", ...]
    }
  ]
}`,
      },
    ],
  },
  leads: {
    icon: Database,
    description: "Lead management and import",
    endpoints: [
      {
        method: "POST",
        path: "/api/leads/import",
        description: "Import leads from CSV data",
        auth: "Required",
        body: `{
  "leads": [
    {
      "firstName": "John",
      "lastName": "Smith",
      "email": "john@example.com",
      "phone": "555-123-4567",
      "company": "Smith Plumbing",
      "address": "123 Main St",
      "city": "Denver",
      "state": "CO"
    }
  ],
  "source": "csv_import",
  "industryId": "home_plumbing"
}`,
        response: `{
  "success": true,
  "imported": 100,
  "bucketId": "uuid"
}`,
      },
    ],
  },
  enrichment: {
    icon: Search,
    description: "Lead enrichment via Tracerfiy skip trace",
    endpoints: [
      {
        method: "POST",
        path: "/api/enrich",
        description: "Enrich leads with phone numbers and emails",
        auth: "Required",
        body: `{
  "leads": [
    {
      "firstName": "John",
      "lastName": "Smith",
      "address": "123 Main St",
      "city": "Denver",
      "state": "CO"
    }
  ],
  "enhanced": false
}`,
        response: `{
  "results": [
    {
      "ownerName": "John Smith",
      "mobile": "555-123-4567",
      "mobiles": ["555-123-4567", "555-234-5678"],
      "emails": ["john@email.com"],
      "success": true
    }
  ],
  "stats": {
    "processed": 100,
    "withMobile": 70,
    "withEmail": 65,
    "mobileRate": 70,
    "cost": 2.00
  }
}`,
      },
      {
        method: "GET",
        path: "/api/enrich",
        description: "Get enrichment balance and usage stats",
        auth: "Required",
        response: `{
  "balance": 1000,
  "costPerLead": 0.02,
  "usage": { "today": 50, "limit": 2000 }
}`,
      },
      {
        method: "POST",
        path: "/api/skip-trace",
        description: "Skip trace individual or batch properties",
        auth: "Required",
        body: `{
  "ids": ["property_id_1", "property_id_2"],
  "addToSmsQueue": true,
  "smsTemplate": "Hi {{firstName}}..."
}`,
      },
    ],
  },
  sms: {
    icon: MessageSquare,
    description: "SMS campaigns via SignalHouse",
    endpoints: [
      {
        method: "POST",
        path: "/api/sms/send-template",
        description: "Send templated SMS to a lead",
        auth: "Required",
        body: `{
  "leadId": "lead_123",
  "templateCategory": "sms_initial",
  "variables": {
    "firstName": "John",
    "companyName": "Acme Corp"
  }
}`,
      },
      {
        method: "POST",
        path: "/api/webhook/signalhouse",
        description: "Webhook for incoming SMS and delivery status",
        auth: "Webhook Token",
        note: "Configure webhook URL in SignalHouse dashboard",
      },
    ],
  },
  campaigns: {
    icon: Zap,
    description: "Campaign execution and THE LOOP",
    endpoints: [
      {
        method: "POST",
        path: "/api/campaigns/instant-execute",
        description: "Execute a campaign immediately",
        auth: "Required",
        body: `{
  "campaignId": "campaign_123",
  "leadIds": ["lead_1", "lead_2"],
  "templateId": "template_opener"
}`,
      },
      {
        method: "GET",
        path: "/api/campaigns/intents",
        description: "Get available campaign intents",
        auth: "Required",
      },
    ],
  },
};

const methodColors: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  POST: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  PUT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

function EndpointCard({
  endpoint,
}: {
  endpoint: {
    method: string;
    path: string;
    description: string;
    auth: string;
    body?: string;
    response?: string;
    note?: string;
  };
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer rounded-lg border mb-2">
          <div className="flex items-center gap-3">
            <Badge className={methodColors[endpoint.method]}>
              {endpoint.method}
            </Badge>
            <code className="text-sm font-mono">{endpoint.path}</code>
            {endpoint.auth === "Required" && (
              <Lock className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden md:inline">
              {endpoint.description}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-4 pr-4 pb-4 space-y-4">
          <p className="text-sm text-muted-foreground md:hidden">
            {endpoint.description}
          </p>

          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Authentication:</span>
            <Badge
              variant={endpoint.auth === "Public" ? "secondary" : "default"}
            >
              {endpoint.auth}
            </Badge>
          </div>

          {endpoint.note && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
              {endpoint.note}
            </div>
          )}

          {endpoint.body && (
            <div>
              <span className="text-sm font-medium">Request Body:</span>
              <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                {endpoint.body}
              </pre>
            </div>
          )}

          {endpoint.response && (
            <div>
              <span className="text-sm font-medium">Response:</span>
              <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                {endpoint.response}
              </pre>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold">API Documentation</h1>
        <p className="text-muted-foreground">
          Reference documentation for the NEXTIER Growth OS API
        </p>
      </div>

      {/* Authentication Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Authentication
          </CardTitle>
          <CardDescription>
            All protected endpoints require authentication via JWT session token
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Include your session token in requests. The token is automatically
            included when making requests from the web application.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <code className="text-sm">
              Cookie: nextier_session=your_jwt_token
            </code>
          </div>
          <p className="text-sm text-muted-foreground">
            For API integrations, contact support to obtain API keys.
          </p>
        </CardContent>
      </Card>

      {/* Base URL */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Base URL</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="text-sm bg-muted p-2 rounded">
            {process.env.NEXT_PUBLIC_APP_URL || "https://app.yourdomain.com"}
          </code>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Tabs defaultValue="billing" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-2">
          {Object.entries(apiEndpoints).map(([key, section]) => {
            const Icon = section.icon;
            return (
              <TabsTrigger
                key={key}
                value={key}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                <span className="capitalize">{key}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(apiEndpoints).map(([key, section]) => {
          const Icon = section.icon;
          return (
            <TabsContent key={key} value={key}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <span className="capitalize">{key}</span>
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {section.endpoints.map((endpoint, idx) => (
                    <EndpointCard key={idx} endpoint={endpoint} />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Rate Limits */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
          <CardDescription>
            API rate limits to ensure fair usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium">Skip Trace / Enrichment</h4>
              <p className="text-sm text-muted-foreground mt-1">
                2,000 leads per day
              </p>
              <p className="text-sm text-muted-foreground">
                250 leads per batch
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium">SMS Sending</h4>
              <p className="text-sm text-muted-foreground mt-1">
                2,000 messages per phone number per day
              </p>
              <p className="text-sm text-muted-foreground">
                Phone pool rotation enabled
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>
            Configure webhooks for real-time event notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-medium">SignalHouse SMS Webhook</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Receives inbound SMS, delivery status, and opt-out events
            </p>
            <code className="text-xs bg-muted p-2 rounded mt-2 block">
              POST /api/webhook/signalhouse?token=YOUR_WEBHOOK_TOKEN
            </code>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-medium">Tracerfiy Webhook</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Receives skip trace job completion notifications
            </p>
            <code className="text-xs bg-muted p-2 rounded mt-2 block">
              POST /api/skip-trace/tracerfy/webhook
            </code>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-medium">Stripe Webhook</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Receives subscription and payment events
            </p>
            <code className="text-xs bg-muted p-2 rounded mt-2 block">
              POST /api/billing/webhook
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            For API access, custom integrations, or technical support:
          </p>
          <Button>Contact Support</Button>
        </CardContent>
      </Card>
    </div>
  );
}
