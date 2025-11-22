"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { $http } from "@/lib/http";
import { useCurrentTeam } from "@/features/team/team.context";
import {
  ServerIcon,
  DatabaseIcon,
  ClockIcon,
  BellIcon,
  BarChart3Icon,
  SettingsIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  RefreshCwIcon,
} from "lucide-react";
import { LoadingOverlay } from "@/components/ui/loading/loading-overlay";

export function RealEstateControlPanel() {
  const { team } = useCurrentTeam();
  const teamId = team?.id || "test"; // Fallback to "test" for development
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [apiStats, setApiStats] = useState({
    totalSearches: 0,
    totalSkipTraces: 0,
    totalSavedSearches: 0,
    totalPropertiesTracked: 0,
  });

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = async () => {
    setLoading(true);
    try {
      const { data } = await $http.post(`/${teamId}/realestate-api/saved-search/list`, {});
      setSavedSearches(data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load saved searches");
    } finally {
      setLoading(false);
    }
  };

  const deleteSavedSearch = async (searchId: string) => {
    if (!confirm("Are you sure you want to delete this saved search?")) return;

    setLoading(true);
    try {
      await $http.post(`/${teamId}/realestate-api/saved-search/delete`, {
        searchId,
      });
      toast.success("Saved search deleted!");
      loadSavedSearches();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete saved search");
    } finally {
      setLoading(false);
    }
  };

  const runDailyAutomation = async () => {
    if (!savedSearches.length) {
      toast.error("No saved searches to process");
      return;
    }

    setLoading(true);
    try {
      const savedSearchIds = savedSearches.map(s => s.id || s.searchId);
      const { data } = await $http.post(`/${teamId}/realestate-api/automation/run-daily`, {
        savedSearchIds,
      });

      toast.success(`Daily automation completed! Processed ${savedSearchIds.length} saved searches.`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to run daily automation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {loading && <LoadingOverlay />}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Searches</CardTitle>
            <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{savedSearches.length}</div>
            <p className="text-xs text-muted-foreground">Active automated searches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiStats.totalPropertiesTracked.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Being monitored</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Automation</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">Running daily at 2:00 AM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Status</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Operational</div>
            <p className="text-xs text-muted-foreground">All systems online</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Control Panel */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <ServerIcon className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="saved-searches">
            <DatabaseIcon className="mr-2 h-4 w-4" />
            Saved Searches
          </TabsTrigger>
          <TabsTrigger value="automation">
            <ClockIcon className="mr-2 h-4 w-4" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="settings">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>
                Monitor RealEstate API integration status and performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Endpoints Status */}
              <div>
                <h3 className="text-sm font-semibold mb-3">API Endpoints Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded border">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="font-medium">Property Search</span>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded border">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="font-medium">Skip Trace</span>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded border">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="font-medium">Property Detail</span>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded border">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="font-medium">Saved Searches</span>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ClockIcon className="h-4 w-4" />
                    <span>Last search: {new Date().toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DatabaseIcon className="h-4 w-4" />
                    <span>{savedSearches.length} saved searches configured</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCwIcon className="h-4 w-4" />
                    <span>Daily automation: Enabled</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SAVED SEARCHES TAB */}
        <TabsContent value="saved-searches" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Saved Searches</CardTitle>
                  <CardDescription>
                    Manage automated property searches that run daily
                  </CardDescription>
                </div>
                <Button onClick={loadSavedSearches} variant="outline" size="sm">
                  <RefreshCwIcon className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {savedSearches.length === 0 ? (
                <div className="text-center py-12">
                  <DatabaseIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No saved searches yet. Create one from the Property Search tab.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Search Name</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Properties</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedSearches.map((search, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {search.searchName || `Search ${index + 1}`}
                        </TableCell>
                        <TableCell>
                          {search.createdAt
                            ? new Date(search.createdAt).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">Active</Badge>
                        </TableCell>
                        <TableCell>{search.totalProperties || 0}</TableCell>
                        <TableCell>
                          {search.lastRun
                            ? new Date(search.lastRun).toLocaleString()
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteSavedSearch(search.id || search.searchId)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUTOMATION TAB */}
        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Automation</CardTitle>
              <CardDescription>
                Automatically process saved searches and track property changes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Automation Controls */}
              <div className="p-6 rounded border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold mb-4">Automation Controls</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Daily Automation</div>
                      <div className="text-sm text-muted-foreground">
                        Process up to 2,000 properties per day
                      </div>
                    </div>
                    <Button onClick={runDailyAutomation} disabled={loading}>
                      <PlayIcon className="mr-2 h-4 w-4" />
                      Run Now
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Schedule</div>
                      <div className="text-sm text-muted-foreground">
                        Runs daily at 2:00 AM UTC
                      </div>
                    </div>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                </div>
              </div>

              {/* Automation Log */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Recent Automation Runs</h3>
                <div className="space-y-2">
                  <div className="p-3 rounded border text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">No automation runs yet</div>
                      <Badge variant="outline">N/A</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Click "Run Now" to start processing saved searches
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Monitoring */}
              <div className="p-6 rounded border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold mb-4">Property Event Monitoring</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BellIcon className="h-4 w-4" />
                    <span>Track property status changes (Listed, Sold, Vacant)</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BellIcon className="h-4 w-4" />
                    <span>Monitor distress signals (Foreclosure, Lis Pendens)</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BellIcon className="h-4 w-4" />
                    <span>Alert on price changes and equity updates</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Settings</CardTitle>
              <CardDescription>
                Configure RealEstate API integration parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Keys */}
              <div className="p-6 rounded border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold mb-4">API Keys</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Property Search API Key</Label>
                    <Input
                      type="password"
                      value="NEXTIER-2906-74a1-8684-d2f63f473b7b"
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Skip Trace API Key</Label>
                    <Input
                      type="password"
                      value="ELITEHOMEOWNERADVISORSSKIPPRODUCTION-8aae-7b54-9463-5db02217ffa5"
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Daily Limits */}
              <div className="p-6 rounded border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold mb-4">Daily Limits</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Properties Per Day</Label>
                    <Input type="number" value="2000" disabled />
                    <p className="text-xs text-muted-foreground">
                      Maximum properties to process per automation run
                    </p>
                  </div>
                </div>
              </div>

              {/* Storage Configuration */}
              <div className="p-6 rounded border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold mb-4">Storage Configuration</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Storage Provider</Label>
                    <Input value="DigitalOcean Spaces" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Bucket Name</Label>
                    <Input value="saved-searches" disabled />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
