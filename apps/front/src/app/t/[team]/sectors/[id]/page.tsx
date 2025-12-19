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
  Smartphone,
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
  "owner",
  "president",
  "ceo",
  "chief",
  "founder",
  "partner",
  "principal",
  "director",
  "vp",
  "vice president",
  "general manager",
  "gm",
  "managing",
  "chairman",
  "executive",
  "proprietor",
  "operator",
  "franchisee",
];

const DECISION_MAKER_NAME_PATTERNS = [
  // Last name matches company name (likely owner)
  (contactName: string, companyName: string) => {
    if (!contactName || !companyName) return false;
    const lastName = contactName.split(" ").pop()?.toLowerCase() || "";
    const companyWords = companyName.toLowerCase().split(/[\s,.-]+/);
    return companyWords.some(
      (w) => (w.length > 2 && lastName.includes(w)) || w.includes(lastName),
    );
  },
];

function detectDecisionMaker(lead: {
  contactName?: string | null;
  title?: string | null;
  companyName?: string | null;
}): boolean {
  // Check title
  const title = (lead.title || "").toLowerCase();
  if (DECISION_MAKER_TITLES.some((t) => title.includes(t))) return true;

  // Check name patterns (owner name in company name)
  for (const pattern of DECISION_MAKER_NAME_PATTERNS) {
    if (pattern(lead.contactName || "", lead.companyName || "")) return true;
  }

  return false;
}

// ==================== PROPERTY OWNERSHIP LIKELIHOOD ====================
// Score industries by likelihood of owning commercial property
const PROPERTY_OWNER_SIC_PREFIXES: Record<
  string,
  { likelihood: "high" | "medium" | "low"; reason: string }
> = {
  // HIGH - Very likely to own property
  "15": {
    likelihood: "high",
    reason: "General Contractors - often own offices/yards",
  },
  "16": { likelihood: "high", reason: "Heavy Construction - equipment yards" },
  "17": {
    likelihood: "high",
    reason: "Special Trade Contractors - own facilities",
  },
  "55": { likelihood: "high", reason: "Auto Dealers - own dealerships" },
  "54": { likelihood: "high", reason: "Food Stores - may own locations" },
  "58": { likelihood: "high", reason: "Restaurants - may own buildings" },
  "70": { likelihood: "high", reason: "Hotels & Lodging - own properties" },
  "65": { likelihood: "high", reason: "Real Estate - own properties" },
  // MEDIUM - Likely to own property
  "20": { likelihood: "medium", reason: "Food Manufacturing - own plants" },
  "35": {
    likelihood: "medium",
    reason: "Industrial Machinery - own facilities",
  },
  "36": { likelihood: "medium", reason: "Electronics Mfg - own facilities" },
  "37": {
    likelihood: "medium",
    reason: "Transportation Equipment - own facilities",
  },
  "38": {
    likelihood: "medium",
    reason: "Instruments/Optical - own facilities",
  },
  "39": { likelihood: "medium", reason: "Misc Manufacturing - own facilities" },
  "50": { likelihood: "medium", reason: "Wholesale Durable - warehouses" },
  "51": { likelihood: "medium", reason: "Wholesale Nondurable - warehouses" },
  "42": {
    likelihood: "medium",
    reason: "Trucking/Warehousing - own facilities",
  },
  "75": { likelihood: "medium", reason: "Auto Repair/Services - own shops" },
  // LOW but some ownership
  "73": { likelihood: "low", reason: "Business Services - usually lease" },
  "87": { likelihood: "low", reason: "Engineering Services - usually lease" },
};

function getPropertyOwnershipLikelihood(sicCode?: string | null): {
  likelihood: "high" | "medium" | "low" | "unknown";
  reason: string;
  score: number;
} {
  if (!sicCode)
    return { likelihood: "unknown", reason: "No SIC code", score: 0 };

  // Check first 2 digits
  const prefix2 = sicCode.slice(0, 2);
  if (PROPERTY_OWNER_SIC_PREFIXES[prefix2]) {
    const { likelihood, reason } = PROPERTY_OWNER_SIC_PREFIXES[prefix2];
    return {
      likelihood,
      reason,
      score: likelihood === "high" ? 80 : likelihood === "medium" ? 50 : 20,
    };
  }

  return {
    likelihood: "unknown",
    reason: "Industry not categorized",
    score: 0,
  };
}

// Calculate priority score for sorting (higher = more important)
function calculatePriorityScore(lead: {
  isDecisionMaker?: boolean;
  propertyScore?: number;
  enriched?: boolean;
  phone?: string | null;
  email?: string | null;
}): number {
  let score = 0;
  if (lead.isDecisionMaker) score += 50;
  if (lead.propertyScore) score += lead.propertyScore * 0.3;
  if (lead.enriched) score += 20;
  if (lead.phone) score += 10;
  if (lead.email) score += 5;
  return score;
}

// Phone with type info from skip trace
interface PhoneWithType {
  number: string;
  type?: string; // "mobile", "landline", "unknown"
}

interface Lead {
  id: string;
  // UNIQUE IDs - Generated on enrichment
  leadId?: string; // Unique lead ID (generated when enriched - this is what defines a LEAD)
  uploadId?: string; // List ID - which upload batch this came from
  bucketId?: string; // Data lake bucket ID
  // Company/Contact Info
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
  enrichedPhones?: PhoneWithType[]; // Now includes type info
  enrichedEmails?: string[];
  mobilePhone?: string | null; // Best mobile phone
  ownerName?: string;
  skipTraceData?: Record<string, unknown>;
  apolloData?: Record<string, unknown>;
  // SOCIAL PROFILES (from skip trace)
  linkedin?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  // DEMOGRAPHICS (from skip trace)
  demographics?: {
    income?: string;
    netWorth?: string;
    occupation?: string;
    employer?: string;
  };
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
  const [sortBy, setSortBy] = useState<
    "default" | "priority" | "decisionMaker" | "propertyScore"
  >("default");

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

  // Push to SMS Queue state
  const [showPushSmsDialog, setShowPushSmsDialog] = useState(false);
  const [pushingSms, setPushingSms] = useState(false);
  const [smsTemplateMessage, setSmsTemplateMessage] = useState(
    "Hey {name}! Quick question about {company} - are you looking for growth opportunities? Reply YES to learn more.",
  );
  const [smsPushMode, setSmsPushMode] = useState<"draft" | "immediate">(
    "draft",
  );
  // Campaign context - drives message selection and attempt tracking
  const [campaignContext, setCampaignContext] = useState<
    "initial" | "retarget" | "follow_up" | "nurture" | "instant"
  >("initial");

  // Push to Dialer state
  const [showPushDialerDialog, setShowPushDialerDialog] = useState(false);
  const [pushingDialer, setPushingDialer] = useState(false);

  // LUCI Orchestrate state (Enrich & Queue All)
  const [showOrchestrateDialog, setShowOrchestrateDialog] = useState(false);
  const [orchestrating, setOrchestrating] = useState(false);
  const [orchestrateProgress, setOrchestrateProgress] = useState<{
    status: string;
    leadsProcessed?: number;
    leadsEnriched?: number;
    leadsPushed?: number;
  } | null>(null);

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
          const sicCode = (matchingKeys.sicCode || original["SIC Code"]) as
            | string
            | undefined;

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
          const isDecisionMaker =
            (r.flags as Record<string, boolean>)?.isDecisionMaker ||
            detectDecisionMaker({ contactName, title, companyName });

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
            propertyScore:
              (r.propertyScore as number) || propertyOwnership.score,
            propertyLikelihood:
              (r.propertyLikelihood as string) || propertyOwnership.likelihood,
            propertyReason: propertyOwnership.reason,
            isDecisionMaker,
            ...r, // Keep original data too
          };

          // Calculate overall priority score
          (lead as Lead & { priorityScore: number }).priorityScore =
            calculatePriorityScore({
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
            // Parse contact name into first/last - REQUIRED by RealEstateAPI
            const nameParts = (lead.contactName || "").trim().split(/\s+/);
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || nameParts[0] || "";

            const response = await fetch("/api/skip-trace", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                firstName: firstName,
                lastName: lastName,
                address: lead.address,
                city: lead.city,
                state: lead.state,
                zip: lead.zip,
              }),
            });

            const data = await response.json();
            if (data.success) {
              // Preserve full phone objects with type info
              const phones = data.phones || [];
              // Find best mobile phone
              const mobilePhone = phones.find(
                (p: { type?: string }) =>
                  p.type?.toLowerCase() === "mobile" ||
                  p.type?.toLowerCase() === "cell",
              );
              return {
                leadId: lead.id,
                success: true,
                phones: phones.map((p: { number: string; type?: string }) => ({
                  number: p.number,
                  type: p.type || "unknown",
                })),
                mobilePhone: mobilePhone?.number || null,
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
              enrichedPhones: result.phones, // Now has type info
              mobilePhone: result.mobilePhone, // Best mobile phone
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

  // Send SMS - prioritize mobile phones
  const handleSendSms = async () => {
    const phonesToSms: string[] = [];
    leads
      .filter((l) => selectedIds.has(l.id))
      .forEach((lead) => {
        // First priority: explicit mobile phone
        if (lead.mobilePhone) {
          phonesToSms.push(lead.mobilePhone);
          return;
        }
        // Second priority: mobile from enriched phones
        const mobile = lead.enrichedPhones?.find(
          (p) =>
            p.type?.toLowerCase() === "mobile" ||
            p.type?.toLowerCase() === "cell",
        );
        if (mobile) {
          phonesToSms.push(mobile.number);
          return;
        }
        // Fallback: any enriched phone
        if (lead.enrichedPhones?.length) {
          phonesToSms.push(lead.enrichedPhones[0].number);
          return;
        }
        // Last resort: original phone
        if (lead.phone) phonesToSms.push(lead.phone);
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

  // Get phone count - prioritize mobile phones for SMS
  const getPhoneCount = () => {
    const phones: string[] = [];
    leads
      .filter((l) => selectedIds.has(l.id))
      .forEach((lead) => {
        // First priority: explicit mobile phone
        if (lead.mobilePhone) {
          phones.push(lead.mobilePhone);
          return;
        }
        // Second priority: mobile from enriched phones
        const mobile = lead.enrichedPhones?.find(
          (p) =>
            p.type?.toLowerCase() === "mobile" ||
            p.type?.toLowerCase() === "cell",
        );
        if (mobile) {
          phones.push(mobile.number);
          return;
        }
        // Fallback: any enriched phone number
        if (lead.enrichedPhones?.length) {
          phones.push(lead.enrichedPhones[0].number);
          return;
        }
        // Last resort: original phone
        if (lead.phone) phones.push(lead.phone);
      });
    return new Set(phones.filter((p) => p && p.length > 5)).size;
  };

  // Get mobile phone count specifically
  const getMobileCount = () => {
    return leads.filter(
      (l) =>
        selectedIds.has(l.id) &&
        (l.mobilePhone ||
          l.enrichedPhones?.some(
            (p) =>
              p.type?.toLowerCase() === "mobile" ||
              p.type?.toLowerCase() === "cell",
          )),
    ).length;
  };

  // Get best phone for a lead (mobile preferred)
  const getBestPhone = (lead: Lead): string | null => {
    if (lead.mobilePhone) return lead.mobilePhone;
    const mobile = lead.enrichedPhones?.find(
      (p) =>
        p.type?.toLowerCase() === "mobile" || p.type?.toLowerCase() === "cell",
    );
    if (mobile) return mobile.number;
    if (lead.enrichedPhones?.length) return lead.enrichedPhones[0].number;
    return lead.phone || null;
  };

  // Schedule Calls - Push to Calendar
  const handleScheduleCalls = async () => {
    const selected = leads.filter((l) => selectedIds.has(l.id));
    const withPhones = selected.filter(
      (l) =>
        l.phone ||
        l.mobilePhone ||
        (l.enrichedPhones && l.enrichedPhones.length > 0),
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
            phone: getBestPhone(l),
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
      (l) =>
        l.phone ||
        l.mobilePhone ||
        (l.enrichedPhones && l.enrichedPhones.length > 0),
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
            phone: getBestPhone(l),
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

  // Push to SMS Queue - Connect to LUCI → Gianna Pipeline
  const handlePushToSmsQueue = async () => {
    const selected = leads.filter((l) => selectedIds.has(l.id));
    const withPhones = selected.filter(
      (l) =>
        l.mobilePhone ||
        l.enrichedPhones?.some(
          (p) =>
            p.type?.toLowerCase() === "mobile" ||
            p.type?.toLowerCase() === "cell",
        ) ||
        l.phone,
    );

    if (withPhones.length === 0) {
      toast.error("No selected records have phone numbers for SMS");
      return;
    }

    setPushingSms(true);
    try {
      const response = await fetch("/api/luci/push-to-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: withPhones.map((l) => ({
            id: l.id,
            name: l.contactName || l.companyName || "Unknown",
            firstName: l.contactName?.split(" ")[0],
            lastName: l.contactName?.split(" ").slice(1).join(" "),
            phone: l.phone,
            mobilePhone: l.mobilePhone,
            enrichedPhones: l.enrichedPhones,
            email: l.email || l.enrichedEmails?.[0],
            company: l.companyName,
            address: l.address,
            city: l.city,
            state: l.state,
            industry: l.industry,
            sicCode: l.sicCode,
            isDecisionMaker: l.isDecisionMaker,
          })),
          templateMessage: smsTemplateMessage,
          mode: smsPushMode, // "draft" or "immediate"
          campaignContext: campaignContext, // initial, retarget, follow_up, nurture, instant
          campaignName: `Sector-${dataLake?.name || sectorId}`,
          source: `sector-${sectorId}`,
          agent: "gianna",
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(
          `${result.queued} leads pushed to SMS queue${smsPushMode === "draft" ? " for review" : ""}`,
          {
            description:
              result.skipped > 0
                ? `${result.skipped} skipped (no mobile)`
                : "Ready for campaign execution",
          },
        );
        setShowPushSmsDialog(false);
        setSelectedIds(new Set());
      } else {
        throw new Error(result.error || "Failed to push to SMS queue");
      }
    } catch (error) {
      toast.error("Failed to push to SMS queue", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setPushingSms(false);
    }
  };

  // LUCI ORCHESTRATE - Full Pipeline: Enrich → Generate Lead IDs → Push to Queue
  const handleOrchestrate = async (pushTo: "sms" | "dialer" | "both") => {
    setOrchestrating(true);
    setOrchestrateProgress({ status: "Starting pipeline..." });

    try {
      const response = await fetch("/api/luci/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucketId: sectorId,
          action: "enrich", // First enrich, then push
          filters: {
            hasAddress: true,
            limit: selectedIds.size > 0 ? undefined : 100,
          },
          enrichmentTypes: ["skip_trace"],
          pushTo,
          mode: smsPushMode,
          templateMessage: smsTemplateMessage,
          templateCategory: "blue_collar",
          agent: "gianna",
          campaignContext: campaignContext,
          campaignName: `LUCI-${dataLake?.name || sectorId}-${Date.now()}`,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setOrchestrateProgress({
          status: "Complete!",
          leadsProcessed: result.summary.leadsProcessed,
          leadsEnriched: result.summary.leadsEnriched,
          leadsPushed: result.summary.leadsPushed,
        });

        toast.success(
          `Pipeline complete: ${result.summary.leadsEnriched} enriched, ${result.summary.leadsPushed} queued`,
          {
            description: result.nextSteps?.[0] || "Ready for outreach",
          },
        );

        // Refresh the data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(result.error || "Pipeline failed");
      }
    } catch (error) {
      toast.error("Pipeline failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      setOrchestrateProgress(null);
    } finally {
      setOrchestrating(false);
    }
  };

  // Push to Dialer - Connect to Power Dialer / Call Center
  const handlePushToDialer = async () => {
    const selected = leads.filter((l) => selectedIds.has(l.id));
    const withPhones = selected.filter(
      (l) =>
        l.phone ||
        l.mobilePhone ||
        (l.enrichedPhones && l.enrichedPhones.length > 0),
    );

    if (withPhones.length === 0) {
      toast.error("No selected records have phone numbers for dialer");
      return;
    }

    setPushingDialer(true);
    try {
      const response = await fetch("/api/luci/push-to-dialer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: withPhones.map((l) => ({
            id: l.id,
            name: l.contactName || l.companyName || "Unknown",
            firstName: l.contactName?.split(" ")[0],
            lastName: l.contactName?.split(" ").slice(1).join(" "),
            phone: getBestPhone(l),
            email: l.email || l.enrichedEmails?.[0],
            company: l.companyName,
            address: l.address,
            city: l.city,
            state: l.state,
            industry: l.industry,
            title: l.title,
            isDecisionMaker: l.isDecisionMaker,
          })),
          priority: "normal",
          source: `sector-${sectorId}`,
          campaignName: `Sector-${dataLake?.name || sectorId}`,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`${result.queued} leads added to call queue`, {
          description: `Ready in Power Dialer workspace`,
        });
        setShowPushDialerDialog(false);
        setSelectedIds(new Set());
      } else {
        throw new Error(result.error || "Failed to push to dialer");
      }
    } catch (error) {
      toast.error("Failed to push to dialer", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setPushingDialer(false);
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
        <div className="grid grid-cols-2 md:grid-cols-8 gap-4">
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
          {/* MOBILE PHONES - Key SMS metric */}
          <Card className="border-green-300 bg-green-50/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-1.5">
                <Smartphone className="h-5 w-5 text-green-600" />
                <div className="text-2xl font-bold text-green-700">
                  {sf(
                    leads.filter(
                      (l) =>
                        l.mobilePhone ||
                        l.enrichedPhones?.some(
                          (p) =>
                            p.type?.toLowerCase() === "mobile" ||
                            p.type?.toLowerCase() === "cell",
                        ),
                    ).length,
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">With Mobiles</p>
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
                  {sf(
                    leads.filter((l) => l.propertyLikelihood === "high").length,
                  )}
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

          {/* PUSH TO SMS QUEUE - LUCI → Gianna Pipeline */}
          <Button
            onClick={() => setShowPushSmsDialog(true)}
            disabled={selectedIds.size === 0 || pushingSms}
            variant="outline"
            className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
          >
            <Zap className="h-4 w-4 mr-2" />
            Push to SMS Queue ({getMobileCount()})
          </Button>

          {/* PUSH TO DIALER - Power Dialer / Call Center */}
          <Button
            onClick={() => setShowPushDialerDialog(true)}
            disabled={selectedIds.size === 0 || pushingDialer}
            variant="outline"
            className="border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            <PhoneCall className="h-4 w-4 mr-2" />
            Push to Dialer ({getPhoneCount()})
          </Button>

          {/* Schedule Calls */}
          <Button
            onClick={() => setShowScheduleCallDialog(true)}
            disabled={selectedIds.size === 0}
            variant="outline"
          >
            <CalendarPlus className="h-4 w-4 mr-2" />
            Calendar ({getPhoneCount()})
          </Button>

          {/* Push to Sequence */}
          <Button
            onClick={() => setShowSequenceDialog(true)}
            disabled={selectedIds.size === 0}
            variant="outline"
            className="border-indigo-500 text-indigo-600 hover:bg-indigo-50"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Sequence
          </Button>

          {/* LUCI ORCHESTRATE - Full Pipeline Button */}
          <Button
            onClick={() => handleOrchestrate("sms")}
            disabled={orchestrating}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            {orchestrating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {orchestrateProgress?.status || "Processing..."}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Enrich & Queue All
              </>
            )}
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
                <TableHead className="w-[100px]">Lead ID</TableHead>
                <TableHead className="w-[100px]">List ID</TableHead>
                <TableHead className="min-w-[200px]">Company Name</TableHead>
                <TableHead className="min-w-[180px]">Contact Name</TableHead>
                <TableHead className="min-w-[200px]">Email</TableHead>
                <TableHead className="min-w-[140px]">Phone</TableHead>
                <TableHead className="min-w-[140px]">
                  <div className="flex items-center gap-1">
                    <Smartphone className="h-3.5 w-3.5 text-green-600" />
                    Mobile
                  </div>
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <div className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5 text-blue-600" />
                    LinkedIn
                  </div>
                </TableHead>
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
                    colSpan={19}
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
                    {/* LEAD ID - Generated on enrichment */}
                    <TableCell>
                      {(lead.skipTraceData as any)?.leadId || lead.leadId ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono bg-green-50 text-green-700 border-green-200"
                        >
                          {(
                            (lead.skipTraceData as any)?.leadId ||
                            lead.leadId ||
                            ""
                          ).slice(0, 12)}
                          ...
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {/* LIST ID - Upload/Bucket ID */}
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-mono"
                      >
                        {(
                          lead.uploadId ||
                          (lead as any).bucketId ||
                          sectorId ||
                          ""
                        ).slice(0, 8)}
                        ...
                      </Badge>
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
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-700 text-[10px] px-1 py-0 h-4"
                          >
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
                    {/* PHONES - All phones with type indicators */}
                    <TableCell>
                      {lead.enrichedPhones && lead.enrichedPhones.length > 0 ? (
                        <div className="space-y-1">
                          {lead.enrichedPhones.slice(0, 3).map((phone, idx) => {
                            const isMobile =
                              phone.type?.toLowerCase() === "mobile" ||
                              phone.type?.toLowerCase() === "cell";
                            return (
                              <a
                                key={idx}
                                href={`tel:${phone.number}`}
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {isMobile ? (
                                  <Smartphone className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                )}
                                {phone.number}
                                {isMobile && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] px-1 py-0 h-4 bg-green-100 text-green-700"
                                  >
                                    MOBILE
                                  </Badge>
                                )}
                              </a>
                            );
                          })}
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
                    {/* MOBILE PHONE - Best mobile for SMS */}
                    <TableCell>
                      {lead.mobilePhone ? (
                        <a
                          href={`tel:${lead.mobilePhone}`}
                          className="text-sm text-green-700 hover:underline flex items-center gap-1 font-medium"
                        >
                          <Smartphone className="h-4 w-4 text-green-600" />
                          {lead.mobilePhone}
                        </a>
                      ) : lead.enrichedPhones?.find(
                          (p) =>
                            p.type?.toLowerCase() === "mobile" ||
                            p.type?.toLowerCase() === "cell",
                        ) ? (
                        <a
                          href={`tel:${
                            lead.enrichedPhones.find(
                              (p) =>
                                p.type?.toLowerCase() === "mobile" ||
                                p.type?.toLowerCase() === "cell",
                            )?.number
                          }`}
                          className="text-sm text-green-700 hover:underline flex items-center gap-1 font-medium"
                        >
                          <Smartphone className="h-4 w-4 text-green-600" />
                          {
                            lead.enrichedPhones.find(
                              (p) =>
                                p.type?.toLowerCase() === "mobile" ||
                                p.type?.toLowerCase() === "cell",
                            )?.number
                          }
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Skip trace to find
                        </span>
                      )}
                    </TableCell>
                    {/* LINKEDIN - From skip trace socials */}
                    <TableCell>
                      {(lead.skipTraceData as any)?.socials?.linkedin ||
                      (lead.apolloData as any)?.linkedinUrl ? (
                        <a
                          href={
                            (lead.skipTraceData as any)?.socials?.linkedin ||
                            (lead.apolloData as any)?.linkedinUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Globe className="h-3.5 w-3.5 text-blue-700" />
                          <span className="truncate max-w-[100px]">
                            {(lead.skipTraceData as any)?.socials
                              ?.linkedinUsername ||
                              (lead.apolloData as any)?.linkedinUrl
                                ?.split("/")
                                .pop() ||
                              "Profile"}
                          </span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
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
                      <span className="text-sm font-medium">
                        {lead.state || "-"}
                      </span>
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
                          href={
                            lead.website.startsWith("http")
                              ? lead.website
                              : `https://${lead.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          {lead.website
                            .replace(/^https?:\/\//, "")
                            .slice(0, 25)}
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
                      <span className="text-sm font-mono">
                        {lead.sicCode || "-"}
                      </span>
                    </TableCell>
                    {/* SIC DESCRIPTION / INDUSTRY */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm">{lead.industry || "-"}</span>
                        {lead.propertyLikelihood &&
                          lead.propertyLikelihood !== "unknown" && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] px-1 py-0 w-fit",
                                lead.propertyLikelihood === "high" &&
                                  "border-green-500 text-green-600 bg-green-50",
                                lead.propertyLikelihood === "medium" &&
                                  "border-blue-500 text-blue-600 bg-blue-50",
                                lead.propertyLikelihood === "low" &&
                                  "border-gray-400 text-gray-500",
                              )}
                            >
                              <Target className="h-2 w-2 mr-0.5" />
                              {lead.propertyLikelihood === "high"
                                ? "Likely Owner"
                                : lead.propertyLikelihood === "medium"
                                  ? "May Own"
                                  : "Unlikely"}
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
              {getMobileCount() > 0 && (
                <span className="ml-2 text-green-600 font-medium">
                  ({getMobileCount()} mobile)
                </span>
              )}
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

      {/* Push to SMS Queue Dialog */}
      <Dialog open={showPushSmsDialog} onOpenChange={setShowPushSmsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-600" />
              Push to SMS Queue
            </DialogTitle>
            <DialogDescription>
              Push {selectedIds.size} leads to SMS campaign queue for Gianna
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center p-3 bg-muted/50 rounded-lg">
              <div>
                <div className="text-xl font-bold text-blue-600">
                  {selectedIds.size}
                </div>
                <div className="text-xs text-muted-foreground">Selected</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">
                  {getMobileCount()}
                </div>
                <div className="text-xs text-muted-foreground">With Mobile</div>
              </div>
              <div>
                <div className="text-xl font-bold text-orange-600">
                  {selectedIds.size - getMobileCount()}
                </div>
                <div className="text-xs text-muted-foreground">No Mobile</div>
              </div>
            </div>

            {/* Mode Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Push Mode</label>
              <Select
                value={smsPushMode}
                onValueChange={(v) =>
                  setSmsPushMode(v as "draft" | "immediate")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Draft (Human Review)
                    </div>
                  </SelectItem>
                  <SelectItem value="immediate">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Immediate (Auto-Send)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {smsPushMode === "draft"
                  ? "Messages will be queued for review before sending"
                  : "Messages will be sent immediately (within rate limits)"}
              </p>
            </div>

            {/* Campaign Context - Drives Gianna's message selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Campaign Context</label>
              <Select
                value={campaignContext}
                onValueChange={(v) =>
                  setCampaignContext(
                    v as
                      | "initial"
                      | "retarget"
                      | "follow_up"
                      | "nurture"
                      | "instant",
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial">
                    <div className="flex flex-col">
                      <span className="font-medium">Initial Outreach</span>
                      <span className="text-xs text-muted-foreground">
                        First contact attempt
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="retarget">
                    <div className="flex flex-col">
                      <span className="font-medium">Retarget</span>
                      <span className="text-xs text-muted-foreground">
                        No response yet, trying again
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="follow_up">
                    <div className="flex flex-col">
                      <span className="font-medium">Follow Up</span>
                      <span className="text-xs text-muted-foreground">
                        They responded, continuing convo
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="nurture">
                    <div className="flex flex-col">
                      <span className="font-medium">Nurture</span>
                      <span className="text-xs text-muted-foreground">
                        Long-term drip sequence
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="instant">
                    <div className="flex flex-col">
                      <span className="font-medium">Instant</span>
                      <span className="text-xs text-muted-foreground">
                        Send immediately, hot lead
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Gianna will select appropriate opener based on context
              </p>
            </div>

            {/* Template Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Message</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSmsTemplateMessage(
                      "Hey {name}! Quick question about {company} - are you looking for growth opportunities? Reply YES to learn more.",
                    )
                  }
                >
                  Growth Offer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSmsTemplateMessage(
                      "Hi {name}, I specialize in helping businesses like {company} in {city}. Would you be open to a quick call? Reply YES",
                    )
                  }
                >
                  Local Expert
                </Button>
              </div>
              <textarea
                value={smsTemplateMessage}
                onChange={(e) => setSmsTemplateMessage(e.target.value)}
                placeholder="Type your message template..."
                className="w-full min-h-[80px] p-3 rounded-md border bg-background text-sm"
                maxLength={300}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Variables: {"{name}"}, {"{company}"}, {"{city}"}, {"{state}"}
                </span>
                <span>{smsTemplateMessage.length}/300</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPushSmsDialog(false)}
              disabled={pushingSms}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePushToSmsQueue}
              disabled={pushingSms || getMobileCount() === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {pushingSms ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Push {getMobileCount()} to Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Push to Dialer Dialog */}
      <Dialog
        open={showPushDialerDialog}
        onOpenChange={setShowPushDialerDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-orange-600" />
              Push to Power Dialer
            </DialogTitle>
            <DialogDescription>
              Add {getPhoneCount()} leads to call queue for Power Dialer
              workspace
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-center p-3 bg-muted/50 rounded-lg">
              <div>
                <div className="text-xl font-bold text-blue-600">
                  {selectedIds.size}
                </div>
                <div className="text-xs text-muted-foreground">Selected</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">
                  {getPhoneCount()}
                </div>
                <div className="text-xs text-muted-foreground">With Phone</div>
              </div>
            </div>

            {/* Decision Makers Count */}
            {leads.filter((l) => selectedIds.has(l.id) && l.isDecisionMaker)
              .length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Crown className="h-5 w-5 text-amber-500" />
                <span className="text-sm">
                  <strong>
                    {
                      leads.filter(
                        (l) => selectedIds.has(l.id) && l.isDecisionMaker,
                      ).length
                    }
                  </strong>{" "}
                  decision makers will be prioritized in the call queue
                </span>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Leads will be added to the global call queue and available in the
              Power Dialer workspace. Decision makers will receive higher
              priority.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPushDialerDialog(false)}
              disabled={pushingDialer}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePushToDialer}
              disabled={pushingDialer || getPhoneCount() === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {pushingDialer ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PhoneCall className="h-4 w-4 mr-2" />
              )}
              Add {getPhoneCount()} to Dialer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Call Dialog */}
      <Dialog
        open={showScheduleCallDialog}
        onOpenChange={setShowScheduleCallDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-blue-600" />
              Schedule Calls
            </DialogTitle>
            <DialogDescription>
              Add {getPhoneCount()} leads to Calendar for follow-up calls
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Selected leads will be added to your Calendar workspace for
              scheduled follow-up calls.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowScheduleCallDialog(false)}
              disabled={schedulingCall}
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleCalls}
              disabled={schedulingCall || getPhoneCount() === 0}
            >
              {schedulingCall ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CalendarPlus className="h-4 w-4 mr-2" />
              )}
              Add to Calendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Push to Sequence Dialog */}
      <Dialog open={showSequenceDialog} onOpenChange={setShowSequenceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-indigo-600" />
              Enroll in Sequence
            </DialogTitle>
            <DialogDescription>
              Enroll {getPhoneCount()} leads in an automated outreach sequence
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Sequence</label>
              <Select
                value={selectedSequence}
                onValueChange={(v) =>
                  setSelectedSequence(v as "10-touch" | "nurture" | "re-engage")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10-touch">
                    10-Touch 30-Day Outreach
                  </SelectItem>
                  <SelectItem value="nurture">Nurture Sequence</SelectItem>
                  <SelectItem value="re-engage">
                    Re-engagement Sequence
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSequenceDialog(false)}
              disabled={pushingToSequence}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePushToSequence}
              disabled={pushingToSequence || getPhoneCount() === 0}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {pushingToSequence ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Enroll {getPhoneCount()}
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
