"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Database,
  Home,
  FileText,
  ArrowRight,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Search,
  Users,
  MapPin,
  Server,
  Globe,
  ArrowDown,
  Bot,
  Cable,
  Activity,
  Cloud,
} from "lucide-react";
import { toast } from "sonner";

interface MCPServer {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: "connected" | "disconnected" | "checking";
  type: "local" | "remote";
  capabilities: string[];
  endpoint?: string;
}

const MCP_SERVERS: MCPServer[] = [
  {
    id: "postgres",
    name: "PostgreSQL",
    description: "Direct database access to DigitalOcean PostgreSQL",
    icon: Database,
    status: "checking",
    type: "local",
    capabilities: ["Query leads", "Saved searches", "Users", "Campaigns"],
    endpoint: "npx @modelcontextprotocol/server-postgres",
  },
  {
    id: "realestate-api",
    name: "RealEstateAPI",
    description: "Property search, skip trace, owner data",
    icon: Home,
    status: "checking",
    type: "remote",
    capabilities: ["Property Search", "Skip Trace", "Owner Lookup", "MLS Data"],
    endpoint: "https://mcp.realestateapi.com/sse",
  },
  {
    id: "reapi-developer",
    name: "REAPI Developer",
    description: "API documentation and reference",
    icon: FileText,
    status: "checking",
    type: "remote",
    capabilities: ["API Docs", "Field Reference", "Examples"],
    endpoint: "https://developer.mcp.realestateapi.com/sse",
  },
  {
    id: "digitalocean",
    name: "DigitalOcean API",
    description: "Deployments, queues, and runtime controls",
    icon: Cloud,
    status: "checking",
    type: "remote",
    capabilities: ["Deploy apps", "Inspect job queues", "Read cluster status"],
    endpoint: "https://api.digitalocean.com",
  },
];

export function MCPDashboard() {
  const [servers, setServers] = useState<MCPServer[]>(MCP_SERVERS);
  const [isTestingAll, setIsTestingAll] = useState(false);

  useEffect(() => {
    // Simulate initial connection check
    const timer = setTimeout(() => {
      setServers((prev) =>
        prev.map((server) => ({
          ...server,
          status: "connected" as const,
        })),
      );
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const testConnection = async (serverId: string) => {
    setServers((prev) =>
      prev.map((s) =>
        s.id === serverId ? { ...s, status: "checking" as const } : s,
      ),
    );

    // Simulate connection test
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setServers((prev) =>
      prev.map((s) =>
        s.id === serverId ? { ...s, status: "connected" as const } : s,
      ),
    );

    toast.success(`${servers.find((s) => s.id === serverId)?.name} connected`);
  };

  const testAllConnections = async () => {
    setIsTestingAll(true);
    for (const server of servers) {
      await testConnection(server.id);
    }
    setIsTestingAll(false);
    toast.success("All MCP servers connected!");
  };

  const getStatusBadge = (status: MCPServer["status"]) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case "disconnected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        );
      case "checking":
        return (
          <Badge variant="secondary">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Checking
          </Badge>
        );
    }
  };

  const connectedCount = servers.filter((s) => s.status === "connected").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600 rounded-lg">
            <Cable className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
              MCP Dashboard
            </h2>
            <p className="text-zinc-400">
              Model Context Protocol connections for AI-powered operations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700">
            <Activity
              className={`h-4 w-4 ${connectedCount === servers.length ? "text-green-400" : "text-yellow-400"}`}
            />
            <span className="text-zinc-300 font-medium">
              {connectedCount}/{servers.length} Active
            </span>
          </div>
          <Button
            onClick={testAllConnections}
            disabled={isTestingAll}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isTestingAll ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Test All
          </Button>
        </div>
      </div>

      {/* Visual Flow Diagram */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Universal Context Flow
          </CardTitle>
          <CardDescription className="text-slate-300">
            How Claude Code orchestrates your data through MCP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6">
            {/* User Layer */}
            <div className="flex items-center gap-2 bg-blue-600 px-6 py-3 rounded-lg shadow-lg">
              <Users className="h-5 w-5" />
              <span className="font-semibold">You (VS Code)</span>
            </div>

            <ArrowDown className="h-6 w-6 my-3 text-blue-400" />

            {/* Claude Code Layer */}
            <div className="flex items-center gap-2 bg-purple-600 px-6 py-3 rounded-lg shadow-lg">
              <Bot className="h-5 w-5" />
              <span className="font-semibold">Claude Code (Orchestrator)</span>
            </div>

            <ArrowDown className="h-6 w-6 my-3 text-purple-400" />

            {/* MCP Layer */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
              {servers.map((server) => {
                const Icon = server.icon;
                const isConnected = server.status === "connected";
                return (
                  <div
                    key={server.id}
                    className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                      isConnected
                        ? "bg-green-900/30 border-green-500"
                        : "bg-slate-800 border-slate-600"
                    }`}
                  >
                    <Icon
                      className={`h-8 w-8 mb-2 ${isConnected ? "text-green-400" : "text-slate-400"}`}
                    />
                    <span className="text-sm font-medium text-center">
                      {server.name}
                    </span>
                    <span
                      className={`text-xs mt-1 ${isConnected ? "text-green-400" : "text-slate-500"}`}
                    >
                      {isConnected ? "● Live" : "○ Offline"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 mt-4">
              <ArrowDown className="h-6 w-6 text-green-400" />
              <ArrowDown className="h-6 w-6 text-green-400" />
              <ArrowDown className="h-6 w-6 text-green-400" />
            </div>

            {/* External Services Layer */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-2xl mt-2">
              <div className="flex flex-col items-center p-3 bg-slate-700/50 rounded-lg">
                <Database className="h-6 w-6 text-blue-400 mb-1" />
                <span className="text-xs text-slate-300">Your Database</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-slate-700/50 rounded-lg">
                <Home className="h-6 w-6 text-orange-400 mb-1" />
                <span className="text-xs text-slate-300">150M+ Properties</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-slate-700/50 rounded-lg">
                <FileText className="h-6 w-6 text-purple-400 mb-1" />
                <span className="text-xs text-slate-300">API Docs</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Server Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {servers.map((server) => {
          const Icon = server.icon;
          return (
            <Card
              key={server.id}
              className="relative overflow-hidden bg-zinc-900 border-zinc-800"
            >
              <div
                className={`absolute top-0 left-0 w-1 h-full ${
                  server.status === "connected"
                    ? "bg-green-500"
                    : server.status === "checking"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        server.status === "connected"
                          ? "bg-green-900/50"
                          : "bg-zinc-800"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          server.status === "connected"
                            ? "text-green-400"
                            : "text-zinc-400"
                        }`}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base text-zinc-100">
                        {server.name}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="text-xs mt-1 border-zinc-700 text-zinc-400"
                      >
                        {server.type === "local" ? (
                          <>
                            <Server className="h-3 w-3 mr-1" />
                            Local
                          </>
                        ) : (
                          <>
                            <Globe className="h-3 w-3 mr-1" />
                            Remote SSE
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                  {getStatusBadge(server.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-zinc-400">{server.description}</p>
                <div className="flex flex-wrap gap-1">
                  {server.capabilities.map((cap) => (
                    <Badge
                      key={cap}
                      variant="secondary"
                      className="text-xs bg-zinc-800 text-zinc-300 border-zinc-700"
                    >
                      {cap}
                    </Badge>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={() => testConnection(server.id)}
                  disabled={server.status === "checking"}
                >
                  {server.status === "checking" ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Example Queries */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Search className="h-5 w-5" />
            Example Commands
          </CardTitle>
          <CardDescription className="text-zinc-400">
            What you can ask Claude Code with these MCP connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                query: "Find pre-foreclosure properties in Harris County TX",
                mcp: "realestate-api",
                icon: Home,
              },
              {
                query: "Show me all leads added this week",
                mcp: "postgres",
                icon: Database,
              },
              {
                query: "Skip trace the owner of 123 Main St",
                mcp: "realestate-api",
                icon: Users,
              },
              {
                query: "What filters does PropertySearch support?",
                mcp: "reapi-developer",
                icon: FileText,
              },
              {
                query:
                  "Find absentee owners with high equity in NY, NJ, CT, FL",
                mcp: "realestate-api",
                icon: MapPin,
              },
              {
                query:
                  "Cross-reference these properties with our saved searches",
                mcp: "postgres",
                icon: Database,
              },
            ].map((example, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
              >
                <example.icon className="h-5 w-5 text-zinc-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-200">
                    "{example.query}"
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowRight className="h-3 w-3 text-zinc-500" />
                    <Badge
                      variant="outline"
                      className="text-xs border-zinc-600 text-zinc-400"
                    >
                      {example.mcp}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* States Coverage */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <MapPin className="h-5 w-5" />
            Target Markets
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Your focus areas for property search and lead generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              "New York (NY)",
              "New Jersey (NJ)",
              "Connecticut (CT)",
              "Florida (FL)",
            ].map((state) => (
              <Badge
                key={state}
                className="text-sm px-3 py-1 bg-blue-900/50 text-blue-300 border-blue-700"
              >
                <MapPin className="h-3 w-3 mr-1" />
                {state}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-zinc-400 mt-3">
            Use the RealEstateAPI MCP to search properties, find absentee
            owners, and identify pre-foreclosure opportunities in these markets.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
