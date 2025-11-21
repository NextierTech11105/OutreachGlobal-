"use client";

import { useState, useEffect } from "react";
import { useCurrentTeam } from "@/features/team/team.context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Save, Play, Trash2, Loader2, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

interface SavedSearch {
  id: string;
  searchName: string;
  searchQuery: Record<string, any>;
  totalProperties: string;
  lastReportDate: string;
  batchJobEnabled: string;
  batchJobStatus?: string;
  createdAt: string;
}

export default function SavedSearchesPage() {
  const [team] = useCurrentTeam();
  const router = useRouter();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (team) {
      loadSavedSearches();
    }
  }, [team]);

  const loadSavedSearches = async () => {
    if (!team) return;

    try {
      const response = await fetch(`/api/rest/${team.id}/saved-searches`);
      if (response.ok) {
        const data = await response.json();
        setSavedSearches(data);
      }
    } catch (error) {
      console.error("Error loading saved searches:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBatchJob = async (searchId: string, enabled: boolean) => {
    if (!team) return;

    try {
      await fetch(`/api/rest/${team.id}/saved-searches/${searchId}/batch-job`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: enabled ? "true" : "false" }),
      });
      loadSavedSearches();
    } catch (error) {
      console.error("Error toggling batch job:", error);
    }
  };

  const deleteSearch = async (searchId: string) => {
    if (!team) return;
    if (!confirm("Are you sure you want to delete this saved search?")) return;

    try {
      await fetch(`/api/rest/${team.id}/saved-searches/${searchId}`, {
        method: "DELETE",
      });
      loadSavedSearches();
    } catch (error) {
      console.error("Error deleting search:", error);
    }
  };

  const viewResults = (searchId: string) => {
    router.push(`/t/${team?.id}/real-estate/saved/${searchId}/results`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Save className="h-8 w-8 text-primary" />
              Saved Searches
            </h2>
            <p className="text-muted-foreground mt-2">
              Manage your saved property searches and batch jobs
            </p>
          </div>
          <Button onClick={() => router.push(`/t/${team?.id}/real-estate/search`)}>
            Create New Search
          </Button>
        </div>

        {/* Saved Searches List */}
        {savedSearches.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Save className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">No saved searches yet</p>
              <p className="text-muted-foreground mb-4">
                Create a property search and save it for later
              </p>
              <Button onClick={() => router.push(`/t/${team?.id}/real-estate/search`)}>
                Create First Search
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Your Saved Searches ({savedSearches.length})</CardTitle>
              <CardDescription>
                Track properties over time and run batch jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Search Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Property Count</TableHead>
                    <TableHead>Batch Job</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedSearches.map((search) => (
                    <TableRow key={search.id}>
                      <TableCell className="font-medium">
                        {search.searchName}
                      </TableCell>
                      <TableCell>
                        {search.searchQuery.state || ""}
                        {search.searchQuery.county ? ` - ${search.searchQuery.county}` : ""}
                        {search.searchQuery.city ? ` - ${search.searchQuery.city}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {search.totalProperties || "0"} properties
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={search.batchJobEnabled === "true" ? "default" : "outline"}
                          onClick={() =>
                            toggleBatchJob(search.id, search.batchJobEnabled !== "true")
                          }
                        >
                          {search.batchJobEnabled === "true" ? (
                            <>
                              <Play className="h-3 w-3 mr-1" />
                              Enabled
                            </>
                          ) : (
                            "Disabled"
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {search.lastReportDate
                          ? new Date(search.lastReportDate).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => viewResults(search.id)}>
                            View Results
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteSearch(search.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
