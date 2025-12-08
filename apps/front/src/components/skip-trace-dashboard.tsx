"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Phone,
  Mail,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Zap,
  Target,
  BarChart3,
  User,
  Building2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SkipTraceResult {
  id?: string;
  input: {
    firstName?: string;
    lastName?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    propertyId?: string;
  };
  ownerName: string;
  firstName?: string;
  lastName?: string;
  phones: Array<{ number: string; type?: string; score?: number }>;
  emails: Array<{ email: string; type?: string }>;
  addresses: Array<{ street: string; city: string; state: string; zip: string; type?: string }>;
  success: boolean;
  error?: string;
}

interface SkipTraceStats {
  requested: number;
  successful: number;
  withPhones: number;
  withEmails: number;
  failed: number;
}

interface UsageInfo {
  today: number;
  limit: number;
  remaining: number;
}

type SortField = "name" | "phones" | "emails" | "status";
type SortDirection = "asc" | "desc";

export function SkipTraceDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SkipTraceResult[]>([]);
  const [stats, setStats] = useState<SkipTraceStats | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [sortField, setSortField] = useState<SortField>("status");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "failed" | "with_phones">("all");

  // Single skip trace form
  const [singleForm, setSingleForm] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  // Bulk skip trace
  const [bulkIds, setBulkIds] = useState("");

  // Load usage on mount
  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const response = await fetch("/api/skip-trace");
      const data = await response.json();
      setUsage({
        today: data.used,
        limit: data.limit,
        remaining: data.remaining,
      });
    } catch (error) {
      console.error("Failed to load usage:", error);
    }
  };

  // Single skip trace
  const handleSingleSkipTrace = async () => {
    if (!singleForm.firstName && !singleForm.lastName && !singleForm.address) {
      toast.error("Enter name or address");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/skip-trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(singleForm),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResults([data]);
      setStats({
        requested: 1,
        successful: data.success ? 1 : 0,
        withPhones: data.phones?.length > 0 ? 1 : 0,
        withEmails: data.emails?.length > 0 ? 1 : 0,
        failed: data.success ? 0 : 1,
      });
      setUsage(data.usage);

      if (data.success && data.phones?.length > 0) {
        toast.success(`Found ${data.phones.length} phone(s) for ${data.ownerName}`);
      } else if (data.success) {
        toast.info("Skip trace successful but no phone found");
      } else {
        toast.error("Skip trace failed");
      }
    } catch (error) {
      toast.error("Skip trace failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk skip trace by property IDs
  const handleBulkSkipTrace = async () => {
    const ids = bulkIds
      .split(/[\n,]/)
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      toast.error("Enter property IDs (one per line or comma-separated)");
      return;
    }

    if (ids.length > 250) {
      toast.error("Maximum 250 IDs per batch");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/skip-trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResults(data.results || []);
      setStats(data.stats);
      setUsage(data.usage);

      toast.success(
        `Skip traced ${data.stats.successful}/${data.stats.requested} - ${data.stats.withPhones} with phones`
      );
    } catch (error) {
      toast.error("Bulk skip trace failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Sort results
  const sortedResults = [...results].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "name":
        comparison = (a.ownerName || "").localeCompare(b.ownerName || "");
        break;
      case "phones":
        comparison = (b.phones?.length || 0) - (a.phones?.length || 0);
        break;
      case "emails":
        comparison = (b.emails?.length || 0) - (a.emails?.length || 0);
        break;
      case "status":
        comparison = (b.success ? 1 : 0) - (a.success ? 1 : 0);
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Filter results
  const filteredResults = sortedResults.filter((r) => {
    switch (filterStatus) {
      case "success":
        return r.success;
      case "failed":
        return !r.success;
      case "with_phones":
        return r.phones?.length > 0;
      default:
        return true;
    }
  });

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Name",
      "Phone 1",
      "Phone 2",
      "Phone 3",
      "Email",
      "Address",
      "City",
      "State",
      "Zip",
      "Status",
    ];

    const rows = results.map((r) => [
      r.ownerName || "",
      r.phones?.[0]?.number || "",
      r.phones?.[1]?.number || "",
      r.phones?.[2]?.number || "",
      r.emails?.[0]?.email || "",
      r.addresses?.[0]?.street || r.input?.address || "",
      r.addresses?.[0]?.city || r.input?.city || "",
      r.addresses?.[0]?.state || r.input?.state || "",
      r.addresses?.[0]?.zip || r.input?.zip || "",
      r.success ? "Success" : "Failed",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skip-trace-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header with Usage Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="w-6 h-6 text-blue-500" />
            Skip Trace Command Center
          </h1>
          <p className="text-muted-foreground">
            Individual or bulk skip tracing with RealEstateAPI
          </p>
        </div>

        {usage && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Today:</span>{" "}
                  <span className="font-bold">{usage.today.toLocaleString()}</span>
                  <span className="text-muted-foreground"> / {usage.limit.toLocaleString()}</span>
                </div>
                <Progress
                  value={(usage.today / usage.limit) * 100}
                  className="w-24 h-2"
                />
                <Badge variant="outline" className="text-green-400 border-green-400/50">
                  {usage.remaining.toLocaleString()} remaining
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Skip Trace Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Single Skip Trace */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Single Skip Trace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="First Name"
                value={singleForm.firstName}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, firstName: e.target.value })
                }
              />
              <Input
                placeholder="Last Name"
                value={singleForm.lastName}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, lastName: e.target.value })
                }
              />
            </div>
            <Input
              placeholder="Street Address"
              value={singleForm.address}
              onChange={(e) =>
                setSingleForm({ ...singleForm, address: e.target.value })
              }
            />
            <div className="grid grid-cols-3 gap-3">
              <Input
                placeholder="City"
                value={singleForm.city}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, city: e.target.value })
                }
              />
              <Input
                placeholder="State"
                value={singleForm.state}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, state: e.target.value })
                }
              />
              <Input
                placeholder="Zip"
                value={singleForm.zip}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, zip: e.target.value })
                }
              />
            </div>
            <Button
              onClick={handleSingleSkipTrace}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Skip Trace Now
            </Button>
          </CardContent>
        </Card>

        {/* Bulk Skip Trace */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Bulk Skip Trace (up to 250)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="w-full h-32 p-3 bg-zinc-800 border border-zinc-700 rounded-md text-sm font-mono"
              placeholder="Enter property IDs (one per line or comma-separated)&#10;&#10;Example:&#10;M1234567890&#10;M9876543210"
              value={bulkIds}
              onChange={(e) => setBulkIds(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {bulkIds.split(/[\n,]/).filter((id) => id.trim()).length} IDs entered
              </span>
              <Button
                onClick={handleBulkSkipTrace}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Target className="w-4 h-4 mr-2" />
                )}
                Bulk Skip Trace
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Summary Report */}
      {stats && (
        <Card className="bg-gradient-to-r from-zinc-900/50 to-zinc-800/50 border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-400" />
              Skip Trace Report Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
                <div className="text-3xl font-bold">{stats.requested}</div>
                <div className="text-sm text-muted-foreground">Requested</div>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <div className="text-3xl font-bold text-green-400">{stats.successful}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <div className="text-3xl font-bold text-blue-400">{stats.withPhones}</div>
                <div className="text-sm text-muted-foreground">With Phones</div>
                <div className="text-xs text-blue-300">
                  {stats.requested > 0 ? Math.round((stats.withPhones / stats.requested) * 100) : 0}% hit rate
                </div>
              </div>
              <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <div className="text-3xl font-bold text-purple-400">{stats.withEmails}</div>
                <div className="text-sm text-muted-foreground">With Emails</div>
              </div>
              <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                <div className="text-3xl font-bold text-red-400">{stats.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Skip Trace Results ({filteredResults.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={filterStatus}
                onValueChange={(v: typeof filterStatus) => setFilterStatus(v)}
              >
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="success">Successful Only</SelectItem>
                  <SelectItem value="with_phones">With Phones</SelectItem>
                  <SelectItem value="failed">Failed Only</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-zinc-800"
                    onClick={() => toggleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {sortField === "status" &&
                        (sortDirection === "desc" ? (
                          <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUp className="w-3 h-3" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-zinc-800"
                    onClick={() => toggleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      {sortField === "name" &&
                        (sortDirection === "desc" ? (
                          <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUp className="w-3 h-3" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-zinc-800"
                    onClick={() => toggleSort("phones")}
                  >
                    <div className="flex items-center gap-1">
                      Phones
                      {sortField === "phones" &&
                        (sortDirection === "desc" ? (
                          <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUp className="w-3 h-3" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-zinc-800"
                    onClick={() => toggleSort("emails")}
                  >
                    <div className="flex items-center gap-1">
                      Emails
                      {sortField === "emails" &&
                        (sortDirection === "desc" ? (
                          <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUp className="w-3 h-3" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead>Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result, index) => (
                  <TableRow key={result.id || index}>
                    <TableCell>
                      {result.success ? (
                        <Badge className="bg-green-500/20 text-green-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Success
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400">
                          <XCircle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {result.ownerName || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {result.phones?.length > 0 ? (
                        <div className="space-y-1">
                          {result.phones.slice(0, 3).map((p, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1 text-sm"
                            >
                              <Phone className="w-3 h-3 text-blue-400" />
                              <span>{p.number}</span>
                              {p.type && (
                                <Badge variant="outline" className="text-xs">
                                  {p.type}
                                </Badge>
                              )}
                            </div>
                          ))}
                          {result.phones.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{result.phones.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.emails?.length > 0 ? (
                        <div className="space-y-1">
                          {result.emails.slice(0, 2).map((e, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1 text-sm"
                            >
                              <Mail className="w-3 h-3 text-purple-400" />
                              <span className="truncate max-w-[150px]">
                                {e.email}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.addresses?.[0] ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-orange-400" />
                          <span>
                            {result.addresses[0].city}, {result.addresses[0].state}
                          </span>
                        </div>
                      ) : result.input?.city ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>
                            {result.input.city}, {result.input.state}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SkipTraceDashboard;
