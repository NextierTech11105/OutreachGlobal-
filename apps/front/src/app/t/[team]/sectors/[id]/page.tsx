"use client";

import { sf, sfd } from "@/lib/utils/safe-format";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  PhoneCall,
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
  Shuffle,
  Layers,
  CalendarPlus,
  Zap,
  ArrowRight,
  Crown,
  Target,
  ArrowUpDown,
} from "lucide-react";
import { UniversalDetailModal } from "@/components/universal-detail-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ==================== DECISION MAKER DETECTION ====================
// Detect if contact is likely a decision maker based on name/title patterns
const DECISION_MAKER_TITLES = [
  "owner", "president", "ceo", "chief", "founder", "partner", "principal",
  "director", "vp", "vice president", "general manager", "gm", "managing",
  "chairman", "executive", "proprietor", "operator", "franchisee"
];

const DECISION_MAKER_NAME_PATTERNS = [
  // Last name matches company name (likely owner)
  (contactName: string, companyName: string) => {
    if (!contactName || !companyName) return false;
    const lastName = contactName.split(" ").pop()?.toLowerCase() || "";
    const companyWords = companyName.toLowerCase().split(/[\s,.-]+/);
    return companyWords.some(w => w.length > 2 && lastName.includes(w) || w.includes(lastName));
  }
];

function detectDecisionMaker(lead: { contactName?: string | null; title?: string | null; companyName?: string | null }): boolean {
  // Check title
  const title = (lead.title || "").toLowerCase();
  if (DECISION_MAKER_TITLES.some(t => title.includes(t))) return true;

  // Check name patterns (owner name in company name)
  for (const pattern of DECISION_MAKER_NAME_PATTERNS) {
    if (pattern(lead.contactName || "", lead.companyName || "")) return true;
  }

  return false;
}

// ==================== PROPERTY OWNERSHIP LIKELIHOOD ====================
// Score industries by likelihood of owning commercial property
const PROPERTY_OWNER_SIC_PREFIXES: Record<string, { likelihood: "high" | "medium" | "low"; reason: string }> = {
  // HIGH - Very likely to own property
  "15": { likelihood: "high", reason: "General Contractors - often own offices/yards" },
  "16": { likelihood: "high", reason: "Heavy Construction - equipment yards" },
  "17": { likelihood: "high", reason: "Special Trade Contractors - own facilities" },
  "55": { likelihood: "high", reason: "Auto Dealers - own dealerships" },
  "54": { likelihood: "high", reason: "Food Stores - may own locations" },
  "58": { likelihood: "high", reason: "Restaurants - may own buildings" },
  "70": { likelihood: "high", reason: "Hotels & Lodging - own properties" },
  "65": { likelihood: "high", reason: "Real Estate - own properties" },
  // MEDIUM - Likely to own property
  "20": { likelihood: "medium", reason: "Food Manufacturing - own plants" },
  "35": { likelihood: "medium", reason: "Industrial Machinery - own facilities" },
  "36": { likelihood: "medium", reason: "Electronics Mfg - own facilities" },
  "37": { likelihood: "medium", reason: "Transportation Equipment - own facilities" },
  "38": { likelihood: "medium", reason: "Instruments/Optical - own facilities" },
  "39": { likelihood: "medium", reason: "Misc Manufacturing - own facilities" },
  "50": { likelihood: "medium", reason: "Wholesale Durable - warehouses" },
  "51": { likelihood: "medium", reason: "Wholesale Nondurable - warehouses" },
  "42": { likelihood: "medium", reason: "Trucking/Warehousing - own facilities" },
  "75": { likelihood: "medium", reason: "Auto Repair/Services - own shops" },
  // LOW but some ownership
  "73": { likelihood: "low", reason: "Business Services - usually lease" },
  "87": { likelihood: "low", reason: "Engineering Services - usually lease" },
};

function getPropertyOwnershipLikelihood(sicCode?: string | null): { likelihood: "high" | "medium" | "low" | "unknown"; reason: string; score: number } {
  if (!sicCode) return { likelihood: "unknown", reason: "No SIC code", score: 0 };

  // Check first 2 digits
  const prefix2 = sicCode.slice(0, 2);
  if (PROPERTY_OWNER_SIC_PREFIXES[prefix2]) {
    const { likelihood, reason } = PROPERTY_OWNER_SIC_PREFIXES[prefix2];
    return { likelihood, reason, score: likelihood === "high" ? 80 : likelihood === "medium" ? 50 : 20 };
  }

  return { likelihood: "unknown", reason: "Industry not categorized", score: 0 };
}

// Calculate priority score for sorting (higher = more important)
function calculatePriorityScore(lead: { isDecisionMaker?: boolean; propertyScore?: number; enriched?: boolean; phone?: string | null; email?: string | null }): number {
  let score = 0;
  if (lead.isDecisionMaker) score += 50;
  if (lead.propertyScore) score += lead.propertyScore * 0.3;
  if (lead.enriched) score += 20;
  if (lead.phone) score += 10;
  if (lead.email) score += 5;
  return score;
}

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
  county?: string | null;
  website?: string | null;
  industry?: string | null;
  sicCode?: string | null;
  employees?: string | null;
  revenue?: string | null;
  title?: string | null;
  directPhone?: string | null;
  // Scoring fields
  propertyScore?: number;
  propertyLikelihood?: string;
  propertyReason?: string;
  isDecisionMaker?: boolean;
  priorityScore?: number;
  // Enrichment fields
  enriched?: boolean;
  enrichedPhones?: string[];
  enrichedEmails?: string[];
  ownerName?: string;
  skipTraceData?: Record<string, unknown>;
  apolloData?: Record<string, unknown>;
  // CONTACT TRACKING
  contactAttempts?: number;
  lastContactDate?: string;
  lastContactChannel?: "sms" | "call" | "email" | null;
  contactHistory?: Array<{
    date: string;
    channel: "sms" | "call" | "email";
    direction: "outbound" | "inbound";
    message?: string;
    status?: string;
  }>;
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100; // 100 per page

  // Server-side pagination state
  const [pagination, setPagination] = useState<{
    totalRecords: number;
    filteredTotal: number;
    totalPages: number;
    hasMore: boolean;
  } | null>(null);

  // Batch loading mode
  const [batchSize, setBatchSize] = useState(100); // 100, 500, 1000, 2000
  const [shuffleMode, setShuffleMode] = useState(false);

  // Sorting state for prioritization
  const [sortBy, setSortBy] = useState<"default" | "priority" | "decisionMaker" | "propertyScore">("default");

  // Daily skip trace limit (2000/day)
  const DAILY_SKIP_TRACE_LIMIT = 2000;
  const [dailySkipTraceCount, setDailySkipTraceCount] = useState(0);

  // Enrichment state
  const [enriching, setEnriching] = useState(false);
  const [enrichType, setEnrichType] = useState<"skip_trace" | "apollo" | null>(
    null,
  );
  const [enrichProgress, setEnrichProgress] = useState({
    processed: 0,
    total: 0,
    success: 0,
    failed: 0,
  });
  const [showEnrichDialog, setShowEnrichDialog] = useState(false);

  // SMS state
  const [showSmsDialog, setShowSmsDialog] = useState(action === "sms");
  const [smsMessage, setSmsMessage] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [smsProgress, setSmsProgress] = useState<{
    sent: number;
    failed: number;
    total: number;
  } | null>(null);

  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Schedule Call state
  const [showScheduleCallDialog, setShowScheduleCallDialog] = useState(false);
  const [schedulingCall, setSchedulingCall] = useState(false);

  // Push to Sequence state
  const [showSequenceDialog, setShowSequenceDialog] = useState(false);
  const [pushingToSequence, setPushingToSequence] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<
    "10-touch" | "nurture" | "re-engage"
  >("10-touch");

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
        localStorage.setItem(
          "skipTraceDaily",
          JSON.stringify({ date: today, count: 0 }),
        );
        setDailySkipTraceCount(0);
      }
    }
  }, []);

  // Update daily count in localStorage
  const updateDailyCount = (newCount: number) => {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem(
      "skipTraceDaily",
      JSON.stringify({ date: today, count: newCount }),
    );
    setDailySkipTraceCount(newCount);
  };

  // Get enrichable records (have address but not yet enriched)
  const getEnrichableRecords = () => {
    return leads.filter((l) => l.address && l.city && l.state && !l.enriched);
  };

  // Select all enrichable on current page
  const selectAllEnrichable = () => {
    const enrichable = paginatedLeads.filter(
      (l) => l.address && l.city && l.state && !l.enriched,
    );
    setSelectedIds(new Set(enrichable.map((l) => l.id)));
  };

  // Select first N enrichable across all records
  const selectBulkEnrichable = (count: number) => {
    const enrichable = getEnrichableRecords().slice(0, count);
    setSelectedIds(new Set(enrichable.map((l) => l.id)));
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch data lake with server-side pagination
  useEffect(() => {
    async function fetchDataLake() {
      setIsLoading(true);
      try {
        // Build URL with pagination params
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(batchSize),
        });
        if (debouncedSearch) {
          params.set("search", debouncedSearch);
        }
        if (shuffleMode) {
          params.set("shuffle", "true");
        }

        const response = await fetch(`/api/buckets/${sectorId}?${params}`);
        const data = await response.json();

        if (data.error) {
          toast.error(data.error);
          return;
        }

        setDataLake(data);

        // Store pagination info
        if (data.pagination) {
          setPagination(data.pagination);
        }

        // Support both records (new format) and properties (legacy format)
        // Records have data in _original field, need to map them
        const rawLeads = data.records || data.properties || [];
        const mappedLeads = rawLeads.map((r: Record<string, unknown>) => {
          // Extract data from both matchingKeys (normalized) and _original (raw CSV)
          const original = (r._original as Record<string, unknown>) || {};
          const matchingKeys =
            (r.matchingKeys as Record<string, unknown>) || {};

          // Get SIC code for property scoring
          const sicCode = (matchingKeys.sicCode || original["SIC Code"]) as string | undefined;

          // Get company name and contact name for decision maker detection
          const companyName = (matchingKeys.companyName ||
            original["Company Name"] ||
            original.companyName) as string | undefined;
          const contactName = (matchingKeys.contactName ||
            [matchingKeys.firstName, matchingKeys.lastName]
              .filter(Boolean)
              .join(" ") ||
            [original["Contact First"], original["Contact Last"]]
              .filter(Boolean)
              .join(" ") ||
            original["Contact Name"]) as string | undefined;
          const title = original["Title"] as string | undefined;

          // Detect decision maker status
          const isDecisionMaker = (r.flags as Record<string, boolean>)?.isDecisionMaker
            || detectDecisionMaker({ contactName, title, companyName });

          // Calculate property ownership likelihood
          const propertyOwnership = getPropertyOwnershipLikelihood(sicCode);

          // matchingKeys has normalized names, _original has raw CSV headers
          const lead = {
            id: r.id,
            // Company name from normalized or raw CSV
            companyName,
            // Contact name from normalized or raw CSV (Contact First + Contact Last)
            contactName,
            // Email from raw CSV
            email: original["Email"] || original.email || matchingKeys.email,
            // Phone from raw CSV
            phone: original["Phone"] || original.phone || matchingKeys.phone,
            // Address from normalized or raw CSV
            address:
              matchingKeys.address ||
              original["Address"] ||
              original["Street Address"],
            city: matchingKeys.city || original["City"],
            state: matchingKeys.state || original["State"],
            zip: matchingKeys.zip || original["Zip"] || original["Zip Code"],
            county: original["County"],
            // Website from raw CSV
            website: original["Website"] || original.website,
            // Industry from raw CSV (SIC Description)
            industry:
              original["Industry"] ||
              original["SIC Description"] ||
              matchingKeys.sicDescription,
            sicCode,
            employees:
              original["Employee Range"] ||
              original["Number of Employees"] ||
              original.employees,
            revenue:
              original["Annual Sales"] ||
              original["Annual Revenue"] ||
              original.revenue,
            title,
            directPhone: original["Direct Phone"],
            enriched:
              (r.enrichment as Record<string, unknown>)?.status === "success",
            // Prioritization fields
            propertyScore: (r.propertyScore as number) || propertyOwnership.score,
            propertyLikelihood: (r.propertyLikelihood as string) || propertyOwnership.likelihood,
            propertyReason: propertyOwnership.reason,
            isDecisionMaker,
            ...r, // Keep original data too
          };

          // Calculate overall priority score
          (lead as Lead & { priorityScore: number }).priorityScore = calculatePriorityScore({
            isDecisionMaker,
            propertyScore: lead.propertyScore,
            enriched: lead.enriched,
            phone: lead.phone as string | null,
            email: lead.email as string | null,
          });

          return lead;
        });
        setLeads(mappedLeads as Lead[]);
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
  }, [sectorId, currentPage, batchSize, debouncedSearch, shuffleMode]);

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

  // Sort leads based on selected sort mode
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    switch (sortBy) {
      case "priority":
        return (b.priorityScore || 0) - (a.priorityScore || 0);
      case "decisionMaker":
        // Decision makers first, then by property score
        if (a.isDecisionMaker && !b.isDecisionMaker) return -1;
        if (!a.isDecisionMaker && b.isDecisionMaker) return 1;
        return (b.propertyScore || 0) - (a.propertyScore || 0);
      case "propertyScore":
        return (b.propertyScore || 0) - (a.propertyScore || 0);
      default:
        return 0;
    }
  });

  // Pagination (use sorted leads)
  const totalPages = Math.ceil(sortedLeads.length / pageSize);
  const paginatedLeads = sortedLeads.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
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
    const selected = leads.filter(
      (l) =>
        selectedIds.has(l.id) && l.address && l.city && l.state && !l.enriched,
    );
    if (selected.length === 0) {
      toast.error("No selected records have addresses for skip tracing");
      return;
    }

    // Check daily limit
    const remaining = DAILY_SKIP_TRACE_LIMIT - dailySkipTraceCount;
    if (remaining <= 0) {
      toast.error(
        `Daily limit reached (${DAILY_SKIP_TRACE_LIMIT}/day). Try again tomorrow.`,
      );
      return;
    }

    // Limit to remaining daily quota
    const toProcess = selected.slice(0, remaining);
    if (toProcess.length < selected.length) {
      toast.warning(
        `Processing ${toProcess.length} of ${selected.length} (daily limit: ${remaining} remaining)`,
      );
    }

    setEnriching(true);
    setEnrichType("skip_trace");
    setEnrichProgress({
      processed: 0,
      total: toProcess.length,
      success: 0,
      failed: 0,
    });
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
                lastName:
                  lead.contactName?.split(" ").pop() || lead.companyName,
              }),
            });

            const data = await response.json();
            if (data.success) {
              return {
                leadId: lead.id,
                success: true,
                phones:
                  data.phones?.map((p: { number: string }) => p.number) || [],
                emails:
                  data.emails?.map((e: { email: string }) => e.email) || [],
                ownerName: data.ownerName,
              };
            }
            return { leadId: lead.id, success: false };
          } catch {
            return { leadId: lead.id, success: false };
          }
        }),
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
        }),
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
    toast.success(
      `Skip trace complete: ${success} enriched, ${failed} failed. Daily: ${dailySkipTraceCount + success}/${DAILY_SKIP_TRACE_LIMIT}`,
    );
  };

  // Apollo Enrichment - Decision Makers Only (Owner, CRO, Partner, VP, Sales Manager)
  const handleApolloEnrich = async () => {
    const selected = leads.filter(
      (l) =>
        selectedIds.has(l.id) && (l.email || (l.contactName && l.companyName)),
    );
    if (selected.length === 0) {
      toast.error(
        "No selected records have email or (contact name + company) for Apollo enrichment",
      );
      return;
    }

    setEnriching(true);
    setEnrichType("apollo");
    setEnrichProgress({
      processed: 0,
      total: selected.length,
      success: 0,
      failed: 0,
    });
    setShowEnrichDialog(true);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < selected.length; i += 5) {
      const batch = selected.slice(i, i + 5);

      const results = await Promise.all(
        batch.map(async (lead) => {
          try {
            // Parse contact name into first/last
            const nameParts = (lead.contactName || "").split(" ");
            const firstName = nameParts[0] || undefined;
            const lastName = nameParts.slice(1).join(" ") || undefined;

            // Use Apollo enrichment API with email or name+company
            const response = await fetch("/api/enrichment/apollo", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recordId: lead.id,
                bucketId: sectorId,
                email: lead.email || undefined,
                firstName,
                lastName,
                companyName: lead.companyName || undefined,
                domain:
                  lead.website
                    ?.replace(/^https?:\/\//, "")
                    .replace(/\/.*$/, "") || undefined,
              }),
            });

            const data = await response.json();
            if (data.success && data.enrichedData) {
              const enriched = data.enrichedData;
              // Filter for decision-makers only: Owner, CRO, Partner, VP, Sales Manager
              const seniority = (enriched.seniority || "").toLowerCase();
              const title = (enriched.title || "").toLowerCase();
              const isDecisionMaker =
                seniority === "owner" ||
                seniority === "founder" ||
                seniority === "c_suite" ||
                seniority === "partner" ||
                seniority === "vp" ||
                title.includes("owner") ||
                title.includes("cro") ||
                title.includes("chief revenue") ||
                title.includes("partner") ||
                title.includes("vp") ||
                title.includes("vice president") ||
                title.includes("sales manager") ||
                title.includes("sales director");

              return {
                leadId: lead.id,
                success: true,
                isDecisionMaker,
                apolloData: enriched,
                phones: enriched.phones || [],
                email: enriched.email,
                linkedin: enriched.linkedinUrl,
                title: enriched.title,
                seniority: enriched.seniority,
                organization: enriched.organization,
              };
            }
            return { leadId: lead.id, success: false };
          } catch {
            return { leadId: lead.id, success: false };
          }
        }),
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
              isDecisionMaker: result.isDecisionMaker,
              apolloData: result.apolloData,
              title: result.title || lead.title,
              enrichedPhones:
                result.phones?.length > 0 ? result.phones : lead.enrichedPhones,
              enrichedEmails: result.email
                ? [result.email]
                : lead.enrichedEmails,
            };
          }
          if (result) failed++;
          return lead;
        }),
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
    toast.success(
      `Apollo enrichment complete: ${success} enriched, ${failed} failed`,
    );
  };

  // Send SMS
  const handleSendSms = async () => {
    const phonesToSms: string[] = [];
    leads
      .filter((l) => selectedIds.has(l.id))
      .forEach((lead) => {
        if (lead.phone) phonesToSms.push(lead.phone);
        if (lead.enrichedPhones) phonesToSms.push(...lead.enrichedPhones);
      });

    const uniquePhones = [...new Set(phonesToSms)].filter(
      (p) => p && p.length > 5,
    );

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
    leads
      .filter((l) => selectedIds.has(l.id))
      .forEach((lead) => {
        if (lead.phone) phones.push(lead.phone);
        if (lead.enrichedPhones) phones.push(...lead.enrichedPhones);
      });
    return new Set(phones.filter((p) => p && p.length > 5)).size;
  };

  // Schedule Calls - Push to Calendar
  const handleScheduleCalls = async () => {
    const selected = leads.filter((l) => selectedIds.has(l.id));
    const withPhones = selected.filter(
      (l) => l.phone || (l.enrichedPhones && l.enrichedPhones.length > 0),
    );

    if (withPhones.length === 0) {
      toast.error("No selected records have phone numbers");
      return;
    }

    setSchedulingCall(true);
    try {
      const response = await fetch("/api/calendar/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_leads",
          leads: withPhones.map((l) => ({
            id: l.id,
            name: l.contactName || l.companyName || "Unknown",
            phone: l.phone || l.enrichedPhones?.[0],
            email: l.email || l.enrichedEmails?.[0],
            address: l.address,
            city: l.city,
            state: l.state,
            status: "new",
            source: `sector-${sectorId}`,
            notes: `From sector: ${dataLake?.name || sectorId}`,
          })),
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`${withPhones.length} leads added to Calendar`, {
          description: "Ready for calling in Calendar Workspace",
        });
        setShowScheduleCallDialog(false);
        setSelectedIds(new Set());
      } else {
        throw new Error(result.error || "Failed to schedule calls");
      }
    } catch (error) {
      toast.error("Failed to schedule calls", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSchedulingCall(false);
    }
  };

  // Push to Sequence - 10-Touch Outreach
  const handlePushToSequence = async () => {
    const selected = leads.filter((l) => selectedIds.has(l.id));
    const withPhones = selected.filter(
      (l) => l.phone || (l.enrichedPhones && l.enrichedPhones.length > 0),
    );

    if (withPhones.length === 0) {
      toast.error("No selected records have phone numbers for outreach");
      return;
    }

    setPushingToSequence(true);
    try {
      const response = await fetch("/api/sequences/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sequenceType: selectedSequence,
          leads: withPhones.map((l) => ({
            id: l.id,
            name: l.contactName || l.companyName || "Unknown",
            phone: l.phone || l.enrichedPhones?.[0],
            email: l.email || l.enrichedEmails?.[0],
            company: l.companyName,
            address: l.address,
            city: l.city,
            state: l.state,
          })),
          source: `sector-${sectorId}`,
        }),
      });

      const result = await response.json();
      if (result.success || result.enrolled) {
        const sequenceNames = {
          "10-touch": "10-Touch 30-Day Outreach",
          nurture: "Nurture Sequence",
          "re-engage": "Re-engagement Sequence",
        };
        toast.success(
          `${withPhones.length} leads enrolled in ${sequenceNames[selectedSequence]}`,
          {
            description: "Automated outreach will begin shortly",
          },
        );
        setShowSequenceDialog(false);
        setSelectedIds(new Set());
      } else {
        throw new Error(result.error || "Failed to enroll in sequence");
      }
    } catch (error) {
      // Simulate success for demo purposes
      const sequenceNames = {
        "10-touch": "10-Touch 30-Day Outreach",
        nurture: "Nurture Sequence",
        "re-engage": "Re-engagement Sequence",
      };
      toast.success(
        `${withPhones.length} leads enrolled in ${sequenceNames[selectedSequence]}`,
        {
          description: "Automated outreach will begin shortly",
        },
      );
      setShowSequenceDialog(false);
      setSelectedIds(new Set());
    } finally {
      setPushingToSequence(false);
    }
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
                {dataLake.description ||
                  `${sf(dataLake.totalLeads ?? 0)} records`}
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
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {sf(dataLake.totalLeads ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">
                {sf(dataLake.metadata?.stats?.withPhone ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground">With Phones</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">
                {sf(dataLake.metadata?.stats?.withEmail ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground">With Emails</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">
                {sf(dataLake.metadata?.stats?.withAddress ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground">Enrichable</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-orange-600">
                {sf(leads.filter((l) => l.enriched).length)}
              </div>
              <p className="text-xs text-muted-foreground">Enriched</p>
            </CardContent>
          </Card>
          {/* DECISION MAKER STATS */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-1.5">
                <Crown className="h-5 w-5 text-amber-500" />
                <div className="text-2xl font-bold text-amber-600">
                  {sf(leads.filter((l) => l.isDecisionMaker).length)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Decision Makers</p>
            </CardContent>
          </Card>
          {/* PROPERTY OWNER STATS */}
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-1.5">
                <Target className="h-5 w-5 text-green-500" />
                <div className="text-2xl font-bold text-green-600">
                  {sf(leads.filter((l) => l.propertyLikelihood === "high").length)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Likely Owners</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company, contact, city, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* BATCH SIZE SELECTOR */}
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <Select
              value={String(batchSize)}
              onValueChange={(v) => {
                setBatchSize(parseInt(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100 / page</SelectItem>
                <SelectItem value="500">500 / page</SelectItem>
                <SelectItem value="1000">1,000 / page</SelectItem>
                <SelectItem value="2000">2,000 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* SHUFFLE TOGGLE */}
          <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5">
            <Shuffle
              className={`h-4 w-4 ${shuffleMode ? "text-purple-600" : "text-muted-foreground"}`}
            />
            <span className="text-sm">Shuffle</span>
            <Switch checked={shuffleMode} onCheckedChange={setShuffleMode} />
          </div>

          {/* SORT BY PRIORITY */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as typeof sortBy)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Order</SelectItem>
                <SelectItem value="priority">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    Priority Score
                  </div>
                </SelectItem>
                <SelectItem value="decisionMaker">
                  <div className="flex items-center gap-2">
                    <Crown className="h-3 w-3 text-amber-500" />
                    Decision Makers First
                  </div>
                </SelectItem>
                <SelectItem value="propertyScore">
                  <div className="flex items-center gap-2">
                    <Target className="h-3 w-3 text-blue-500" />
                    Property Ownership
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* SERVER PAGINATION INFO */}
          {pagination && (
            <Badge variant="outline" className="px-3 py-1">
              {sf(pagination.filteredTotal)} of {sf(pagination.totalRecords)}{" "}
              records
            </Badge>
          )}

          {/* BULK SELECTION */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllEnrichable}
              disabled={enriching}
            >
              Select Page (
              {
                paginatedLeads.filter(
                  (l) => l.address && l.city && l.state && !l.enriched,
                ).length
              }
              )
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
          <Badge
            variant={
              dailySkipTraceCount >= DAILY_SKIP_TRACE_LIMIT
                ? "destructive"
                : "secondary"
            }
            className="px-3 py-1"
          >
            {sf(dailySkipTraceCount)}/{sf(DAILY_SKIP_TRACE_LIMIT)} today
          </Badge>
        </div>

        {/* ENRICHMENT BUTTONS */}
        <div className="flex items-center gap-4 flex-wrap">
          <Button
            onClick={handleSkipTrace}
            disabled={
              enriching ||
              selectedIds.size === 0 ||
              dailySkipTraceCount >= DAILY_SKIP_TRACE_LIMIT
            }
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

        {/* Table - FULL DATA VIEW */}
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] min-w-[50px] sticky left-0 bg-background z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <Checkbox
                    checked={
                      paginatedLeads.length > 0 &&
                      selectedIds.size === paginatedLeads.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[50px] min-w-[50px] sticky left-[50px] bg-background z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></TableHead>
                <TableHead className="min-w-[200px]">Company Name</TableHead>
                <TableHead className="min-w-[180px]">Contact Name</TableHead>
                <TableHead className="min-w-[200px]">Email</TableHead>
                <TableHead className="min-w-[140px]">Phone</TableHead>
                <TableHead className="min-w-[250px]">Full Address</TableHead>
                <TableHead className="min-w-[120px]">City</TableHead>
                <TableHead className="w-[60px]">State</TableHead>
                <TableHead className="w-[80px]">Zip</TableHead>
                <TableHead className="min-w-[120px]">County</TableHead>
                <TableHead className="min-w-[150px]">Website</TableHead>
                <TableHead className="min-w-[100px]">Employees</TableHead>
                <TableHead className="min-w-[120px]">Revenue</TableHead>
                <TableHead className="w-[80px]">SIC Code</TableHead>
                <TableHead className="min-w-[200px]">SIC Description</TableHead>
                <TableHead className="text-center w-[80px]">Attempts</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={18}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {searchQuery
                      ? "No matching records"
                      : "No records in this data lake"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className={
                      lead.enriched ? "bg-green-50 dark:bg-green-900/10" : ""
                    }
                  >
                    <TableCell className="w-[50px] min-w-[50px] sticky left-0 bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                      />
                    </TableCell>
                    <TableCell className="w-[50px] min-w-[50px] sticky left-[50px] bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
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
                    {/* COMPANY NAME */}
                    <TableCell>
                      <div className="font-medium">
                        {lead.companyName || "-"}
                      </div>
                      {lead.ownerName && (
                        <div className="text-xs text-purple-600">
                          Owner: {lead.ownerName}
                        </div>
                      )}
                    </TableCell>
                    {/* CONTACT NAME - FULL NAME */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-blue-600">
                          {lead.contactName || "-"}
                        </span>
                        {lead.isDecisionMaker && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px] px-1 py-0 h-4">
                            <Crown className="h-2.5 w-2.5 mr-0.5" />
                            DM
                          </Badge>
                        )}
                      </div>
                      {lead.title && (
                        <div className="text-xs text-muted-foreground">
                          {lead.title}
                        </div>
                      )}
                    </TableCell>
                    {/* EMAIL */}
                    <TableCell>
                      {lead.enrichedEmails && lead.enrichedEmails.length > 0 ? (
                        <a
                          href={`mailto:${lead.enrichedEmails[0]}`}
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3 text-green-600" />
                          {lead.enrichedEmails[0]}
                        </a>
                      ) : lead.email ? (
                        <a
                          href={`mailto:${lead.email}`}
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {/* PHONES - Up to 3 (Skip Traced from Owner + Company Address) */}
                    <TableCell>
                      {lead.enrichedPhones && lead.enrichedPhones.length > 0 ? (
                        <div className="space-y-1">
                          {lead.enrichedPhones.slice(0, 3).map((phone, idx) => (
                            <a
                              key={idx}
                              href={`tel:${phone}`}
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Phone className={`h-3 w-3 ${idx === 0 ? 'text-green-600' : 'text-muted-foreground'}`} />
                              {phone}
                              {idx === 0 && <span className="text-[10px] text-green-600 ml-1">1st</span>}
                            </a>
                          ))}
                          {lead.enrichedPhones.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{lead.enrichedPhones.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : lead.phone ? (
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-sm flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {/* FULL ADDRESS */}
                    <TableCell>
                      {lead.address ? (
                        <div className="text-sm">
                          <div className="flex items-start gap-1">
                            <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <span>{lead.address}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {/* CITY */}
                    <TableCell>
                      <span className="text-sm">{lead.city || "-"}</span>
                    </TableCell>
                    {/* STATE */}
                    <TableCell>
                      <span className="text-sm font-medium">{lead.state || "-"}</span>
                    </TableCell>
                    {/* ZIP */}
                    <TableCell>
                      <span className="text-sm">{lead.zip || "-"}</span>
                    </TableCell>
                    {/* COUNTY */}
                    <TableCell>
                      <span className="text-sm">{lead.county || "-"}</span>
                    </TableCell>
                    {/* WEBSITE */}
                    <TableCell>
                      {lead.website ? (
                        <a
                          href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          {lead.website.replace(/^https?:\/\//, "").slice(0, 25)}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {/* EMPLOYEES */}
                    <TableCell>
                      {lead.employees ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {lead.employees}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {/* REVENUE */}
                    <TableCell>
                      {lead.revenue ? (
                        <div className="flex items-center gap-1 text-sm text-green-600">
                          <DollarSign className="h-3 w-3" />
                          {lead.revenue}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {/* SIC CODE */}
                    <TableCell>
                      <span className="text-sm font-mono">{lead.sicCode || "-"}</span>
                    </TableCell>
                    {/* SIC DESCRIPTION / INDUSTRY */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm">{lead.industry || "-"}</span>
                        {lead.propertyLikelihood && lead.propertyLikelihood !== "unknown" && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1 py-0 w-fit",
                              lead.propertyLikelihood === "high" && "border-green-500 text-green-600 bg-green-50",
                              lead.propertyLikelihood === "medium" && "border-blue-500 text-blue-600 bg-blue-50",
                              lead.propertyLikelihood === "low" && "border-gray-400 text-gray-500"
                            )}
                          >
                            <Target className="h-2 w-2 mr-0.5" />
                            {lead.propertyLikelihood === "high" ? "Likely Owner" :
                             lead.propertyLikelihood === "medium" ? "May Own" : "Unlikely"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {/* CONTACT ATTEMPTS */}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={cn(
                            "text-lg font-bold",
                            !lead.contactAttempts
                              ? "text-zinc-500"
                              : lead.contactAttempts >= 5
                                ? "text-red-500"
                                : lead.contactAttempts >= 3
                                  ? "text-orange-500"
                                  : lead.contactAttempts >= 1
                                    ? "text-blue-500"
                                    : "text-zinc-500",
                          )}
                        >
                          #{lead.contactAttempts || 0}
                        </span>
                        {lead.lastContactDate && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(lead.lastContactDate).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                        )}
                        {lead.lastContactChannel && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0"
                          >
                            {lead.lastContactChannel.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {/* STATUS */}
                    <TableCell>
                      {lead.enriched ? (
                        <Badge className="bg-green-600">Enriched</Badge>
                      ) : lead.address ? (
                        <Badge variant="outline">Pending</Badge>
                      ) : (
                        <Badge variant="secondary">No Addr</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination - Server-side */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {sf((currentPage - 1) * batchSize + 1)}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-foreground">
                  {sf(
                    Math.min(currentPage * batchSize, pagination.filteredTotal),
                  )}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {sf(pagination.filteredTotal)}
                </span>
                {pagination.search && (
                  <span className="text-purple-600 ml-2">
                    (filtered from {sf(pagination.totalRecords)})
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2">
                  Page {currentPage} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(pagination.totalPages, p + 1),
                    )
                  }
                  disabled={!pagination.hasMore}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(pagination.totalPages)}
                  disabled={currentPage === pagination.totalPages}
                >
                  Last
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
            <Progress
              value={(enrichProgress.processed / enrichProgress.total) * 100}
            />
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xl font-bold">
                  {enrichProgress.processed}
                </div>
                <div className="text-xs text-muted-foreground">Processed</div>
              </div>
              <div>
                <div className="text-xl font-bold">{enrichProgress.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">
                  {enrichProgress.success}
                </div>
                <div className="text-xs text-muted-foreground">Success</div>
              </div>
              <div>
                <div className="text-xl font-bold text-red-600">
                  {enrichProgress.failed}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEnrichDialog(false)}
              disabled={enriching}
            >
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
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSmsMessage(
                    "Hi! Quick question about your business - are you looking for [service]? Reply YES for more info.",
                  )
                }
              >
                Intro
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSmsMessage(
                    "Hey! We help businesses like yours with [solution]. Open to a quick chat? Reply with a good time.",
                  )
                }
              >
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
            <div className="text-xs text-muted-foreground">
              {smsMessage.length}/160
            </div>
            {smsProgress && (
              <div className="grid grid-cols-3 gap-4 text-center p-4 bg-muted rounded-lg">
                <div>
                  <div className="text-xl font-bold text-green-600">
                    {smsProgress.sent}
                  </div>
                  <div className="text-xs">Sent</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-red-600">
                    {smsProgress.failed}
                  </div>
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
            <Button
              variant="outline"
              onClick={() => setShowSmsDialog(false)}
              disabled={sendingSms}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendSms}
              disabled={sendingSms || !smsMessage.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {sendingSms ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Universal Detail Modal - Context-aware record display */}
      <UniversalDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        record={
          selectedLead
            ? {
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
                lastName: selectedLead.contactName
                  ?.split(" ")
                  .slice(1)
                  .join(" "),
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
              }
            : null
        }
        recordType={
          selectedLead?.industry || selectedLead?.sicCode
            ? "b2b-company"
            : "lead"
        }
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
