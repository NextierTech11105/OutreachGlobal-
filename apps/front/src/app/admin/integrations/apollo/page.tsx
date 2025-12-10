"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  AlertCircle,
  Search,
  Users,
  Building2,
  Mail,
  Phone,
  Save,
  TestTube,
  RefreshCw,
  AlertTriangle,
  Globe,
  Database,
  Sparkles,
  Upload,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { sf } from "@/lib/utils/safe-format";

interface EnrichmentResult {
  id: string;
  name: string;
  email: string;
  title: string;
  company: string;
  phone: string;
  linkedin: string;
  status: "found" | "not_found" | "pending";
  enrichedAt: string;
}

interface SearchResult {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  location: string;
}

export default function ApolloIntegrationPage() {
  const [apiKey, setApiKey] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCompany, setSearchCompany] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Enrich state
  const [enrichEmail, setEnrichEmail] = useState("");
  const [enrichDomain, setEnrichDomain] = useState("");
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentResults, setEnrichmentResults] = useState<EnrichmentResult[]>([]);

  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [csvResults, setCsvResults] = useState<any[]>([]);

  // Usage stats
  const [stats, setStats] = useState<{
    creditsUsed: number;
    creditsRemaining: number;
    searchesThisMonth: number;
    enrichmentsThisMonth: number;
  } | null>(null);

  // Load real data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/api/apollo/test");
        if (res.ok) {
          const data = await res.json();
          setIsConnected(data.configured === true);
          if (data.usage) {
            setStats({
              creditsUsed: data.usage.credits_used || 0,
              creditsRemaining: data.usage.credits_remaining || 0,
              searchesThisMonth: data.usage.searches_this_month || 0,
              enrichmentsThisMonth: data.usage.enrichments_this_month || 0,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load Apollo data:", err);
      }
    };

    loadData();
  }, []);

  const testConnection = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key first");
      return;
    }

    setIsTestingConnection(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/apollo/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Connection test failed");
      }

      setIsConnected(true);
      setSuccessMessage("Successfully connected to Apollo.io!");

      if (data.usage) {
        setStats({
          creditsUsed: data.usage.credits_used || 0,
          creditsRemaining: data.usage.credits_remaining || 0,
          searchesThisMonth: data.usage.searches_this_month || 0,
          enrichmentsThisMonth: data.usage.enrichments_this_month || 0,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection test failed");
      setIsConnected(false);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveSettings = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/apollo/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setIsConnected(true);
      setSuccessMessage("Apollo.io API key saved successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const searchPeople = async () => {
    if (!isConnected) {
      setError("Please connect to Apollo.io first");
      return;
    }

    if (!searchQuery.trim() && !searchCompany.trim() && !searchTitle.trim()) {
      setError("Please enter at least one search criteria");
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch("/api/apollo/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          company: searchCompany,
          title: searchTitle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      setSearchResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const enrichContact = async () => {
    if (!isConnected) {
      setError("Please connect to Apollo.io first");
      return;
    }

    if (!enrichEmail.trim() && !enrichDomain.trim()) {
      setError("Please enter an email or domain to enrich");
      return;
    }

    setIsEnriching(true);
    setError(null);

    try {
      const response = await fetch("/api/apollo/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: enrichEmail,
          domain: enrichDomain,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Enrichment failed");
      }

      if (data.result) {
        setEnrichmentResults([data.result, ...enrichmentResults]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrichment failed");
    } finally {
      setIsEnriching(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile || !isConnected) return;

    setIsUploadingCsv(true);
    setError(null);

    try {
      const text = await csvFile.text();
      const lines = text.split("\n").filter((l) => l.trim());
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      const contacts = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const contact: Record<string, string> = {};
        headers.forEach((h, i) => {
          if (h.includes("email")) contact.email = values[i];
          else if (h.includes("first") && h.includes("name")) contact.first_name = values[i];
          else if (h.includes("last") && h.includes("name")) contact.last_name = values[i];
          else if (h.includes("company") || h.includes("organization")) contact.organization_name = values[i];
          else if (h.includes("domain")) contact.domain = values[i];
        });
        return contact;
      }).filter((c) => c.email || c.domain);

      const response = await fetch("/api/apollo/bulk-enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Bulk enrichment failed");
      }

      setCsvResults(data.results || []);
      setSuccessMessage(`Enriched ${data.matched}/${data.total} contacts`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV upload failed");
    } finally {
      setIsUploadingCsv(false);
    }
  };

  const downloadCsvResults = () => {
    if (csvResults.length === 0) return;
    const headers = ["Name", "Email", "Title", "Company", "Phone", "LinkedIn", "Status"];
    const rows = csvResults.map((r) => [
      r.enriched?.name || "",
      r.enriched?.email || r.original?.email || "",
      r.enriched?.title || "",
      r.enriched?.company || "",
      r.enriched?.phone || "",
      r.enriched?.linkedin || "",
      r.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "enriched-contacts.csv";
    a.click();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8" />
            Apollo.io Integration
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect to Apollo.io for lead enrichment and prospecting
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="mr-1 h-3 w-3" />
              Disconnected
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="bg-green-500/10 border-green-500/20">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-500">Success</AlertTitle>
          <AlertDescription className="text-green-400">{successMessage}</AlertDescription>
        </Alert>
      )}

      {!isConnected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Not Configured</AlertTitle>
          <AlertDescription>
            Enter your Apollo.io API key below to enable lead enrichment and prospecting features.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sf(stats?.creditsUsed)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? "This billing cycle" : "Not connected"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Credits Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {sf(stats?.creditsRemaining)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? "Available" : "Not connected"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sf(stats?.searchesThisMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? "This month" : "Not connected"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Enrichments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sf(stats?.enrichmentsThisMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? "This month" : "Not connected"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Enter your Apollo.io API credentials to connect
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Apollo.io API key"
              />
              <p className="text-xs text-muted-foreground">
                Find your API key in Apollo.io Settings → Integrations → API
              </p>
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={testConnection}
                disabled={isTestingConnection || !apiKey.trim()}
                variant="outline"
              >
                {isTestingConnection ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="mr-2 h-4 w-4" />
                )}
                Test Connection
              </Button>
              <Button onClick={saveSettings} disabled={isSaving || !apiKey.trim()}>
                {isSaving ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Search and Enrich */}
      <Tabs defaultValue="search" className="w-full">
        <TabsList>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            People Search
          </TabsTrigger>
          <TabsTrigger value="enrich" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Contact Enrichment
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            CSV Upload
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Sync Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search for People</CardTitle>
              <CardDescription>
                Find leads and contacts using Apollo.io&apos;s database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Name or Keywords</Label>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g., John Smith"
                    disabled={!isConnected}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={searchCompany}
                    onChange={(e) => setSearchCompany(e.target.value)}
                    placeholder="e.g., Acme Corp"
                    disabled={!isConnected}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    placeholder="e.g., CEO, VP Sales"
                    disabled={!isConnected}
                  />
                </div>
              </div>
              <Button onClick={searchPeople} disabled={isSearching || !isConnected}>
                {isSearching ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Search People
              </Button>

              {searchResults.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.name}</TableCell>
                        <TableCell>{result.title}</TableCell>
                        <TableCell>{result.company}</TableCell>
                        <TableCell className="font-mono text-sm">{result.email || "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{result.phone || "—"}</TableCell>
                        <TableCell>{result.location}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {searchResults.length === 0 && isConnected && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No Search Results</p>
                  <p className="text-sm">
                    Enter search criteria above to find leads in Apollo.io
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrich" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enrich Contacts</CardTitle>
              <CardDescription>
                Get additional information for existing contacts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={enrichEmail}
                    onChange={(e) => setEnrichEmail(e.target.value)}
                    placeholder="contact@company.com"
                    disabled={!isConnected}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Domain</Label>
                  <Input
                    value={enrichDomain}
                    onChange={(e) => setEnrichDomain(e.target.value)}
                    placeholder="company.com"
                    disabled={!isConnected}
                  />
                </div>
              </div>
              <Button onClick={enrichContact} disabled={isEnriching || !isConnected}>
                {isEnriching ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Enrich Contact
              </Button>

              {enrichmentResults.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrichmentResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.name}</TableCell>
                        <TableCell className="font-mono text-sm">{result.email}</TableCell>
                        <TableCell>{result.title}</TableCell>
                        <TableCell>{result.company}</TableCell>
                        <TableCell className="font-mono text-sm">{result.phone || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              result.status === "found"
                                ? "bg-green-500/10 text-green-500"
                                : result.status === "not_found"
                                ? "bg-red-500/10 text-red-500"
                                : ""
                            }
                          >
                            {result.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {enrichmentResults.length === 0 && isConnected && (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No Enrichments Yet</p>
                  <p className="text-sm">
                    Enter an email or domain above to enrich contact data
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk CSV Enrichment</CardTitle>
              <CardDescription>
                Upload a CSV file to enrich contacts in bulk (from DatabaseUSA, PropWire, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <div className="space-y-2">
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                    <span className="text-primary hover:underline">Click to upload</span>
                    {" "}or drag and drop
                  </Label>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    title="Upload CSV file for bulk enrichment"
                    className="hidden"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    disabled={!isConnected}
                  />
                  <p className="text-xs text-muted-foreground">
                    CSV with columns: email, first_name, last_name, company, domain
                  </p>
                </div>
              </div>

              {csvFile && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    <span className="font-medium">{csvFile.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setCsvFile(null)}>
                      Remove
                    </Button>
                    <Button onClick={handleCsvUpload} disabled={isUploadingCsv}>
                      {isUploadingCsv ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Enrich All
                    </Button>
                  </div>
                </div>
              )}

              {csvResults.length > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {csvResults.filter((r) => r.status === "found").length} of {csvResults.length} contacts enriched
                    </p>
                    <Button variant="outline" size="sm" onClick={downloadCsvResults}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Results
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvResults.slice(0, 50).map((result, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{result.enriched?.name || "—"}</TableCell>
                          <TableCell className="font-mono text-sm">{result.enriched?.email || result.original?.email || "—"}</TableCell>
                          <TableCell>{result.enriched?.title || "—"}</TableCell>
                          <TableCell>{result.enriched?.company || "—"}</TableCell>
                          <TableCell className="font-mono text-sm">{result.enriched?.phone || "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                result.status === "found"
                                  ? "bg-green-500/10 text-green-500"
                                  : "bg-red-500/10 text-red-500"
                              }
                            >
                              {result.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {csvResults.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Showing first 50 of {csvResults.length} results. Download CSV for full results.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Settings</CardTitle>
              <CardDescription>
                Configure how Apollo.io syncs with your CRM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-enrich new leads</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically enrich new leads when they&apos;re added
                  </p>
                </div>
                <Switch defaultChecked disabled={!isConnected} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sync to CRM</Label>
                  <p className="text-xs text-muted-foreground">
                    Push enriched data back to your CRM
                  </p>
                </div>
                <Switch disabled={!isConnected} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email verification</Label>
                  <p className="text-xs text-muted-foreground">
                    Verify email addresses during enrichment
                  </p>
                </div>
                <Switch defaultChecked disabled={!isConnected} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Phone lookup</Label>
                  <p className="text-xs text-muted-foreground">
                    Find direct phone numbers when available
                  </p>
                </div>
                <Switch defaultChecked disabled={!isConnected} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
