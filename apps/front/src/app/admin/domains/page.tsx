"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Globe,
  Plus,
  Copy,
  RefreshCw,
  Trash2,
  ExternalLink,
  Mail,
  Server,
  FileText,
  CheckCheck,
  XCircle,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Domain configuration types
interface DnsRecord {
  type: "A" | "CNAME" | "TXT" | "MX";
  name: string;
  value: string;
  purpose: string;
  verified?: boolean;
}

interface DomainConfig {
  id: string;
  domain: string;
  type: "app" | "email" | "marketing";
  target?: string;
  verified: boolean;
  dnsRecords: DnsRecord[];
}

// Pre-configured domains for Nextier
const DEFAULT_DOMAINS: DomainConfig[] = [
  {
    id: "1",
    domain: "nxtier.ai",
    type: "marketing",
    verified: false,
    dnsRecords: [
      {
        type: "A",
        name: "@",
        value: "(your hosting IP)",
        purpose: "Main marketing site (www.nxtier.ai is primary)",
      },
      {
        type: "CNAME",
        name: "www",
        value: "nxtier.ai",
        purpose: "WWW redirect (primary domain: www.nxtier.ai)",
      },
    ],
  },
  {
    id: "2",
    domain: "app.nxtier.ai",
    type: "app",
    target: "monkfish-app-mb7h3.ondigitalocean.app",
    verified: false,
    dnsRecords: [
      {
        type: "CNAME",
        name: "app",
        value: "monkfish-app-mb7h3.ondigitalocean.app",
        purpose: "NXTIER app (DigitalOcean)",
      },
    ],
  },
  {
    id: "3",
    domain: "outreachglobal.io",
    type: "email",
    verified: false,
    dnsRecords: [
      {
        type: "TXT",
        name: "@",
        value: "v=spf1 include:_spf.google.com include:amazonses.com ~all",
        purpose: "SPF - Email authentication",
      },
      {
        type: "TXT",
        name: "_dmarc",
        value: "v=DMARC1; p=none; rua=mailto:dmarc@outreachglobal.io",
        purpose: "DMARC - Email policy",
      },
      {
        type: "TXT",
        name: "resend._domainkey",
        value: "(Get from Resend dashboard)",
        purpose: "DKIM - Email signing",
      },
    ],
  },
];

export default function DomainsAdminPage() {
  const [domains, setDomains] = useState<DomainConfig[]>(DEFAULT_DOMAINS);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState({
    domain: "",
    type: "app" as "app" | "email" | "marketing",
  });

  // Copy to clipboard
  const copyToClipboard = async (text: string, recordId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedRecord(recordId);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  // Verify DNS records using Google DNS API
  const verifyDomain = async (domainId: string) => {
    setVerifying(domainId);
    const domain = domains.find((d) => d.id === domainId);
    if (!domain) return;

    try {
      const response = await fetch("/api/admin/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.domain, records: domain.dnsRecords }),
      });

      const data = await response.json();

      // Update domain with verification results
      setDomains((prev) =>
        prev.map((d) =>
          d.id === domainId
            ? {
                ...d,
                verified: data.allVerified,
                dnsRecords: d.dnsRecords.map((r, i) => ({
                  ...r,
                  verified: data.results?.[i]?.verified ?? false,
                })),
              }
            : d
        )
      );
    } catch (error) {
      console.error("Verification failed:", error);
    } finally {
      setVerifying(null);
    }
  };

  // Add new domain
  const handleAddDomain = () => {
    if (!newDomain.domain) return;

    const dnsRecords: DnsRecord[] = [];

    if (newDomain.type === "app") {
      dnsRecords.push({
        type: "CNAME",
        name: newDomain.domain.split(".")[0],
        value: "monkfish-app-mb7h3.ondigitalocean.app",
        purpose: "App subdomain (DigitalOcean)",
      });
    } else if (newDomain.type === "email") {
      dnsRecords.push(
        {
          type: "TXT",
          name: "@",
          value: "v=spf1 include:_spf.google.com include:amazonses.com ~all",
          purpose: "SPF - Email authentication",
        },
        {
          type: "TXT",
          name: "_dmarc",
          value: `v=DMARC1; p=none; rua=mailto:dmarc@${newDomain.domain}`,
          purpose: "DMARC - Email policy",
        }
      );
    } else {
      dnsRecords.push({
        type: "A",
        name: "@",
        value: "(your hosting IP)",
        purpose: "Marketing site",
      });
    }

    setDomains((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        domain: newDomain.domain,
        type: newDomain.type,
        verified: false,
        dnsRecords,
      },
    ]);

    setNewDomain({ domain: "", type: "app" });
    setAddDialogOpen(false);
  };

  // Remove domain
  const removeDomain = (domainId: string) => {
    setDomains((prev) => prev.filter((d) => d.id !== domainId));
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "app":
        return <Server className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "marketing":
        return <Globe className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  // Get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "app":
        return "App Domain";
      case "email":
        return "Email Domain";
      case "marketing":
        return "Marketing Site";
      default:
        return "Domain";
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8" />
            Domain Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure custom domains for your app, email, and marketing sites
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Domain</DialogTitle>
              <DialogDescription>
                Configure a new domain for your platform
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Domain Name</Label>
                <Input
                  placeholder="app.example.com"
                  value={newDomain.domain}
                  onChange={(e) =>
                    setNewDomain((prev) => ({ ...prev, domain: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Domain Type</Label>
                <Select
                  value={newDomain.type}
                  onValueChange={(value: "app" | "email" | "marketing") =>
                    setNewDomain((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="app">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        App Domain (CNAME to DO)
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Domain (SPF/DKIM/DMARC)
                      </div>
                    </SelectItem>
                    <SelectItem value="marketing">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Marketing Site
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddDomain} disabled={!newDomain.domain}>
                Add Domain
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              Total Domains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{domains.length}</div>
            <p className="text-xs text-muted-foreground">Configured</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {domains.filter((d) => d.verified).length}
            </div>
            <p className="text-xs text-muted-foreground">DNS configured</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4 text-purple-500" />
              App Domains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {domains.filter((d) => d.type === "app").length}
            </div>
            <p className="text-xs text-muted-foreground">For Nextier app</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-yellow-500" />
              Email Domains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {domains.filter((d) => d.type === "email").length}
            </div>
            <p className="text-xs text-muted-foreground">For sending</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="domains">
        <TabsList className="mb-6">
          <TabsTrigger value="domains" className="gap-2">
            <Globe className="h-4 w-4" />
            Domains
          </TabsTrigger>
          <TabsTrigger value="dns" className="gap-2">
            <FileText className="h-4 w-4" />
            All DNS Records
          </TabsTrigger>
          <TabsTrigger value="help" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Setup Guide
          </TabsTrigger>
        </TabsList>

        {/* Domains Tab */}
        <TabsContent value="domains">
          <div className="grid gap-4">
            {domains.map((domain) => (
              <Card key={domain.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(domain.type)}
                      <div>
                        <CardTitle className="text-lg">{domain.domain}</CardTitle>
                        <CardDescription>{getTypeLabel(domain.type)}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {domain.verified ? (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {domain.target && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Points to: <code className="bg-muted px-1 rounded">{domain.target}</code>
                    </p>
                  )}

                  {/* DNS Records Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Type</TableHead>
                        <TableHead className="w-[150px]">Name</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {domain.dnsRecords.map((record, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant="outline">{record.type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {record.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded max-w-[400px] truncate block">
                                {record.value}
                              </code>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {record.purpose}
                            </p>
                          </TableCell>
                          <TableCell>
                            {record.verified ? (
                              <CheckCheck className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(record.value, `${domain.id}-${idx}`)
                              }
                            >
                              {copiedRecord === `${domain.id}-${idx}` ? (
                                <CheckCheck className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => verifyDomain(domain.id)}
                      disabled={verifying === domain.id}
                    >
                      {verifying === domain.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Verify DNS
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDomain(domain.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* All DNS Records Tab */}
        <TabsContent value="dns">
          <Card>
            <CardHeader>
              <CardTitle>All Required DNS Records</CardTitle>
              <CardDescription>
                Copy these records to your DNS provider (GoDaddy, Cloudflare, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead className="w-[80px]">Type</TableHead>
                    <TableHead className="w-[150px]">Name</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.flatMap((domain) =>
                    domain.dnsRecords.map((record, idx) => (
                      <TableRow key={`${domain.id}-${idx}`}>
                        <TableCell className="font-medium">
                          {domain.domain}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {record.name}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {record.value}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(record.value, `all-${domain.id}-${idx}`)
                            }
                          >
                            {copiedRecord === `all-${domain.id}-${idx}` ? (
                              <CheckCheck className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const allRecords = domains
                      .flatMap((d) =>
                        d.dnsRecords.map(
                          (r) => `${r.type}\t${r.name}\t${r.value}`
                        )
                      )
                      .join("\n");
                    copyToClipboard(allRecords, "all-records");
                  }}
                >
                  {copiedRecord === "all-records" ? (
                    <CheckCheck className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copy All Records
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Setup Guide Tab */}
        <TabsContent value="help">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Setup App Domain (app.nextierglobal.ai)</CardTitle>
                <CardDescription>
                  Point your subdomain to DigitalOcean App Platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Add Domain in DigitalOcean</p>
                      <p className="text-sm text-muted-foreground">
                        Go to Apps → monkfish-app → Settings → Domains → Add Domain
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Add CNAME Record</p>
                      <p className="text-sm text-muted-foreground">
                        In your DNS provider, add:
                      </p>
                      <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
                        CNAME app → monkfish-app-mb7h3.ondigitalocean.app
                      </code>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Wait for DNS Propagation</p>
                      <p className="text-sm text-muted-foreground">
                        Usually takes 5-15 minutes, can take up to 48 hours
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      4
                    </div>
                    <div>
                      <p className="font-medium">Verify</p>
                      <p className="text-sm text-muted-foreground">
                        Click "Verify DNS" above to check if it's working
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button asChild variant="outline" className="w-full">
                    <a
                      href="https://cloud.digitalocean.com/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open DigitalOcean Apps
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Setup Email Domain</CardTitle>
                <CardDescription>
                  Configure SPF, DKIM, and DMARC for email sending
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Add Domain in Resend</p>
                      <p className="text-sm text-muted-foreground">
                        Go to Resend → Domains → Add Domain
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Copy DNS Records from Resend</p>
                      <p className="text-sm text-muted-foreground">
                        Resend will show you the exact TXT records to add
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Add TXT Records</p>
                      <p className="text-sm text-muted-foreground">
                        Add SPF, DKIM, and DMARC records to your DNS
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      4
                    </div>
                    <div>
                      <p className="font-medium">Verify in Resend</p>
                      <p className="text-sm text-muted-foreground">
                        Click "Verify" in Resend dashboard
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button asChild variant="outline" className="w-full">
                    <a
                      href="https://resend.com/domains"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Resend Domains
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* DNS Provider Quick Links */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Quick Links - DNS Providers</CardTitle>
                <CardDescription>
                  Go directly to your DNS provider to add records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <Button asChild variant="outline">
                    <a
                      href="https://dcc.godaddy.com/manage"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      GoDaddy DNS
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a
                      href="https://dash.cloudflare.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Cloudflare
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a
                      href="https://ap.www.namecheap.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Namecheap
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a
                      href="https://cloud.digitalocean.com/networking/domains"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      DigitalOcean DNS
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
