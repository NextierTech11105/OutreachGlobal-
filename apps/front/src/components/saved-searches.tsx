"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  Copy,
  Edit,
  Filter,
  Play,
  Search,
  Trash,
  RefreshCw,
  Loader2,
  Bell,
  BellOff,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface SavedSearchData {
  id: string;
  name: string;
  description: string | null;
  query: Record<string, unknown>;
  resultCount: number;
  isActive: boolean;
  notifyOnChanges: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
}

interface RefreshResult {
  changes?: {
    addedCount: number;
    removedCount: number;
    unchangedCount: number;
  };
}

export function SavedSearches() {
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchToDelete, setSearchToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [changesDialog, setChangesDialog] = useState<{
    open: boolean;
    searchName: string;
    changes: RefreshResult["changes"] | null;
  }>({ open: false, searchName: "", changes: null });

  const fetchSearches = useCallback(async () => {
    try {
      const response = await fetch("/api/saved-searches?userId=default-user");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setSearches(data.data || []);
    } catch (error) {
      console.error("Failed to fetch saved searches:", error);
      toast.error("Failed to load saved searches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSearches();
  }, [fetchSearches]);

  const handleDeleteSearch = (id: string) => {
    setSearchToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!searchToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/saved-searches?id=${searchToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      setSearches(searches.filter((search) => search.id !== searchToDelete));
      toast.success("Search deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete search");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setSearchToDelete(null);
    }
  };

  const handleRefresh = async (search: SavedSearchData) => {
    setRefreshingId(search.id);
    try {
      const response = await fetch("/api/saved-searches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: search.id,
          refresh: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to refresh");

      const data: RefreshResult & SavedSearchData = await response.json();

      // Update the search in the list
      setSearches(prev =>
        prev.map(s => (s.id === search.id ? { ...s, ...data } : s))
      );

      if (data.changes) {
        const { addedCount, removedCount } = data.changes;
        if (addedCount > 0 || removedCount > 0) {
          setChangesDialog({
            open: true,
            searchName: search.name,
            changes: data.changes,
          });
        } else {
          toast.success("No changes detected");
        }
      } else {
        toast.success("Search refreshed");
      }
    } catch (error) {
      console.error("Refresh error:", error);
      toast.error("Failed to refresh search");
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDuplicate = async (search: SavedSearchData) => {
    try {
      const response = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "default-user",
          name: `${search.name} (Copy)`,
          description: search.description,
          query: search.query,
          notifyOnChanges: false,
        }),
      });

      if (!response.ok) throw new Error("Failed to duplicate");

      const newSearch = await response.json();
      setSearches(prev => [newSearch, ...prev]);
      toast.success("Search duplicated");
    } catch (error) {
      console.error("Duplicate error:", error);
      toast.error("Failed to duplicate search");
    }
  };

  const toggleNotifications = async (search: SavedSearchData) => {
    try {
      const response = await fetch("/api/saved-searches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: search.id,
          notifyOnChanges: !search.notifyOnChanges,
        }),
      });

      if (!response.ok) throw new Error("Failed to update");

      setSearches(prev =>
        prev.map(s =>
          s.id === search.id ? { ...s, notifyOnChanges: !s.notifyOnChanges } : s
        )
      );
      toast.success(
        search.notifyOnChanges ? "Notifications disabled" : "Notifications enabled"
      );
    } catch (error) {
      console.error("Toggle error:", error);
      toast.error("Failed to update notifications");
    }
  };

  const formatLastRun = (date: string | null) => {
    if (!date) return "Never";
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  const buildCriteriaString = (query: Record<string, unknown>) => {
    const parts: string[] = [];
    if (query.state) parts.push(String(query.state));
    if (query.county) parts.push(String(query.county));
    if (query.city) parts.push(String(query.city));
    if (query.zip) parts.push(`ZIP: ${query.zip}`);
    if (query.high_equity) parts.push("High Equity");
    if (query.pre_foreclosure) parts.push("Pre-Foreclosure");
    if (query.vacant) parts.push("Vacant");
    if (query.absentee_owner) parts.push("Absentee");
    if (query.property_type) {
      const types = Array.isArray(query.property_type)
        ? query.property_type.join(", ")
        : String(query.property_type);
      parts.push(types);
    }
    return parts.join(", ") || "All properties";
  };

  const filteredSearches = filter
    ? searches.filter(
        s =>
          s.name.toLowerCase().includes(filter.toLowerCase()) ||
          s.description?.toLowerCase().includes(filter.toLowerCase())
      )
    : searches;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Search Name</TableHead>
                <TableHead>Criteria</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Results</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map(i => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-60" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Your Saved Searches</h3>
        <div className="flex items-center space-x-2">
          <Input
            className="max-w-sm"
            placeholder="Filter saved searches..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Button variant="outline" onClick={fetchSearches}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => router.push("/t/default/search")}>
            <Search className="mr-2 h-4 w-4" />
            New Search
          </Button>
        </div>
      </div>

      {filteredSearches.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h4 className="font-medium mb-2">No saved searches yet</h4>
            <p className="text-sm mb-4">
              Create a search to track property changes over time
            </p>
            <Button onClick={() => router.push("/t/default/search")}>
              Create Your First Search
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Search Name</TableHead>
                <TableHead>Criteria</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>Alerts</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSearches.map((search) => (
                <TableRow key={search.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{search.name}</span>
                      {search.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {search.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
                    {buildCriteriaString(search.query)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1 text-sm">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{formatLastRun(search.lastRunAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {search.resultCount.toLocaleString()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleNotifications(search)}
                      title={search.notifyOnChanges ? "Disable alerts" : "Enable alerts"}
                    >
                      {search.notifyOnChanges ? (
                        <Bell className="h-4 w-4 text-primary" />
                      ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRefresh(search)}
                        disabled={refreshingId === search.id}
                        title="Refresh & detect changes"
                      >
                        {refreshingId === search.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicate(search)}
                        title="Duplicate search"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSearch(search.id)}
                        title="Delete search"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Saved Search</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this saved search? This will also
              remove all tracked property IDs and change history. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Changes Detection Dialog */}
      <Dialog
        open={changesDialog.open}
        onOpenChange={(open) => setChangesDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changes Detected</DialogTitle>
            <DialogDescription>
              Changes found in &quot;{changesDialog.searchName}&quot;
            </DialogDescription>
          </DialogHeader>
          {changesDialog.changes && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">
                    {changesDialog.changes.addedCount}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-400">
                    New Properties
                  </div>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                  <TrendingDown className="h-6 w-6 mx-auto mb-2 text-red-600" />
                  <div className="text-2xl font-bold text-red-600">
                    {changesDialog.changes.removedCount}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-400">
                    Removed
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-2xl font-bold">
                    {changesDialog.changes.unchangedCount}
                  </div>
                  <div className="text-sm text-muted-foreground">Unchanged</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setChangesDialog(prev => ({ ...prev, open: false }))}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
