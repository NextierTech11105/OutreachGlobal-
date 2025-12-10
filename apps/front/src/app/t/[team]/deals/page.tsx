"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { TeamDescription } from "@/features/team/layouts/team-description";
import { TeamLink } from "@/features/team/components/team-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Target,
  Plus,
  LayoutGrid,
  List,
  Filter,
  RefreshCw,
  Building2,
  Home,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Types
interface Deal {
  id: string;
  name: string;
  type: string;
  stage: string;
  priority: string;
  estimatedValue: number;
  monetization?: {
    type: string;
    rate: number;
    estimatedEarnings: number;
  };
  seller?: { name: string; company?: string };
  assignedTo?: string;
  expectedCloseDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface PipelineColumn {
  stage: string;
  name: string;
  deals: Deal[];
  count: number;
  value: number;
}

interface PipelineStats {
  totalDeals: number;
  totalValue: number;
  avgDaysInPipeline: number;
  conversionRate: number;
  expectedRevenue: number;
}

const STAGE_COLORS: Record<string, string> = {
  discovery: "bg-blue-500",
  qualification: "bg-purple-500",
  proposal: "bg-amber-500",
  negotiation: "bg-orange-500",
  contract: "bg-emerald-500",
  closing: "bg-green-500",
  closed_won: "bg-green-600",
  closed_lost: "bg-red-500",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  b2b_exit: <Building2 className="h-4 w-4" />,
  commercial: <Building2 className="h-4 w-4" />,
  assemblage: <LayoutGrid className="h-4 w-4" />,
  blue_collar_exit: <Building2 className="h-4 w-4" />,
  development: <Target className="h-4 w-4" />,
  residential_haos: <Home className="h-4 w-4" />,
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function DealsPage() {
  const params = useParams();
  const teamId = params.team as string;

  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [closedWon, setClosedWon] = useState<Deal[]>([]);
  const [closedLost, setClosedLost] = useState<Deal[]>([]);
  const [view, setView] = useState<"board" | "list">("board");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchPipeline = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/deals/pipeline", window.location.origin);
      url.searchParams.set("teamId", teamId);
      if (typeFilter !== "all") {
        url.searchParams.set("type", typeFilter);
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.success) {
        setColumns(data.pipeline.columns);
        setStats(data.pipeline.stats);
        setClosedWon(data.pipeline.closedWon);
        setClosedLost(data.pipeline.closedLost);
      }
    } catch (error) {
      console.error("Failed to fetch pipeline:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      fetchPipeline();
    }
  }, [teamId, typeFilter]);

  return (
    <TeamSection>
      <TeamHeader title="Deal Pipeline" />

      <div className="container space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <TeamTitle>Deal Pipeline</TeamTitle>
            <TeamDescription>
              Track and close deals from discovery to closing
            </TeamDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchPipeline}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button asChild>
              <TeamLink href="/deals/create">
                <Plus className="mr-2 h-4 w-4" />
                New Deal
              </TeamLink>
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  Active Deals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDeals}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  Pipeline Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalValue)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  Expected Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.expectedRevenue)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Avg. Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.avgDaysInPipeline}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-500" />
                  Win Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.conversionRate}%
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Deal Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Deal Types</SelectItem>
                <SelectItem value="b2b_exit">B2B Exit</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="assemblage">Assemblage</SelectItem>
                <SelectItem value="blue_collar_exit">
                  Blue Collar Exit
                </SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="residential_haos">
                  Residential HAOS
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center border rounded-lg">
            <Button
              variant={view === "board" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("board")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Pipeline Board */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : view === "board" ? (
          <div className="grid grid-cols-6 gap-4 overflow-x-auto">
            {columns.map((column) => (
              <div key={column.stage} className="min-w-[280px]">
                {/* Column Header */}
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${STAGE_COLORS[column.stage]}`}
                      />
                      <span className="font-medium">{column.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {column.count}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(column.value)}
                    </span>
                  </div>
                </div>

                {/* Deal Cards */}
                <div className="space-y-3">
                  {column.deals.map((deal) => (
                    <Card
                      key={deal.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {TYPE_ICONS[deal.type] || (
                              <Target className="h-4 w-4" />
                            )}
                            <span className="font-medium text-sm truncate max-w-[180px]">
                              {deal.name}
                            </span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit Deal</DropdownMenuItem>
                              <DropdownMenuItem>Move Stage</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="mt-2 space-y-1">
                          {deal.seller?.name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {deal.seller.name}
                              {deal.seller.company &&
                                ` - ${deal.seller.company}`}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-green-600">
                              {formatCurrency(deal.estimatedValue)}
                            </span>
                            {deal.expectedCloseDate && (
                              <span className="text-muted-foreground">
                                {formatDate(deal.expectedCloseDate)}
                              </span>
                            )}
                          </div>
                          {deal.monetization && (
                            <div className="text-xs text-muted-foreground">
                              Est. Revenue:{" "}
                              {formatCurrency(
                                deal.monetization.estimatedEarnings,
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {deal.type.replace(/_/g, " ")}
                          </Badge>
                          {deal.priority === "high" && (
                            <Badge variant="destructive" className="text-xs">
                              High
                            </Badge>
                          )}
                          {deal.priority === "urgent" && (
                            <Badge variant="destructive" className="text-xs">
                              Urgent
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {column.deals.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No deals
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Deal</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">Stage</th>
                    <th className="text-left p-4 font-medium">Value</th>
                    <th className="text-left p-4 font-medium">Est. Revenue</th>
                    <th className="text-left p-4 font-medium">
                      Expected Close
                    </th>
                    <th className="text-left p-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {columns.flatMap((col) =>
                    col.deals.map((deal) => (
                      <tr key={deal.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="font-medium">{deal.name}</div>
                          {deal.seller?.name && (
                            <div className="text-sm text-muted-foreground">
                              {deal.seller.name}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">
                            {deal.type.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${STAGE_COLORS[deal.stage]}`}
                            />
                            <span className="capitalize">
                              {deal.stage.replace(/_/g, " ")}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 font-medium">
                          {formatCurrency(deal.estimatedValue)}
                        </td>
                        <td className="p-4 text-green-600">
                          {deal.monetization
                            ? formatCurrency(
                                deal.monetization.estimatedEarnings,
                              )
                            : "-"}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {deal.expectedCloseDate
                            ? formatDate(deal.expectedCloseDate)
                            : "-"}
                        </td>
                        <td className="p-4">
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Closed Deals Section */}
        {(closedWon.length > 0 || closedLost.length > 0) && (
          <div className="pt-6">
            <Tabs defaultValue="won">
              <TabsList>
                <TabsTrigger value="won" className="gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Won ({closedWon.length})
                </TabsTrigger>
                <TabsTrigger value="lost" className="gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Lost ({closedLost.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="won" className="mt-4">
                <div className="grid grid-cols-3 gap-4">
                  {closedWon.map((deal) => (
                    <Card key={deal.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{deal.name}</span>
                          <Badge className="bg-green-500">Won</Badge>
                        </div>
                        <div className="mt-2 text-lg font-bold text-green-600">
                          {formatCurrency(deal.estimatedValue)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="lost" className="mt-4">
                <div className="grid grid-cols-3 gap-4">
                  {closedLost.map((deal) => (
                    <Card key={deal.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{deal.name}</span>
                          <Badge variant="destructive">Lost</Badge>
                        </div>
                        <div className="mt-2 text-lg font-bold text-muted-foreground">
                          {formatCurrency(deal.estimatedValue)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </TeamSection>
  );
}
