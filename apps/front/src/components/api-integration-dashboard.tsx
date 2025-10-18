"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataEnrichmentApiSettings } from "@/components/data-enrichment-api-settings";
import { ApiIntegrationSettings } from "@/components/api-integration-settings";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Database,
  Home,
  MessageSquare,
  Shield,
  UserSearch,
} from "lucide-react";

export function ApiIntegrationDashboard() {
  const [activeCategory, setActiveCategory] = useState("data-verification");

  const categories = [
    {
      id: "data-verification",
      name: "Data Verification",
      icon: <Shield className="h-4 w-4" />,
      count: 3,
    },
    {
      id: "skip-trace",
      name: "Skip Trace",
      icon: <UserSearch className="h-4 w-4" />,
      count: 6,
    },
    {
      id: "data-append",
      name: "Data Append",
      icon: <Database className="h-4 w-4" />,
      count: 6,
    },
    {
      id: "communication",
      name: "Communication",
      icon: <MessageSquare className="h-4 w-4" />,
      count: 3,
    },
    {
      id: "property-data",
      name: "Property Data",
      icon: <Home className="h-4 w-4" />,
      count: 4,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* Sidebar */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent className="px-2 py-1">
            <nav className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                    activeCategory === category.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <div className="flex items-center">
                    <span className="mr-2">{category.icon}</span>
                    <span>{category.name}</span>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {category.count}
                  </Badge>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3">
        {activeCategory === "data-verification" && <ApiIntegrationSettings />}
        {activeCategory === "skip-trace" && (
          <DataEnrichmentApiSettings type="skip-trace" />
        )}
        {activeCategory === "data-append" && (
          <DataEnrichmentApiSettings type="data-append" />
        )}
        {activeCategory === "communication" && (
          <SimplifiedApiSection title="Communication APIs" />
        )}
        {activeCategory === "property-data" && (
          <SimplifiedApiSection title="Property Data APIs" />
        )}
      </div>
    </div>
  );
}

function SimplifiedApiSection({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Configure API keys and settings for {title.toLowerCase()}.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <ApiProviderCard key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ApiProviderCard() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Provider Name</h3>
              <p className="text-xs text-muted-foreground">API Provider</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Configured
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
