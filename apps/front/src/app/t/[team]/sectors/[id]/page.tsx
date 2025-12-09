"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  Sparkles,
  Home,
  Phone,
  Mail,
  Send,
  Loader2,
  CheckCircle2,
  Building2,
  MapPin,
  Globe,
  Users,
  DollarSign,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { UniversalDetailModal } from "@/components/universal-detail-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  website?: string | null;
  industry?: string | null;
  sicCode?: string | null;
  employees?: string | null;
  revenue?: string | null;
  // Enrichment fields
  enriched?: boolean;
  enrichedPhones?: string[];
  enrichedEmails?: string[];
  ownerName?: string;
  skipTraceData?: Record<string, unknown>;
  apolloData?: Record<string, unknown>;
}

interface DataLake {
  id: string;
  name: string;
  description?: string;
  source: string;
  totalLeads: number;
  enrichedLeads: number;
  contactedLeads: number;
  properties?: Lead[];
  metadata?: {
    stats?: {
      total: number;
      withPhone: number;
      withEmail: number;
      withAddress: number;
    };
  };
}

export default function SectorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectorId = params.id as string;
  const action = searchParams.get("action");

  const [dataLake, setDataLake] = useState<DataLake | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100; // 100 per page

  // Daily skip trace limit (2000/day)
  const DAILY_SKIP_TRACE_LIMIT = 2000;
  const [dailySkipTraceCount, setDailySkipTraceCount] = useState(0);

  // Enrichment state
  const [enriching, setEnriching] = useState(false);
  const [enrichType, setEnrichType] = useState<"skip_trace" | "apollo" | null>(null);
  const [enrichProgress, setEnrichProgress] = useState({ processed: 0, total: 0, success: 0, failed: 0 });
  const [showEnrichDialog, setShowEnrichDialog] = useState(false);

  // SMS state
  const [showSmsDialog, setShowSmsDialog] = useState(action === "sms");
  const [smsMessage, setSmsMessage] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [smsProgress, setSmsProgress] = useState<{ sent: number; failed: number; total: number } | null>(null);

  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Load daily skip trace count from localStorage
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const storedData = localStorage.getItem("skipTraceDaily");
    if (storedData) {
      const { date, count } = JSON.parse(storedData);
      if (date === today) {
        setDailySkipTraceCount(count);
      } else {
        // Reset for new day
        localStorage.setItem("skipTraceDaily", JSON.stringify({ date: today, count: 0 }));
        setDailySkipTraceCount(0);
      }
    }
  }, []);

  // Update daily count in localStorage
  const updateDailyCount = (newCount: number) => {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem("skipTraceDaily", JSON.stringify({ date: today, count: newCount }));
    setDailySkipTraceCount(newCount);
  };

  // Get enrichable records (have address but not yet enriched)
  const getEnrichableRecords = () => {
    return leads.filter((l) => l.address && l.city && l.state && !l.enriched);
  };

  // Select all enrichable on current page
  const selectAllEnrichable = () => {
    const enrichable = paginatedLeads.filter((l) => l.address && l.city && l.state && !l.enriched);
    setSelectedIds(new Set(enrichable.map((l) => l.id)));
  };

  // Select first N enrichable across all records
  const selectBulkEnrichable = (count: number) => {
    const enrichable = getEnrichableRecords().slice(0, count);
    setSelectedIds(new Set(enrichable.map((l) => l.id)));
  };

  // Fetch data lake
  useEffect(() => {
    async function fetchDataLake() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/buckets/${sectorId}`);
        const data = await response.json();

        if (data.error) {
          toast.error(data.error);
          return;
        }

        setDataLake(data);
        setLeads(data.properties || []);
      } catch (error) {
        console.error("Failed to fetch data lake:", error);
        toast.error("Failed to load data lake");
      } finally {
        setIsLoading(false);
      }
    }

    if (sectorId) {
      fetchDataLake();
    }
  }, [sectorId]);

  // Filter leads by search
  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.companyName?.toLowerCase().includes(q) ||
      lead.contactName?.toLowerCase().includes(q) ||
      lead.email?.toLowerCase().includes(q) ||
      lead.phone?.includes(q) ||
      lead.city?.toLowerCase().includes(q) ||
      lead.state?.toLowerCase().includes(q)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedLeads.map((l) => l.id)));
    }
  };

  // Skip Trace Enrichment (RealEstateAPI)
  const handleSkipTrace = async () => {
    const selected = leads.filter((l) => selectedIds.has(l.id) && l.address && l.city && l.state && !l.enriched);
    if (selected.length === 0) {
      toast.error("No selected records have addresses for skip tracing");
      return;
    }

    // Check daily limit
    const remaining = DAILY_SKIP_TRACE_LIMIT - dailySkipTraceCount;
    if (remaining <= 0) {
      toast.error(`Daily limit reached (${DAILY_SKIP_TRACE_LIMIT}/day). Try again tomorrow.`);
      return;
    }

    // Limit to remaining daily quota
    const toProcess = selected.slice(0, remaining);
    if (toProcess.length < selected.length) {
      toast.warning(`Processing ${toProcess.length} of ${selected.length} (daily limit: ${remaining} remaining)`);
    }

    setEnriching(true);
    setEnrichType("skip_trace");
    setEnrichProgress({ processed: 0, total: toProcess.length, success: 0, failed: 0 });
    setShowEnrichDialog(true);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < toProcess.length; i += 10) {
      const batch = toProcess.slice(i, i + 10); // Process 10 at a time for speed

      const results = await Promise.all(
        batch.map(async (lead) => {
          try {
            const response = await fetch("/api/skip-trace", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                address: lead.address,
                city: lead.city,
                state: lead.state,
                zip: lead.zip,
                lastName: lead.contactName?.split(" ").pop() || lead.companyName,
              }),
            });

            const data = await response.json();
            if (data.success) {
              return {
                leadId: lead.id,
                success: true,
                phones: data.phones?.map((p: { number: string }) => p.number) || [],
                emails: data.emails?.map((e: { email: string }) => e.email) || [],
                ownerName: data.ownerName,
              };
            }
            return { leadId: lead.id, success: false };
          } catch {
            return { leadId: lead.id, success: false };
          }
        })
      );

      // Update leads with results
      setLeads((prev) =>
        prev.map((lead) => {
          const result = results.find((r) => r.leadId === lead.id);
          if (result?.success) {
            success++;
            return {
              ...lead,
              enriched: true,
              enrichedPhones: result.phones,
              enrichedEmails: result.emails,
              ownerName: result.ownerName,
            };
          }
          if (result) failed++;
          return lead;
        })
      );

      setEnrichProgress({
        processed: Math.min(i + 10, toProcess.length),
        total: toProcess.length,
        success,
        failed,
      });

      if (i + 10 < toProcess.length) {
        await new Promise((r) => setTimeout(r, 300)); // Faster processing
      }
    }

    // Update daily count
    updateDailyCount(dailySkipTraceCount + success);

    setEnriching(false);
    toast.success(`Skip trace complete: ${success} enriched, ${failed} failed. Daily: ${dailySkipTraceCount + success}/${DAILY_SKIP_TRACE_LIMIT}`);
  };

  // Apollo Enrichment
  const handleApolloEnrich = async () => {
    const selected = leads.filter((l) => selectedIds.has(l.id) && (l.companyName || l.website));
    if (selected.length === 0) {
      toast.error("No selected records have company names or websites for Apollo enrichment");
      return;
    }

    setEnriching(true);
    setEnrichType("apollo");
    setEnrichProgress({ processed: 0, total: selected.length, success: 0, failed: 0 });
    setShowEnrichDialog(true);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < selected.length; i += 5) {
      const batch = selected.slice(i, i + 5);

      const results = await Promise.all(
        batch.map(async (lead) => {
          try {
            // Use Apollo people search by company
            const response = await fetch("/api/business-list/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                company_name: lead.companyName ? [lead.companyName] : undefined,
                company_domain: lead.website ? [lead.website.replace(/^https?:\/\//, "")] : undefined,
                state: lead.state ? [lead.state] : undefined,
              }),
            });

            const data = await response.json();
            if (data.hits && data.hits.length > 0) {
              const apolloData = data.hits[0];
              return {
                leadId: lead.id,
                success: true,
                apolloData,
                phone: apolloData.phone,
                email: apolloData.email,
                linkedin: apolloData.linkedin_url,
              };
            }
            return { leadId: lead.id, success: false };
          } catch {
            return { leadId: lead.id, success: false };
          }
        })
      );

      // Update leads with results
      setLeads((prev) =>
        prev.map((lead) => {
          const result = results.find((r) => r.leadId === lead.id);
          if (result?.success) {
            success++;
            return {
              ...lead,
              enriched: true,
              apolloData: result.apolloData,
              enrichedPhones: result.phone ? [result.phone] : lead.enrichedPhones,
              enrichedEmails: result.email ? [result.email] : lead.enrichedEmails,
            };
          }
          if (result) failed++;
          return lead;
        })
      );

      setEnrichProgress({
        processed: Math.min(i + 5, selected.length),
        total: selected.length,
        success,
        failed,
      });

      if (i + 5 < selected.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setEnriching(false);
    toast.success(`Apollo enrichment complete: ${success} enriched, ${failed} failed`);
  };

  // Send SMS
  const handleSendSms = async () => {
    const phonesToSms: string[] = [];
    leads.filter((l) => selectedIds.has(l.id)).forEach((lead) => {
      if (lead.phone) phonesToSms.push(lead.phone);
      if (lead.enrichedPhones) phonesToSms.push(...lead.enrichedPhones);
    });

    const uniquePhones = [...new Set(phonesToSms)].filter((p) => p && p.length > 5);

    if (uniquePhones.length === 0) {
      toast.error("No phone numbers in selected records");
      return;
    }

    if (!smsMessage.trim()) {
      toast.error("Enter a message to send");
      return;
    }

    setSendingSms(true);
    setSmsProgress({ sent: 0, failed: 0, total: uniquePhones.length });

    try {
      const response = await fetch("/api/signalhouse/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: uniquePhones,
          message: smsMessage,
          campaignId: `sector-${sectorId}-${Date.now()}`,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        setSmsProgress(null);
        return;
      }

      setSmsProgress({
        sent: data.sent || 0,
        failed: data.failed || 0,
        total: uniquePhones.length,
      });

      toast.success(`SMS sent! ${data.sent} delivered`);

      setTimeout(() => {
        setShowSmsDialog(false);
        setSmsMessage("");
        setSmsProgress(null);
      }, 2000);
    } catch (error) {
      console.error("SMS failed:", error);
      toast.error("Failed to send SMS");
      setSmsProgress(null);
    } finally {
      setSendingSms(false);
    }
  };

  // Get phone count
  const getPhoneCount = () => {
    const phones: string[] = [];
    leads.filter((l) => selectedIds.has(l.id)).forEach((lead) => {
      if (lead.phone) phones.push(lead.phone);
      if (lead.enrichedPhones) phones.push(...lead.enrichedPhones);
    });
    return new Set(phones.filter((p) => p && p.length > 5)).size;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dataLake) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Data lake not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{dataLake.name}</h2>
              <p className="text-muted-foreground">
                {dataLake.description || `${dataLake.totalLeads.toLocaleString()} records`}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{dataLake.totalLeads.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">
                {dataLake.metadata?.stats?.withPhone?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">With Phones</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">
                {dataLake.metadata?.stats?.withEmail?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">With Emails</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">
                {dataLake.metadata?.stats?.withAddress?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">Enrichable</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-orange-600">
                {leads.filter((l) => l.enriched).length.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Enriched</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* BULK SELECTION */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllEnrichable}
              disabled={enriching}
            >
              Select Page ({paginatedLeads.filter((l) => l.address && l.city && l.state && !l.enriched).length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectBulkEnrichable(100)}
              disabled={enriching}
            >
              Select 100
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectBulkEnrichable(500)}
              disabled={enriching}
            >
              Select 500
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectBulkEnrichable(1000)}
              disabled={enriching}
            >
              Select 1K
            </Button>
          </div>

          {/* Daily Limit Badge */}
          <Badge variant={dailySkipTraceCount >= DAILY_SKIP_TRACE_LIMIT ? "destructive" : "secondary"} className="px-3 py-1">
            {dailySkipTraceCount.toLocaleString()}/{DAILY_SKIP_TRACE_LIMIT.toLocaleString()} today
          </Badge>
        </div>

        {/* ENRICHMENT BUTTONS */}
        <div className="flex items-center gap-4 flex-wrap">
          <Button
            onClick={handleSkipTrace}
            disabled={enriching || selectedIds.size === 0 || dailySkipTraceCount >= DAILY_SKIP_TRACE_LIMIT}
            variant="outline"
            className="border-purple-500 text-purple-600 hover:bg-purple-50"
          >
            <Home className="h-4 w-4 mr-2" />
            Skip Trace ({selectedIds.size})
          </Button>

          <Button
            onClick={handleApolloEnrich}
            disabled={enriching || selectedIds.size === 0}
            variant="outline"
            className="border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Apollo Enrich ({selectedIds.size})
          </Button>

          <Button
            onClick={() => setShowSmsDialog(true)}
            disabled={selectedIds.size === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4 mr-2" />
            SMS ({getPhoneCount()})
          </Button>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={paginatedLeads.length > 0 && selectedIds.size === paginatedLeads.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead>Company / Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No matching records" : "No records in this data lake"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLeads.map((lead) => (
                  <TableRow key={lead.id} className={lead.enriched ? "bg-green-50 dark:bg-green-900/10" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10"
                        onClick={() => {
                          setSelectedLead(lead);
                          setDetailModalOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{lead.companyName || "-"}</div>
                      {lead.contactName && (
                        <div className="text-sm text-muted-foreground">{lead.contactName}</div>
                      )}
                      {lead.ownerName && (
                        <div className="text-xs text-purple-600">Owner: {lead.ownerName}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.enrichedPhones && lead.enrichedPhones.length > 0 ? (
                        <div className="space-y-1">
                          {lead.enrichedPhones.slice(0, 2).map((p, i) => (
                            <div key={i} className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-green-600" />
                              <a href={`tel:${p}`} className="text-blue-600 hover:underline">
                                {p}
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : lead.phone ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{lead.phone}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.enrichedEmails && lead.enrichedEmails.length > 0 ? (
                        <div className="text-sm">
                          <Mail className="h-3 w-3 text-green-600 inline mr-1" />
                          <a href={`mailto:${lead.enrichedEmails[0]}`} className="text-blue-600 hover:underline">
                            {lead.enrichedEmails[0]}
                          </a>
                        </div>
                      ) : lead.email ? (
                        <div className="text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground inline mr-1" />
                          {lead.email}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.city && lead.state ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {lead.city}, {lead.state}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{lead.industry || lead.sicCode || "-"}</span>
                    </TableCell>
                    <TableCell>
                      {lead.enriched ? (
                        <Badge className="bg-green-600">Enriched</Badge>
                      ) : lead.address ? (
                        <Badge variant="outline">Pending</Badge>
                      ) : (
                        <Badge variant="secondary">No Address</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredLeads.length)} of {filteredLeads.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Enrichment Progress Dialog */}
      <Dialog open={showEnrichDialog} onOpenChange={setShowEnrichDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {enrichType === "skip_trace" ? (
                <>
                  <Home className="h-5 w-5 text-purple-600" />
                  Skip Trace (RealEstateAPI)
                </>
              ) : (
                <>
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Apollo Enrichment
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Progress value={(enrichProgress.processed / enrichProgress.total) * 100} />
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xl font-bold">{enrichProgress.processed}</div>
                <div className="text-xs text-muted-foreground">Processed</div>
              </div>
              <div>
                <div className="text-xl font-bold">{enrichProgress.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">{enrichProgress.success}</div>
                <div className="text-xs text-muted-foreground">Success</div>
              </div>
              <div>
                <div className="text-xl font-bold text-red-600">{enrichProgress.failed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnrichDialog(false)} disabled={enriching}>
              {enriching ? "Processing..." : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMS Dialog */}
      <Dialog open={showSmsDialog} onOpenChange={setShowSmsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-green-600" />
              Send SMS via SignalHouse
            </DialogTitle>
            <DialogDescription>
              Sending to {getPhoneCount()} phone numbers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => setSmsMessage("Hi! Quick question about your business - are you looking for [service]? Reply YES for more info.")}>
                Intro
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSmsMessage("Hey! We help businesses like yours with [solution]. Open to a quick chat? Reply with a good time.")}>
                Casual
              </Button>
            </div>
            <textarea
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full min-h-[100px] p-3 rounded-md border bg-background"
              maxLength={160}
            />
            <div className="text-xs text-muted-foreground">{smsMessage.length}/160</div>
            {smsProgress && (
              <div className="grid grid-cols-3 gap-4 text-center p-4 bg-muted rounded-lg">
                <div>
                  <div className="text-xl font-bold text-green-600">{smsProgress.sent}</div>
                  <div className="text-xs">Sent</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-red-600">{smsProgress.failed}</div>
                  <div className="text-xs">Failed</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{smsProgress.total}</div>
                  <div className="text-xs">Total</div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSmsDialog(false)} disabled={sendingSms}>
              Cancel
            </Button>
            <Button onClick={handleSendSms} disabled={sendingSms || !smsMessage.trim()} className="bg-green-600 hover:bg-green-700">
              {sendingSms ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Universal Detail Modal - Context-aware record display */}
      <UniversalDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        record={selectedLead ? {
          // Map lead fields to universal format for context detection
          ...selectedLead,
          // B2B context indicators
          company: selectedLead.companyName,
          industry: selectedLead.industry,
          employees: selectedLead.employees,
          revenue: selectedLead.revenue,
          website: selectedLead.website,
          // Contact info
          firstName: selectedLead.contactName?.split(" ")[0],
          lastName: selectedLead.contactName?.split(" ").slice(1).join(" "),
          phone: selectedLead.phone || selectedLead.enrichedPhones?.[0],
          email: selectedLead.email || selectedLead.enrichedEmails?.[0],
          // Address for skip trace
          address: selectedLead.address,
          city: selectedLead.city,
          state: selectedLead.state,
          zip: selectedLead.zip,
          // Enrichment data
          apolloData: selectedLead.apolloData,
          skipTraceData: selectedLead.skipTraceData,
        } : null}
        recordType={selectedLead?.industry || selectedLead?.sicCode ? "b2b-company" : "lead"}
        onAction={(action, data) => {
          console.log("[SectorDetail] Action:", action, data);
          if (action === "add-lead") {
            toast.success("Lead added to pipeline");
          } else if (action === "add-campaign") {
            toast.success(`Added to ${data.campaignType} campaign`);
          }
        }}
      />
    </div>
  );
}
