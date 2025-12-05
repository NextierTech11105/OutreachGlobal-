"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Building2, Home, DollarSign, MapPin, Briefcase,
  Search, Database, Upload, TrendingUp, Users,
  FileSpreadsheet, RefreshCcw, Plus, ArrowRight,
  BarChart3, Layers
} from "lucide-react";
import {
  SECTOR_WORKSPACES,
  Sector,
  SectorWorkspace,
  getAllSectors,
  getSectorById,
  getSectorsByCategory,
} from "@/config/sectors";
import { SectorWorkspaceSelector, SectorBadges } from "@/components/sector-workspace-selector";

// Stats for each sector (would come from API in production)
interface SectorStats {
  sectorId: string;
  totalRecords: number;
  enrichedRecords: number;
  contactedRecords: number;
  lastUpdated?: Date;
}

// Data source summary
interface DataSourceSummary {
  id: string;
  name: string;
  sourceType: string;
  sourceProvider: string;
  totalRows: number;
  status: "pending" | "processing" | "completed" | "failed";
  sectorId?: string;
  createdAt: Date;
}

export default function SectorsPage() {
  const [activeWorkspace, setActiveWorkspace] = useState<string>("real_estate");
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorStats, setSectorStats] = useState<Record<string, SectorStats>>({});
  const [dataSources, setDataSources] = useState<DataSourceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    // In production, fetch from API
    const mockStats: Record<string, SectorStats> = {
      residential_sfr: { sectorId: "residential_sfr", totalRecords: 45000, enrichedRecords: 12000, contactedRecords: 3500 },
      residential_mfr: { sectorId: "residential_mfr", totalRecords: 8500, enrichedRecords: 2100, contactedRecords: 890 },
      pre_foreclosure: { sectorId: "pre_foreclosure", totalRecords: 2300, enrichedRecords: 1800, contactedRecords: 650 },
      high_equity: { sectorId: "high_equity", totalRecords: 15000, enrichedRecords: 5000, contactedRecords: 1200 },
      healthcare: { sectorId: "healthcare", totalRecords: 3200, enrichedRecords: 1500, contactedRecords: 450 },
      restaurants_food: { sectorId: "restaurants_food", totalRecords: 5600, enrichedRecords: 2800, contactedRecords: 920 },
      bronx: { sectorId: "bronx", totalRecords: 65733, enrichedRecords: 0, contactedRecords: 0 },
    };
    setSectorStats(mockStats);

    const mockDataSources: DataSourceSummary[] = [
      { id: "1", name: "RealEstateAPI - Bronx Properties", sourceType: "api", sourceProvider: "realestateapi", totalRows: 65733, status: "completed", sectorId: "bronx", createdAt: new Date() },
      { id: "2", name: "NY Healthcare Businesses", sourceType: "csv", sourceProvider: "usbizdata", totalRows: 3200, status: "completed", sectorId: "healthcare", createdAt: new Date() },
    ];
    setDataSources(mockDataSources);
    setIsLoading(false);
  }, []);

  const activeWorkspaceData = SECTOR_WORKSPACES.find(w => w.id === activeWorkspace);

  const filteredSectors = getAllSectors().filter(sector =>
    sector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sector.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sector.sicCodes?.some(code => code.includes(searchQuery)))
  );

  const handleSectorSelect = (sector: Sector) => {
    setSelectedSector(sector);
  };

  const getSectorRecordCount = (sectorId: string): number => {
    return sectorStats[sectorId]?.totalRecords || 0;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const SectorCard = ({ sector }: { sector: Sector }) => {
    const Icon = sector.icon;
    const stats = sectorStats[sector.id];
    const isSelected = selectedSector?.id === sector.id;

    return (
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
          isSelected && "ring-2 ring-primary border-primary"
        )}
        onClick={() => handleSectorSelect(sector)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className={cn("p-2 rounded-lg", sector.bgColor)}>
              <Icon className={cn("h-5 w-5", sector.color)} />
            </div>
            <Badge variant="outline" className="text-xs">
              {formatNumber(getSectorRecordCount(sector.id))} records
            </Badge>
          </div>
          <CardTitle className="text-sm mt-2">{sector.name}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">{sector.description}</p>
          {stats && (
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {formatNumber(stats.enrichedRecords)} enriched
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {formatNumber(stats.contactedRecords)} contacted
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const WorkspaceOverview = ({ workspace }: { workspace: SectorWorkspace }) => {
    const Icon = workspace.icon;
    const totalRecords = workspace.sectors.reduce(
      (acc, s) => acc + getSectorRecordCount(s.id),
      0
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-lg bg-muted")}>
              <Icon className={cn("h-6 w-6", workspace.color)} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{workspace.name}</h3>
              <p className="text-sm text-muted-foreground">{workspace.description}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{formatNumber(totalRecords)}</p>
            <p className="text-sm text-muted-foreground">total records</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {workspace.sectors.map((sector) => (
            <SectorCard key={sector.id} sector={sector} />
          ))}
        </div>
      </div>
    );
  };

  const SelectedSectorDetails = () => {
    if (!selectedSector) return null;
    const Icon = selectedSector.icon;
    const stats = sectorStats[selectedSector.id];

    return (
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-3 rounded-lg", selectedSector.bgColor)}>
                <Icon className={cn("h-6 w-6", selectedSector.color)} />
              </div>
              <div>
                <CardTitle>{selectedSector.name}</CardTitle>
                <CardDescription>{selectedSector.description}</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button size="sm">
                <ArrowRight className="h-4 w-4 mr-2" />
                View Records
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold">{formatNumber(stats?.totalRecords || 0)}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Enriched</p>
              <p className="text-2xl font-bold">{formatNumber(stats?.enrichedRecords || 0)}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Contacted</p>
              <p className="text-2xl font-bold">{formatNumber(stats?.contactedRecords || 0)}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-bold">
                {stats?.enrichedRecords && stats?.contactedRecords
                  ? `${((stats.contactedRecords / stats.enrichedRecords) * 100).toFixed(1)}%`
                  : "0%"}
              </p>
            </div>
          </div>

          {/* Sector-specific filters */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Active Filters</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(selectedSector.filters).map(([key, value]) => (
                <Badge key={key} variant="outline">
                  {key}: {String(value)}
                </Badge>
              ))}
              {selectedSector.sicCodes && selectedSector.sicCodes.length > 0 && (
                <Badge variant="outline">
                  SIC: {selectedSector.sicCodes.slice(0, 3).join(", ")}
                  {selectedSector.sicCodes.length > 3 && ` +${selectedSector.sicCodes.length - 3}`}
                </Badge>
              )}
              {selectedSector.propertyTypes && (
                <Badge variant="outline">
                  Property: {selectedSector.propertyTypes.join(", ")}
                </Badge>
              )}
              {selectedSector.leadTypes && (
                <Badge variant="outline">
                  Lead Type: {selectedSector.leadTypes.join(", ")}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Layers className="h-8 w-8" />
              Sector Workspaces
            </h2>
            <p className="text-muted-foreground mt-1">
              Organize and manage your data by industry sectors
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Sector
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(Object.values(sectorStats).reduce((acc, s) => acc + s.totalRecords, 0))}
              </div>
              <p className="text-xs text-muted-foreground">across all sectors</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataSources.length}</div>
              <p className="text-xs text-muted-foreground">connected sources</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enriched</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(Object.values(sectorStats).reduce((acc, s) => acc + s.enrichedRecords, 0))}
              </div>
              <p className="text-xs text-muted-foreground">with contact data</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sectors</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(sectorStats).length}
              </div>
              <p className="text-xs text-muted-foreground">with data</p>
            </CardContent>
          </Card>
        </div>

        {/* Selected Sector Details */}
        {selectedSector && <SelectedSectorDetails />}

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sectors by name or SIC code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {selectedSector && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedSector(null)}>
              Clear Selection
            </Button>
          )}
        </div>

        {/* Workspace Tabs */}
        <Tabs value={activeWorkspace} onValueChange={setActiveWorkspace} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {SECTOR_WORKSPACES.map((ws) => {
              const Icon = ws.icon;
              const recordCount = ws.sectors.reduce((acc, s) => acc + getSectorRecordCount(s.id), 0);
              return (
                <TabsTrigger
                  key={ws.id}
                  value={ws.id}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{ws.name}</span>
                  {recordCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {formatNumber(recordCount)}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <ScrollArea className="h-[600px] mt-4">
            {SECTOR_WORKSPACES.map((ws) => (
              <TabsContent key={ws.id} value={ws.id} className="mt-0">
                {searchQuery ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {filteredSectors.filter(s => s.category === ws.id.replace("_", "") ||
                        (ws.id === "real_estate" && s.category === "real_estate") ||
                        (ws.id === "financial" && s.category === "financial") ||
                        (ws.id === "business" && s.category === "business") ||
                        (ws.id === "geographic" && s.category === "geographic")
                      ).length} results
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredSectors
                        .filter(s => s.category === ws.id.replace("_", "") ||
                          (ws.id === "real_estate" && s.category === "real_estate") ||
                          (ws.id === "financial" && s.category === "financial") ||
                          (ws.id === "business" && s.category === "business") ||
                          (ws.id === "geographic" && s.category === "geographic")
                        )
                        .map((sector) => (
                          <SectorCard key={sector.id} sector={sector} />
                        ))}
                    </div>
                  </div>
                ) : (
                  <WorkspaceOverview workspace={ws} />
                )}
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>

        {/* Data Sources Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Data Sources
                </CardTitle>
                <CardDescription>Imported files and connected APIs</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Sync All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {dataSources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No data sources yet</p>
                <p className="text-sm">Import a CSV or connect an API to get started</p>
                <Button variant="outline" className="mt-4">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Data
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {dataSources.map((source) => {
                  const sector = source.sectorId ? getSectorById(source.sectorId) : null;
                  return (
                    <div
                      key={source.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded">
                          {source.sourceType === "csv" ? (
                            <FileSpreadsheet className="h-4 w-4" />
                          ) : (
                            <Database className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{source.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {source.sourceProvider} • {formatNumber(source.totalRows)} rows
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {sector && (
                          <Badge variant="outline" className={cn("text-xs", sector.color)}>
                            {sector.shortName}
                          </Badge>
                        )}
                        <Badge
                          variant={source.status === "completed" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {source.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
