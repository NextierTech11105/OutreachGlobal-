"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Upload,
  Search,
  Sparkles,
  Database,
  CheckCircle2,
  Phone,
  PhoneCall,
  Mail,
  Loader2,
  Zap,
  MessageSquare,
  LayoutGrid,
  Terminal,
  RefreshCw,
  Filter,
  Download,
  Settings,
  HardDrive,
  ChevronDown,
  X,
  Inbox,
  Send,
  Activity,
  Keyboard,
  CalendarPlus,
  ArrowRight,
  Target,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ═══════════════════════════════════════════════════════════════════════════
// FIELD MAPPING CONFIGURATION - USBizData compatible
// ═══════════════════════════════════════════════════════════════════════════
const STANDARD_FIELDS = [
  { key: "companyName", label: "Company Name", required: false },
  { key: "contactName", label: "Contact Name", required: false },
  { key: "firstName", label: "First Name", required: true },
  { key: "lastName", label: "Last Name", required: true },
  { key: "email", label: "Email", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "address", label: "Address", required: false },
  { key: "city", label: "City", required: false },
  { key: "state", label: "State", required: false },
  { key: "zip", label: "Zip Code", required: false },
  { key: "county", label: "County", required: false },
  { key: "website", label: "Website", required: false },
  { key: "employees", label: "Employees", required: false },
  { key: "revenue", label: "Revenue", required: false },
  { key: "sicCode", label: "SIC Code", required: false },
  { key: "sicDescription", label: "Industry/SIC Desc", required: false },
] as const;

// Lead type for display
interface Lead {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  industry?: string;
  source?: string;
  // Enrichment fields
  enriched?: boolean;
  enrichedPhones?: Array<{ number: string; type?: string }>;
  enrichedEmails?: string[];
}

// Datalake folder type
interface DatalakeFolder {
  type: string;
  path: string;
}

// Bucket with age tracking
interface DataBucket {
  id: string;
  name: string;
  totalLeads: number;
  source?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Field mapping type
interface FieldMapping {
  csvColumn: string;
  standardField: string;
  sampleValue?: string;
}

export default function DataHubPage() {
  const params = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [viewMode, setViewMode] = useState<"simple" | "pro">("simple");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Datalake state
  const [datalakeFolders, setDatalakeFolders] = useState<DatalakeFolder[]>([]);
  const [isLoadingDatalake, setIsLoadingDatalake] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════
  // WORKFLOW CONFIGURATION - Daily Limits & Batch Processing
  // ═══════════════════════════════════════════════════════════════════
  const WORKFLOW_CONFIG = {
    skipTraceBatchSize: 250,      // Skip trace in batches of 250
    maxSkipTracePerDay: 2000,     // Max 2,000 skip traces per day
    maxSmsPerDay: 2000,           // Max 2,000 SMS blasts per day
    maxCallsPerDay: 1000,         // Max 1,000 automated calls per day
  };

  // Workflow step tracking
  const [workflowStep, setWorkflowStep] = useState<
    "import" | "map" | "enrich" | "blast" | "respond" | "call"
  >("import");

  // Daily usage tracking (would come from API in production)
  const [dailyUsage, setDailyUsage] = useState({
    skipTracesUsed: 0,
    smsUsed: 0,
    callsUsed: 0,
  });

  // Buckets state (CSV uploads, USBizData, etc.) - with age tracking
  const [buckets, setBuckets] = useState<DataBucket[]>([]);

  // Field mapping state for CSV imports
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Current bucket age info
  const [currentBucketAge, setCurrentBucketAge] = useState<{
    uploadedAt: Date | null;
    ageInDays: number;
    ageFreshness: "fresh" | "recent" | "aging" | "stale";
  }>({ uploadedAt: null, ageInDays: 0, ageFreshness: "fresh" });

  // Leads list state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  // Enrichment progress state
  const [enrichProgress, setEnrichProgress] = useState<{
    total: number;
    processed: number;
    successful: number;
    withPhones: number;
  } | null>(null);
  const [showEnrichDialog, setShowEnrichDialog] = useState(false);

  // SMS state
  const [showSmsDialog, setShowSmsDialog] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [smsProgress, setSmsProgress] = useState<{
    sent: number;
    failed: number;
    total: number;
  } | null>(null);
  const [scheduleMode, setScheduleMode] = useState<"instant" | "scheduled">(
    "instant",
  );
  const [scheduledTime, setScheduledTime] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Contextual SMS Templates - based on lead signals
  const smsTemplates = [
    {
      id: "intro-soft",
      name: "Soft Intro",
      category: "opener",
      message:
        "Hi {{name}}! Quick question - are you still running {{company}}? Would love to connect briefly.",
    },
    {
      id: "value-prop",
      name: "Value Prop",
      category: "opener",
      message:
        "Hey {{name}}, I help {{industry}} businesses increase revenue 20-30%. Worth a 5-min call? Reply YES.",
    },
    {
      id: "tired-state",
      name: "Tired State Owner",
      category: "retirement",
      message:
        "{{name}}, many {{state}} business owners are exploring exit options. Open to a confidential chat about yours?",
    },
    {
      id: "successor",
      name: "Succession Planning",
      category: "retirement",
      message:
        "Hi {{name}}, have you thought about your succession plan for {{company}}? I help owners transition smoothly.",
    },
    {
      id: "followup-1",
      name: "Follow Up #1",
      category: "followup",
      message:
        "{{name}}, just following up on my last message. Still interested in chatting? No pressure either way.",
    },
    {
      id: "followup-value",
      name: "Value Followup",
      category: "followup",
      message:
        "Hey {{name}}, quick thought: Similar {{industry}} businesses are seeing 3x ROI. Want the playbook?",
    },
    {
      id: "break-pattern",
      name: "Pattern Interrupt",
      category: "creative",
      message:
        "{{name}}, I know you're busy - this isn't a sales pitch. Just curious: what's your biggest challenge with {{company}} right now?",
    },
  ];

  // Apply template with lead data substitution
  const applyTemplate = (template: string) => {
    // Get a sample lead to show what it'll look like
    const sampleLead = leads.find((l) => selectedLeads.has(l.id));
    if (!sampleLead) {
      setSmsMessage(template);
      return;
    }

    const msg = template
      .replace(
        /\{\{name\}\}/g,
        sampleLead.firstName || sampleLead.name?.split(" ")[0] || "there",
      )
      .replace(/\{\{company\}\}/g, sampleLead.company || "your business")
      .replace(/\{\{industry\}\}/g, sampleLead.industry || "your industry")
      .replace(/\{\{state\}\}/g, sampleLead.state || "your state")
      .replace(/\{\{city\}\}/g, sampleLead.city || "your city");

    setSmsMessage(msg);
  };

  // Calculate stats from leads
  const stats = {
    totalRecords: leads.length,
    enriched: leads.filter((l) => l.phone || l.email).length,
    withPhone: leads.filter((l) => l.phone).length,
    withEmail: leads.filter((l) => l.email).length,
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA AGE UTILITIES - Track freshness of uploaded data
  // ═══════════════════════════════════════════════════════════════════════════
  const calculateDataAge = (uploadDateString: string | undefined): {
    uploadedAt: Date | null;
    ageInDays: number;
    ageFreshness: "fresh" | "recent" | "aging" | "stale";
  } => {
    if (!uploadDateString) return { uploadedAt: null, ageInDays: 0, ageFreshness: "fresh" };
    
    const uploadedAt = new Date(uploadDateString);
    const now = new Date();
    const ageInMs = now.getTime() - uploadedAt.getTime();
    const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
    
    let ageFreshness: "fresh" | "recent" | "aging" | "stale" = "fresh";
    if (ageInDays <= 7) ageFreshness = "fresh";
    else if (ageInDays <= 30) ageFreshness = "recent";
    else if (ageInDays <= 90) ageFreshness = "aging";
    else ageFreshness = "stale";
    
    return { uploadedAt, ageInDays, ageFreshness };
  };

  const getAgeBadgeColor = (freshness: string) => {
    switch (freshness) {
      case "fresh": return "bg-green-500/20 text-green-400 border-green-500/50";
      case "recent": return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case "aging": return "bg-amber-500/20 text-amber-400 border-amber-500/50";
      case "stale": return "bg-red-500/20 text-red-400 border-red-500/50";
      default: return "bg-zinc-500/20 text-zinc-400 border-zinc-500/50";
    }
  };

  const formatAge = (days: number): string => {
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FIELD MAPPING UTILITIES - Auto-detect and map CSV columns
  // ═══════════════════════════════════════════════════════════════════════════
  const autoDetectMapping = (headers: string[]): FieldMapping[] => {
    const mappings: FieldMapping[] = [];
    
    const columnPatterns: Record<string, RegExp> = {
      companyName: /^(company|company.?name|business|business.?name|org|organization)$/i,
      contactName: /^(contact|contact.?name|full.?name|name)$/i,
      firstName: /^(first|first.?name|fname|given.?name)$/i,
      lastName: /^(last|last.?name|lname|surname|family.?name)$/i,
      email: /^(email|email.?address|e-mail|mail)$/i,
      phone: /^(phone|phone.?number|telephone|tel|mobile|cell)$/i,
      address: /^(address|street|street.?address|address.?1)$/i,
      city: /^(city|town|municipality)$/i,
      state: /^(state|province|region)$/i,
      zip: /^(zip|zip.?code|postal|postal.?code|zipcode)$/i,
      county: /^(county|parish)$/i,
      website: /^(website|web|url|site|website.?url)$/i,
      employees: /^(employees|employee.?count|number.?of.?employees|staff|headcount)$/i,
      revenue: /^(revenue|annual.?revenue|sales|income)$/i,
      sicCode: /^(sic|sic.?code)$/i,
      sicDescription: /^(sic.?description|industry|sector|category)$/i,
    };
    
    for (const header of headers) {
      let matched = false;
      for (const [field, pattern] of Object.entries(columnPatterns)) {
        if (pattern.test(header.trim())) {
          mappings.push({ csvColumn: header, standardField: field });
          matched = true;
          break;
        }
      }
      if (!matched) {
        mappings.push({ csvColumn: header, standardField: "skip" });
      }
    }
    
    return mappings;
  };

  const updateFieldMapping = (csvColumn: string, newField: string) => {
    setFieldMappings(prev => 
      prev.map(m => m.csvColumn === csvColumn ? { ...m, standardField: newField } : m)
    );
  };

  const processCSVWithMapping = async () => {
    if (!pendingFile || fieldMappings.length === 0) return;
    
    // For now, redirect to import-companies with mapped data
    // In production, this would process inline
    toast.success(`Mapping configured for ${fieldMappings.filter(m => m.standardField !== "skip").length} fields`);
    setShowMappingDialog(false);
    window.location.href = `/t/${params.team}/leads/import-companies`;
  };

  // Load leads from database
  const loadLeadsFromDB = async () => {
    setIsLoadingLeads(true);
    try {
      const teamSlug = params.team as string;
      const response = await fetch(`/api/leads?teamId=${teamSlug}&limit=100`);
      const data = await response.json();
      
      if (data.leads && data.leads.length > 0) {
        const mappedLeads: Lead[] = data.leads.map((l: Record<string, unknown>) => ({
          id: l.id as string,
          name: l.name as string || "Unknown",
          firstName: (l.name as string)?.split(" ")[0] || "",
          lastName: (l.name as string)?.split(" ").slice(1).join(" ") || "",
          company: l.company as string || "",
          phone: l.phone as string || "",
          email: l.email as string || "",
          address: l.address as string || "",
          city: l.city as string || "",
          state: l.state as string || "",
          zip: l.zipCode as string || "",
          industry: l.industry as string || "",
          source: l.source as string || "database",
          enriched: !!(l.phone || l.email),
        }));
        setLeads(mappedLeads);
        setSelectedFolder("Database Leads");
      }
    } catch (error) {
      console.error("Failed to load leads from DB:", error);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  // Load datalake folders and leads on mount
  useEffect(() => {
    loadDatalakeFolders();
    loadLeadsFromDB();
  }, [params.team]);

  // Keyboard shortcuts for Pro mode - TradingView style
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Only work in Pro mode
      if (viewMode !== "pro") return;

      switch (e.key.toLowerCase()) {
        case "e":
          // Enrich selected leads
          if (selectedLeads.size > 0 && !isEnriching) {
            e.preventDefault();
            enrichSelectedLeads();
          }
          break;
        case "s":
          // Open SMS dialog
          if (selectedLeads.size > 0) {
            e.preventDefault();
            if (getSelectedPhoneCount() === 0) {
              toast.error("No phones in selected leads. Enrich first!");
            } else {
              setShowSmsDialog(true);
            }
          }
          break;
        case "a":
          // Toggle select all
          e.preventDefault();
          toggleAllLeads();
          break;
        case "escape":
          // Clear selection or close dialogs
          if (showSmsDialog) {
            setShowSmsDialog(false);
          } else if (showEnrichDialog && !isEnriching) {
            setShowEnrichDialog(false);
          } else if (showHelpModal) {
            setShowHelpModal(false);
          } else {
            setSelectedLeads(new Set());
          }
          break;
        case "?":
          // Show help modal
          e.preventDefault();
          setShowHelpModal(true);
          break;
        case "r":
          // Refresh datalake folders
          e.preventDefault();
          loadDatalakeFolders();
          toast.info("Refreshing datalake...");
          break;
        case "i":
          // Quick import - trigger file upload
          e.preventDefault();
          fileInputRef.current?.click();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    viewMode,
    selectedLeads,
    isEnriching,
    showSmsDialog,
    showEnrichDialog,
    showHelpModal,
  ]);

  const loadDatalakeFolders = async () => {
    setIsLoadingDatalake(true);
    try {
      // Load both datalake folders AND buckets (CSV uploads, USBizData)
      const [datalakeRes, bucketsRes] = await Promise.all([
        fetch("/api/datalake/list?prefix=datalake/"),
        fetch("/api/buckets?perPage=100"),
      ]);

      const datalakeData = await datalakeRes.json();
      const bucketsData = await bucketsRes.json();

      if (datalakeData.success) {
        setDatalakeFolders(datalakeData.folders || []);
      }

      if (bucketsData.buckets && bucketsData.buckets.length > 0) {
        setBuckets(bucketsData.buckets);
      }
    } catch (error) {
      console.error("Failed to load datalake folders:", error);
    } finally {
      setIsLoadingDatalake(false);
    }
  };

  const pullFromDatalake = async (folder: string) => {
    setIsLoadingLeads(true);
    setSelectedFolder(folder);
    try {
      const response = await fetch(
        `/api/datalake/query?prefix=${encodeURIComponent(folder)}`,
      );
      const data = await response.json();

      if (data.success && data.records) {
        // Map datalake records to leads with all enrichment-ready fields
        const mappedLeads: Lead[] = data.records.map(
          (r: Record<string, string>, i: number) => {
            const firstName = r.first_name || r.firstName || "";
            const lastName = r.last_name || r.lastName || "";
            return {
              id: r.id || `dl-${i}`,
              name:
                r.name ||
                r.contact_name ||
                r.owner_name ||
                [firstName, lastName].filter(Boolean).join(" ") ||
                "Unknown",
              firstName,
              lastName,
              company: r.company || r.company_name || r.business_name,
              phone: r.phone || r.phone_number || r.mobile,
              email: r.email || r.email_address,
              address: r.address || r.street_address || r.property_address,
              city: r.city || r.property_city,
              state: r.state || r.property_state,
              zip: r.zip || r.postal_code || r.zipcode,
              industry: r.industry || r.sector,
              source: "datalake",
              enriched: false,
            };
          },
        );
        setLeads(mappedLeads);
        toast.success(`Loaded ${mappedLeads.length} records from datalake`);
      } else {
        toast.error(data.error || "No records found");
      }
    } catch (error) {
      toast.error("Failed to pull from datalake");
      console.error(error);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  // Load records from a bucket (USBizData, CSV uploads, etc.)
  const pullFromBucket = async (bucketId: string, bucketName: string) => {
    setIsLoadingLeads(true);
    setSelectedFolder(bucketName);
    try {
      const response = await fetch(`/api/buckets/${bucketId}`);
      const data = await response.json();

      // Set age tracking from bucket metadata
      const bucket = buckets.find(b => b.id === bucketId);
      if (bucket?.createdAt) {
        setCurrentBucketAge(calculateDataAge(bucket.createdAt));
      } else {
        setCurrentBucketAge({ uploadedAt: null, ageInDays: 0, ageFreshness: "fresh" });
      }

      if (data.records && data.records.length > 0) {
        // Map bucket records to leads
        const mappedLeads: Lead[] = data.records.map(
          (
            r: {
              id: string;
              matchingKeys?: Record<string, string | null>;
              flags?: Record<string, boolean>;
              _original?: Record<string, string>;
            },
            i: number,
          ) => {
            const keys = r.matchingKeys || {};
            const orig = r._original || {};
            return {
              id: r.id || `bucket-${i}`,
              name:
                keys.contactName ||
                orig["Contact Name"] ||
                orig["Contact"] ||
                "Unknown",
              firstName: keys.firstName || orig["First Name"] || "",
              lastName: keys.lastName || orig["Last Name"] || "",
              company:
                keys.companyName ||
                orig["Company Name"] ||
                orig["Company"] ||
                "",
              phone: orig["Phone Number"] || orig["Phone"] || "",
              email: orig["Email Address"] || orig["Email"] || "",
              address:
                keys.address || orig["Street Address"] || orig["Address"] || "",
              city: keys.city || orig["City"] || "",
              state: keys.state || orig["State"] || "",
              zip: keys.zip || orig["Zip Code"] || orig["Zip"] || "",
              industry: keys.sicDescription || orig["SIC Description"] || "",
              source: "bucket",
              enriched: r.flags?.hasPhone || r.flags?.hasEmail || false,
            };
          },
        );
        setLeads(mappedLeads);
        setWorkflowStep("enrich"); // Move to enrich step after loading
        toast.success(
          `Loaded ${mappedLeads.length} records from ${bucketName}`,
        );
      } else {
        toast.error("No records found in bucket");
      }
    } catch (error) {
      toast.error("Failed to pull from bucket");
      console.error(error);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const toggleLeadSelection = (id: string) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllLeads = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((l) => l.id)));
    }
  };

  const clearLeads = () => {
    setLeads([]);
    setSelectedLeads(new Set());
    setSelectedFolder(null);
  };

  // Get phone count for selected leads
  const getSelectedPhoneCount = () => {
    let count = 0;
    leads
      .filter((l) => selectedLeads.has(l.id))
      .forEach((lead) => {
        if (lead.phone) count++;
        if (lead.enrichedPhones?.length) count += lead.enrichedPhones.length;
      });
    return count;
  };

  // Batch enrich selected leads using skip trace
  const enrichSelectedLeads = async () => {
    if (selectedLeads.size === 0) {
      toast.error("Select leads to enrich");
      return;
    }

    const leadsToEnrich = leads.filter(
      (l) => selectedLeads.has(l.id) && !l.enriched,
    );
    if (leadsToEnrich.length === 0) {
      toast.info("All selected leads are already enriched");
      return;
    }

    // Check daily limit
    const remainingSkipTraces = WORKFLOW_CONFIG.maxSkipTracePerDay - dailyUsage.skipTracesUsed;
    if (remainingSkipTraces <= 0) {
      toast.error(`Daily skip trace limit reached (${WORKFLOW_CONFIG.maxSkipTracePerDay}/day)`);
      return;
    }

    // Cap at remaining daily limit
    const actualLeadsToEnrich = leadsToEnrich.slice(0, Math.min(leadsToEnrich.length, remainingSkipTraces));
    if (actualLeadsToEnrich.length < leadsToEnrich.length) {
      toast.warning(`Enriching ${actualLeadsToEnrich.length} of ${leadsToEnrich.length} (daily limit)`);
    }

    setIsEnriching(true);
    setShowEnrichDialog(true);
    setWorkflowStep("enrich");
    setEnrichProgress({
      total: actualLeadsToEnrich.length,
      processed: 0,
      successful: 0,
      withPhones: 0,
    });

    let successful = 0;
    let withPhones = 0;

    // Process in batches of 250 (WORKFLOW_CONFIG.skipTraceBatchSize)
    const batchSize = Math.min(WORKFLOW_CONFIG.skipTraceBatchSize, 5); // API calls in parallel
    for (let i = 0; i < actualLeadsToEnrich.length; i += batchSize) {
      const batch = actualLeadsToEnrich.slice(i, i + batchSize);

      const batchPromises = batch.map(async (lead) => {
        try {
          // Parse name if firstName/lastName not available
          let firstName = lead.firstName || "";
          let lastName = lead.lastName || "";
          if (!firstName && !lastName && lead.name) {
            const parts = lead.name.split(" ");
            firstName = parts[0] || "";
            lastName = parts.slice(1).join(" ") || "";
          }

          if (!firstName && !lastName) {
            return { leadId: lead.id, success: false, phones: [], emails: [] };
          }

          const response = await fetch("/api/skip-trace", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName,
              lastName,
              address: lead.address,
              city: lead.city,
              state: lead.state,
              zip: lead.zip,
            }),
          });

          const data = await response.json();

          if (data.success) {
            const phones =
              data.phones?.map((p: { number: string; type?: string }) => ({
                number: p.number,
                type: p.type || "unknown",
              })) || [];
            const emails =
              data.emails?.map((e: { email: string }) => e.email) || [];

            return {
              leadId: lead.id,
              success: true,
              phones,
              emails,
              phone: phones[0]?.number,
              email: emails[0],
            };
          }

          return { leadId: lead.id, success: false, phones: [], emails: [] };
        } catch {
          return { leadId: lead.id, success: false, phones: [], emails: [] };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Update leads with enrichment data
      setLeads((prev) =>
        prev.map((lead) => {
          const result = batchResults.find((r) => r.leadId === lead.id);
          if (result && result.success) {
            return {
              ...lead,
              enriched: true,
              phone: result.phone || lead.phone,
              email: result.email || lead.email,
              enrichedPhones: result.phones,
              enrichedEmails: result.emails,
            };
          }
          return lead;
        }),
      );

      // Update progress
      const batchSuccessful = batchResults.filter((r) => r.success).length;
      const batchWithPhones = batchResults.filter(
        (r) => r.phones.length > 0,
      ).length;
      successful += batchSuccessful;
      withPhones += batchWithPhones;

      setEnrichProgress((prev) =>
        prev
          ? {
              ...prev,
              processed: prev.processed + batch.length,
              successful,
              withPhones,
            }
          : null,
      );

      // Rate limit delay
      if (i + 5 < leadsToEnrich.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setIsEnriching(false);
    toast.success(`Enriched ${successful} leads - ${withPhones} with phones`);
  };

  // Send SMS to selected leads
  const sendSmsToSelected = async () => {
    const phones: string[] = [];
    leads
      .filter((l) => selectedLeads.has(l.id))
      .forEach((lead) => {
        if (lead.phone) phones.push(lead.phone);
        if (lead.enrichedPhones) {
          lead.enrichedPhones.forEach((p) => {
            if (p.number && !phones.includes(p.number)) phones.push(p.number);
          });
        }
      });

    const uniquePhones = [...new Set(phones.filter((p) => p && p.length > 5))];

    if (uniquePhones.length === 0) {
      toast.error("No phone numbers in selected leads. Enrich first!");
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
          campaignId: `datahub-sms-${Date.now()}`,
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
      toast.success(`SMS sent! ${data.sent} delivered, ${data.failed} failed`);

      setTimeout(() => {
        setShowSmsDialog(false);
        setSmsMessage("");
        setSmsProgress(null);
      }, 2000);
    } catch {
      toast.error("Failed to send SMS");
      setSmsProgress(null);
    } finally {
      setSendingSms(false);
    }
  };

  const handleQuickSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Enter a search term");
      return;
    }
    setIsSearching(true);
    window.location.href = `/t/${params.team}/leads/import-companies?q=${encodeURIComponent(searchQuery)}`;
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    // Parse CSV headers and show mapping dialog
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) {
        toast.error("CSV file is empty or has no data rows");
        return;
      }

      // Parse headers (first row)
      const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
      setCsvHeaders(headers);

      // Parse preview rows (next 3 rows)
      const previewRows = lines.slice(1, 4).map(line => {
        const values = line.split(",").map(v => v.replace(/^"|"$/g, "").trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ""; });
        return row;
      });
      setCsvPreview(previewRows);

      // Auto-detect mappings
      const autoMappings = autoDetectMapping(headers);
      // Add sample values
      autoMappings.forEach(m => {
        m.sampleValue = previewRows[0]?.[m.csvColumn] || "";
      });
      setFieldMappings(autoMappings);

      setPendingFile(file);
      setShowMappingDialog(true);
      setWorkflowStep("map");
      
      toast.success(`CSV "${file.name}" loaded - ${headers.length} columns detected`);
    } catch (error) {
      console.error("CSV parse error:", error);
      toast.error("Failed to parse CSV file");
    }
  };

  const handleTestSkipTrace = async () => {
    setIsEnriching(true);
    try {
      const response = await fetch("/api/skip-trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "John",
          lastName: "Smith",
          address: "123 Main St",
          city: "Brooklyn",
          state: "NY",
          zip: "11201",
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `Skip trace working! Found ${data.phones?.length || 0} phones, ${data.emails?.length || 0} emails`,
        );
      } else if (data.error) {
        toast.error(`Skip trace error: ${data.error}`);
      } else {
        toast.info("Skip trace returned no results for test data");
      }
    } catch (error) {
      toast.error("Failed to test skip trace. Check API key.");
    } finally {
      setIsEnriching(false);
    }
  };

  // ========== SIMPLE MODE ==========
  const SimpleView = () => (
    <div className="space-y-6">
      {/* Header + End-to-End Guide */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-black text-white mb-3">DATA HUB</h1>
        <p className="text-2xl text-zinc-400 mb-6">
          Your Lead Generation Command Center
        </p>

        {/* END TO END WORKFLOW GUIDE */}
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-2xl p-6 border-2 border-zinc-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2">
            <Target className="h-6 w-6 text-green-400" />
            HOW TO MAKE MONEY - END TO END
          </h2>
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="p-3 bg-blue-600/20 rounded-lg border border-blue-500/50">
              <div className="text-3xl mb-1">1️⃣</div>
              <p className="text-blue-400 font-bold text-sm">GET DATA</p>
              <p className="text-xs text-zinc-500">
                Upload CSV or pull from Datalake
              </p>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="h-8 w-8 text-zinc-600" />
            </div>
            <div className="p-3 bg-amber-600/20 rounded-lg border border-amber-500/50">
              <div className="text-3xl mb-1">2️⃣</div>
              <p className="text-amber-400 font-bold text-sm">SKIP TRACE</p>
              <p className="text-xs text-zinc-500">
                Get personal phones & emails
              </p>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="h-8 w-8 text-zinc-600" />
            </div>
            <div className="p-3 bg-green-600/20 rounded-lg border border-green-500/50">
              <div className="text-3xl mb-1">3️⃣</div>
              <p className="text-green-400 font-bold text-sm">EXECUTE</p>
              <p className="text-xs text-zinc-500">SMS, Call, or Sequence</p>
            </div>
          </div>
          <p className="text-zinc-500 text-sm mt-4">
            💡 Pro tip: Use the{" "}
            <span className="text-purple-400 font-semibold">
              10-Touch Sequence
            </span>{" "}
            for automated 30-day outreach
          </p>
        </div>
      </div>

      {/* Stats - Compact Row */}
      <div className="grid grid-cols-4 gap-3 max-w-4xl mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
          <Database className="h-5 w-5 text-blue-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">
            {stats.totalRecords.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500">Records</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
          <CheckCircle2 className="h-5 w-5 text-green-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">
            {stats.enriched.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500">Enriched</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
          <Phone className="h-5 w-5 text-purple-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">
            {stats.withPhone.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500">Phones</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
          <Mail className="h-5 w-5 text-orange-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">
            {stats.withEmail.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500">Emails</p>
        </div>
      </div>

      {/* 3 BIG STEPS */}
      <div className="max-w-5xl mx-auto space-y-6">
        {/* STEP 1 - GET DATA - BIG */}
        <Card className="bg-zinc-900 border-4 border-blue-500">
          <CardContent className="p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl font-black text-white shadow-lg shadow-blue-500/30">
                1
              </div>
              <div>
                <h2 className="text-3xl font-black text-white">
                  GET YOUR DATA
                </h2>
                <p className="text-xl text-zinc-400">
                  Upload CSV, Pull from Datalake, or Search Apollo
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Button
                className="h-32 text-xl bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white flex flex-col gap-3 shadow-xl shadow-blue-500/20 border-2 border-blue-400"
                onClick={handleFileUpload}
              >
                <Upload className="h-12 w-12" />
                UPLOAD CSV
                <span className="text-sm font-normal opacity-80">
                  Any CSV file
                </span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
                aria-label="Upload CSV file"
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="h-32 text-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white flex flex-col gap-3 shadow-xl shadow-purple-500/20 border-2 border-purple-400"
                    disabled={isLoadingDatalake}
                  >
                    {isLoadingDatalake ? (
                      <Loader2 className="h-12 w-12 animate-spin" />
                    ) : (
                      <HardDrive className="h-12 w-12" />
                    )}
                    DATALAKE
                    <span className="text-sm font-normal opacity-80 flex items-center gap-1">
                      Pull stored data <ChevronDown className="h-4 w-4" />
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 bg-zinc-900 border-zinc-700 max-h-96 overflow-y-auto">
                  {/* BUCKETS - CSV uploads, USBizData, etc. with AGE TRACKING */}
                  {buckets.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-semibold text-purple-400 border-b border-zinc-700 mb-1">
                        YOUR DATA ({buckets.length})
                      </div>
                      {buckets.slice(0, 10).map((bucket) => {
                        const age = calculateDataAge(bucket.createdAt);
                        return (
                          <DropdownMenuItem
                            key={bucket.id}
                            onClick={() => pullFromBucket(bucket.id, bucket.name)}
                            className="text-white hover:bg-zinc-800 cursor-pointer py-2"
                          >
                            <Database className="h-4 w-4 mr-2 text-green-400 flex-shrink-0" />
                            <div className="flex-1 overflow-hidden min-w-0">
                              <div className="truncate text-sm font-medium">
                                {bucket.name}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <span>{bucket.totalLeads?.toLocaleString() || 0} records</span>
                                {age.uploadedAt && (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getAgeBadgeColor(age.ageFreshness)}`}>
                                    {formatAge(age.ageInDays)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                      {buckets.length > 10 && (
                        <div className="px-2 py-1 text-xs text-zinc-500">
                          +{buckets.length - 10} more...
                        </div>
                      )}
                    </>
                  )}

                  {/* DATALAKE FOLDERS */}
                  {datalakeFolders.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-semibold text-blue-400 border-b border-zinc-700 mb-1 mt-2">
                        DATALAKE FOLDERS
                      </div>
                      {datalakeFolders.map((folder) => (
                        <DropdownMenuItem
                          key={folder.path}
                          onClick={() => pullFromDatalake(folder.path)}
                          className="text-white hover:bg-zinc-800 cursor-pointer"
                        >
                          <HardDrive className="h-4 w-4 mr-2 text-blue-400" />
                          {folder.path
                            .replace("datalake/", "")
                            .replace("/", "") || "Root"}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  {/* Empty state */}
                  {buckets.length === 0 && datalakeFolders.length === 0 && (
                    <DropdownMenuItem disabled className="text-zinc-500">
                      No data found. Upload a CSV to get started!
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    onClick={loadDatalakeFolders}
                    className="text-zinc-400 hover:bg-zinc-800 cursor-pointer border-t border-zinc-700 mt-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search Apollo for B2B contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleQuickSearch()}
                    className="h-20 text-lg bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                  <Button
                    onClick={handleQuickSearch}
                    disabled={isSearching}
                    className="h-20 w-24 bg-gradient-to-br from-cyan-500 to-cyan-700 hover:from-cyan-600 hover:to-cyan-800 shadow-lg"
                  >
                    {isSearching ? (
                      <Loader2 className="h-10 w-10 animate-spin" />
                    ) : (
                      <Search className="h-10 w-10" />
                    )}
                  </Button>
                </div>
                <span className="text-sm text-zinc-500 text-center">
                  Search 200M+ Apollo contacts
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* STEP 2 - ENRICH - BIG */}
        <Card className="bg-zinc-900 border-4 border-amber-500">
          <CardContent className="p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-4xl font-black text-white shadow-lg shadow-amber-500/30">
                2
              </div>
              <div>
                <h2 className="text-3xl font-black text-white">
                  ENRICH (SKIP TRACE)
                </h2>
                <p className="text-xl text-zinc-400">
                  Get personal cell phones & emails - $0.05/record
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div className="bg-zinc-800/50 p-8 rounded-xl border-2 border-amber-900/50">
                <div className="flex items-center gap-2 text-amber-400 mb-4">
                  <Sparkles className="h-8 w-8" />
                  <span className="text-2xl font-bold">What You Get:</span>
                </div>
                <ul className="text-zinc-300 space-y-3 text-xl">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
                    Personal cell phones
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
                    Personal emails
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
                    Property portfolio data
                  </li>
                </ul>
              </div>

              <Button
                className="h-40 text-2xl bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white flex flex-col gap-3 shadow-xl shadow-amber-500/20 border-2 border-amber-400"
                onClick={handleTestSkipTrace}
                disabled={isEnriching}
              >
                {isEnriching ? (
                  <>
                    <Loader2 className="h-14 w-14 animate-spin" />
                    TESTING...
                  </>
                ) : (
                  <>
                    <Zap className="h-14 w-14" />
                    TEST SKIP TRACE
                    <span className="text-sm font-normal opacity-80">
                      Try it with sample data
                    </span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* STEP 3 - EXECUTE - MASSIVE BUTTONS */}
        <Card className="bg-zinc-900 border-4 border-green-500">
          <CardContent className="p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-4xl font-black text-white shadow-lg shadow-green-500/30">
                3
              </div>
              <div>
                <h2 className="text-3xl font-black text-white">
                  EXECUTE - MAKE MONEY
                </h2>
                <p className="text-xl text-zinc-400">
                  Send SMS, Schedule Calls, Push to Sequences
                </p>
              </div>
            </div>

            {/* ROW 1 - Primary Actions */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <Link href={`/t/${params.team}/sms-queue`} className="block">
                <Button className="w-full h-32 text-2xl bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white flex flex-col gap-3 shadow-xl shadow-green-500/20 border-2 border-green-400">
                  <MessageSquare className="h-12 w-12" />
                  SEND SMS
                  <span className="text-sm font-normal opacity-80">
                    Blast to all phones
                  </span>
                </Button>
              </Link>
              <Link href={`/t/${params.team}/calendar`} className="block">
                <Button className="w-full h-32 text-2xl bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white flex flex-col gap-3 shadow-xl shadow-blue-500/20 border-2 border-blue-400">
                  <CalendarPlus className="h-12 w-12" />
                  SCHEDULE CALLS
                  <span className="text-sm font-normal opacity-80">
                    Push to Calendar
                  </span>
                </Button>
              </Link>
            </div>

            {/* ROW 2 - Secondary Actions */}
            <div className="grid grid-cols-3 gap-4">
              <Link href={`/t/${params.team}/call-center`} className="block">
                <Button className="w-full h-24 text-xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white flex flex-col gap-2 shadow-lg">
                  <PhoneCall className="h-10 w-10" />
                  POWER DIALER
                </Button>
              </Link>
              <Link href={`/t/${params.team}/campaigns`} className="block">
                <Button className="w-full h-24 text-xl bg-gradient-to-br from-purple-600 to-violet-700 hover:from-purple-700 hover:to-violet-800 text-white flex flex-col gap-2 shadow-lg shadow-purple-500/20">
                  <Zap className="h-10 w-10" />
                  10-TOUCH SEQUENCE
                </Button>
              </Link>
              <Link href={`/t/${params.team}/inbox`} className="block">
                <Button className="w-full h-24 text-xl bg-gradient-to-br from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white flex flex-col gap-2 shadow-lg">
                  <Inbox className="h-10 w-10" />
                  INBOX
                </Button>
              </Link>
            </div>

            {/* Quick tip */}
            <div className="mt-6 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
              <div className="flex items-center gap-3">
                <Target className="h-6 w-6 text-green-400" />
                <div>
                  <p className="text-white font-semibold">
                    Pro Tip: The 10-Touch Sequence
                  </p>
                  <p className="text-zinc-400 text-sm">
                    Automated 30-day outreach: SMS → Call → Email → Repeat. Set
                    it and forget it.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-zinc-500 ml-auto" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LEADS TABLE - Shows after data is loaded with AGE TRACKING */}
        {leads.length > 0 && (
          <Card className="bg-zinc-900 border border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white">
                    Loaded Data
                    {selectedFolder && (
                      <span className="text-sm font-normal text-zinc-400 ml-2">
                        from {selectedFolder.replace("datalake/", "")}
                      </span>
                    )}
                  </h3>
                  <span className="text-sm text-zinc-500">
                    {leads.length} records
                    {selectedLeads.size > 0 &&
                      ` (${selectedLeads.size} selected)`}
                  </span>
                  {/* Data Age Badge */}
                  {currentBucketAge.uploadedAt && (
                    <span className={`px-2 py-0.5 rounded text-xs border ${getAgeBadgeColor(currentBucketAge.ageFreshness)}`}>
                      📅 {formatAge(currentBucketAge.ageInDays)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedLeads.size > 0 && (
                    <>
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700"
                        onClick={enrichSelectedLeads}
                        disabled={isEnriching}
                      >
                        {isEnriching ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-1" />
                        )}
                        Enrich ({selectedLeads.size})
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          if (getSelectedPhoneCount() === 0) {
                            toast.error(
                              "No phones in selected leads. Enrich first!",
                            );
                            return;
                          }
                          setShowSmsDialog(true);
                        }}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        SMS ({getSelectedPhoneCount()})
                      </Button>
                      <Link href={`/t/${params.team}/call-center`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-zinc-600"
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Call
                        </Button>
                      </Link>
                    </>
                  )}
                  <Link href={`/t/${params.team}/inbox`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Inbox className="h-4 w-4 mr-1" />
                      Inbox
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearLeads}
                    className="text-zinc-400 hover:text-red-400"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-800 hover:bg-zinc-800">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            leads.length > 0 &&
                            selectedLeads.size === leads.length
                          }
                          onCheckedChange={toggleAllLeads}
                        />
                      </TableHead>
                      <TableHead className="text-zinc-300">Name</TableHead>
                      <TableHead className="text-zinc-300">Company</TableHead>
                      <TableHead className="text-zinc-300">Phone</TableHead>
                      <TableHead className="text-zinc-300">Email</TableHead>
                      <TableHead className="text-zinc-300">City</TableHead>
                      <TableHead className="text-zinc-300">State</TableHead>
                      <TableHead className="text-zinc-300">Industry</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingLeads ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-400" />
                          <p className="text-zinc-500 mt-2">Loading data...</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      leads.slice(0, 100).map((lead) => (
                        <TableRow
                          key={lead.id}
                          className={`hover:bg-zinc-800 ${selectedLeads.has(lead.id) ? "bg-blue-900/20" : ""}`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedLeads.has(lead.id)}
                              onCheckedChange={() =>
                                toggleLeadSelection(lead.id)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-white font-medium">
                            {lead.name}
                          </TableCell>
                          <TableCell className="text-zinc-300">
                            {lead.company || "-"}
                          </TableCell>
                          <TableCell>
                            {lead.phone ? (
                              <span className="text-green-400">
                                {lead.phone}
                              </span>
                            ) : (
                              <span className="text-zinc-600">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {lead.email ? (
                              <span className="text-blue-400">
                                {lead.email}
                              </span>
                            ) : (
                              <span className="text-zinc-600">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-zinc-300">
                            {lead.city || "-"}
                          </TableCell>
                          <TableCell className="text-zinc-300">
                            {lead.state || "-"}
                          </TableCell>
                          <TableCell className="text-zinc-400">
                            {lead.industry || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {leads.length > 100 && (
                <p className="text-xs text-zinc-500 text-center mt-2">
                  Showing first 100 of {leads.length} records
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  // ========== PRO MODE (Trading Terminal Style) ==========
  const ProView = () => (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-zinc-950 border-b border-zinc-800 p-2 flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          onClick={handleFileUpload}
        >
          <Upload className="h-4 w-4 mr-1" />
          Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
          aria-label="Upload CSV file"
        />
        <Button
          size="sm"
          variant="ghost"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
        <div className="h-4 w-px bg-zinc-700" />
        <Button
          size="sm"
          variant="ghost"
          className="text-amber-400 hover:text-amber-300 hover:bg-zinc-800"
          onClick={handleTestSkipTrace}
          disabled={isEnriching}
        >
          {isEnriching ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Zap className="h-4 w-4 mr-1" />
          )}
          Enrich
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <Filter className="h-4 w-4 mr-1" />
          Filter
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            loadDatalakeFolders();
            loadLeadsFromDB();
            toast.success("Refreshing data...");
          }}
          disabled={isLoadingLeads}
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingLeads ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <div className="flex-1" />
        <div className="flex gap-1">
          <Input
            placeholder="Quick search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuickSearch()}
            className="h-8 w-64 bg-zinc-900 border-zinc-700 text-white text-sm"
          />
          <Button
            size="sm"
            onClick={handleQuickSearch}
            disabled={isSearching}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Trading Terminal Style */}
        <div className="w-52 bg-zinc-950 border-r border-zinc-800 p-3 space-y-3 flex flex-col">
          {/* Live Metrics Panel */}
          <div className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live Metrics
          </div>

          <div className="bg-zinc-900 rounded p-2 border border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-zinc-500">RECORDS</span>
              </div>
              <span className="text-xs font-mono text-zinc-600">100%</span>
            </div>
            <p className="text-2xl font-mono font-bold text-white">
              {stats.totalRecords.toLocaleString()}
            </p>
          </div>

          <div className="bg-zinc-900 rounded p-2 border border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-xs text-zinc-500">ENRICHED</span>
              </div>
              <span className="text-xs font-mono text-green-400">
                {stats.totalRecords > 0
                  ? Math.round((stats.enriched / stats.totalRecords) * 100)
                  : 0}
                %
              </span>
            </div>
            <p className="text-2xl font-mono font-bold text-green-400">
              {stats.enriched.toLocaleString()}
            </p>
            <div className="mt-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{
                  width: `${stats.totalRecords > 0 ? (stats.enriched / stats.totalRecords) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-zinc-900 rounded p-2 border border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-zinc-500">PHONES</span>
              </div>
              <span className="text-xs font-mono text-purple-400">
                {stats.totalRecords > 0
                  ? Math.round((stats.withPhone / stats.totalRecords) * 100)
                  : 0}
                %
              </span>
            </div>
            <p className="text-2xl font-mono font-bold text-purple-400">
              {stats.withPhone.toLocaleString()}
            </p>
            <div className="mt-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-300"
                style={{
                  width: `${stats.totalRecords > 0 ? (stats.withPhone / stats.totalRecords) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-zinc-900 rounded p-2 border border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-orange-400" />
                <span className="text-xs text-zinc-500">EMAILS</span>
              </div>
              <span className="text-xs font-mono text-orange-400">
                {stats.totalRecords > 0
                  ? Math.round((stats.withEmail / stats.totalRecords) * 100)
                  : 0}
                %
              </span>
            </div>
            <p className="text-2xl font-mono font-bold text-orange-400">
              {stats.withEmail.toLocaleString()}
            </p>
            <div className="mt-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all duration-300"
                style={{
                  width: `${stats.totalRecords > 0 ? (stats.withEmail / stats.totalRecords) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="h-px bg-zinc-800 my-2" />

          {/* Hotkeys Panel - TradingView Style */}
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            Hotkeys
          </div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between text-zinc-400">
              <span className="px-1.5 py-0.5 bg-amber-900/50 rounded text-amber-400 border border-amber-800">
                E
              </span>
              <span>Enrich</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span className="px-1.5 py-0.5 bg-green-900/50 rounded text-green-400 border border-green-800">
                S
              </span>
              <span>SMS</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span className="px-1.5 py-0.5 bg-blue-900/50 rounded text-blue-400 border border-blue-800">
                A
              </span>
              <span>Select All</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300">
                I
              </span>
              <span>Import</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300">
                R
              </span>
              <span>Refresh</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300">
                ?
              </span>
              <span>Help</span>
            </div>
          </div>

          <div className="h-px bg-zinc-800 my-2" />

          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            Quick Actions
          </div>

          <Link href={`/t/${params.team}/sms-queue`}>
            <Button
              size="sm"
              variant="ghost"
              className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <MessageSquare className="h-4 w-4 mr-2 text-blue-400" />
              SMS Queue
            </Button>
          </Link>
          <Link href={`/t/${params.team}/call-center`}>
            <Button
              size="sm"
              variant="ghost"
              className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Phone className="h-4 w-4 mr-2 text-green-400" />
              Call Center
            </Button>
          </Link>
          <Link href={`/t/${params.team}/campaigns`}>
            <Button
              size="sm"
              variant="ghost"
              className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Zap className="h-4 w-4 mr-2 text-purple-400" />
              Sequences
            </Button>
          </Link>
          <Link href={`/t/${params.team}/leads`}>
            <Button
              size="sm"
              variant="ghost"
              className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Database className="h-4 w-4 mr-2 text-amber-400" />
              All Leads
            </Button>
          </Link>
        </div>

        {/* Center - Data Grid */}
        <div className="flex-1 bg-zinc-900 p-4 flex flex-col">
          {isLoadingLeads ? (
            <div className="flex-1 border border-zinc-800 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
                <p className="text-zinc-400 text-lg mb-2">Loading leads...</p>
                <p className="text-zinc-600 text-sm">Fetching from database</p>
              </div>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex-1 border border-zinc-800 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Terminal className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500 text-lg mb-2">No data loaded</p>
                <p className="text-zinc-600 text-sm mb-4">
                  Import a CSV, pull from datalake, or search Apollo
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadLeadsFromDB}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleFileUpload}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={isLoadingDatalake}
                      >
                        {isLoadingDatalake ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <HardDrive className="h-4 w-4 mr-2" />
                        )}
                        Datalake
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-700">
                      {datalakeFolders.length === 0 ? (
                        <DropdownMenuItem disabled className="text-zinc-500">
                          No folders found
                        </DropdownMenuItem>
                      ) : (
                        datalakeFolders.map((folder) => (
                          <DropdownMenuItem
                            key={folder.path}
                            onClick={() => pullFromDatalake(folder.path)}
                            className="text-white hover:bg-zinc-800 cursor-pointer"
                          >
                            <Database className="h-4 w-4 mr-2 text-purple-400" />
                            {folder.path
                              .replace("datalake/", "")
                              .replace("/", "") || "Root"}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Link href={`/t/${params.team}/leads/import-companies`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search Apollo
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Header row with actions */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-400">
                    {leads.length} records
                    {selectedFolder && (
                      <span className="text-zinc-500 ml-1">
                        from {selectedFolder.replace("datalake/", "")}
                      </span>
                    )}
                  </span>
                  {selectedLeads.size > 0 && (
                    <span className="text-sm text-blue-400">
                      ({selectedLeads.size} selected)
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedLeads.size > 0 && (
                    <>
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700"
                        onClick={enrichSelectedLeads}
                        disabled={isEnriching}
                      >
                        {isEnriching ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-1" />
                        )}
                        Enrich ({selectedLeads.size})
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          if (getSelectedPhoneCount() === 0) {
                            toast.error(
                              "No phones in selected leads. Enrich first!",
                            );
                            return;
                          }
                          setShowSmsDialog(true);
                        }}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        SMS ({getSelectedPhoneCount()})
                      </Button>
                      <Link href={`/t/${params.team}/call-center`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-zinc-600"
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Call
                        </Button>
                      </Link>
                    </>
                  )}
                  <Link href={`/t/${params.team}/inbox`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Inbox className="h-4 w-4 mr-1" />
                      Inbox
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearLeads}
                    className="text-zinc-400 hover:text-red-400"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>

              {/* Data table */}
              <div className="flex-1 border border-zinc-800 rounded-lg overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-zinc-800 z-10">
                    <TableRow className="hover:bg-zinc-800">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            leads.length > 0 &&
                            selectedLeads.size === leads.length
                          }
                          onCheckedChange={toggleAllLeads}
                        />
                      </TableHead>
                      <TableHead className="text-zinc-300 font-mono text-xs">
                        NAME
                      </TableHead>
                      <TableHead className="text-zinc-300 font-mono text-xs">
                        COMPANY
                      </TableHead>
                      <TableHead className="text-zinc-300 font-mono text-xs">
                        PHONE
                      </TableHead>
                      <TableHead className="text-zinc-300 font-mono text-xs">
                        EMAIL
                      </TableHead>
                      <TableHead className="text-zinc-300 font-mono text-xs">
                        CITY
                      </TableHead>
                      <TableHead className="text-zinc-300 font-mono text-xs">
                        STATE
                      </TableHead>
                      <TableHead className="text-zinc-300 font-mono text-xs">
                        INDUSTRY
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingLeads ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-400" />
                          <p className="text-zinc-500 mt-2">Loading data...</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      leads.map((lead) => (
                        <TableRow
                          key={lead.id}
                          className={`hover:bg-zinc-800 font-mono text-sm ${selectedLeads.has(lead.id) ? "bg-blue-900/20" : ""}`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedLeads.has(lead.id)}
                              onCheckedChange={() =>
                                toggleLeadSelection(lead.id)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-white">
                            {lead.name}
                          </TableCell>
                          <TableCell className="text-zinc-300">
                            {lead.company || "-"}
                          </TableCell>
                          <TableCell>
                            {lead.phone ? (
                              <span className="text-green-400">
                                {lead.phone}
                              </span>
                            ) : (
                              <span className="text-zinc-600">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {lead.email ? (
                              <span className="text-blue-400 truncate max-w-[200px] inline-block">
                                {lead.email}
                              </span>
                            ) : (
                              <span className="text-zinc-600">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-zinc-300">
                            {lead.city || "-"}
                          </TableCell>
                          <TableCell className="text-zinc-300">
                            {lead.state || "-"}
                          </TableCell>
                          <TableCell className="text-zinc-400">
                            {lead.industry || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-zinc-950 border-t border-zinc-800 px-3 py-1 flex items-center text-xs text-zinc-500">
        <span className="text-green-400 mr-2 animate-pulse">●</span>
        <span>Connected</span>
        <span className="mx-2">|</span>
        <span>Skip Trace: $0.05/record</span>
        <span className="mx-2">|</span>
        <span>Daily Limit: 2,000</span>
        <span className="mx-2">|</span>
        <span className="text-blue-400">
          {selectedLeads.size > 0
            ? `${selectedLeads.size} selected`
            : "No selection"}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setShowHelpModal(true)}
          className="hover:text-white transition-colors flex items-center gap-1"
        >
          <Keyboard className="h-3 w-3" />
          Press ? for shortcuts
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* View Mode Toggle */}
      <div className="fixed top-4 right-4 z-50 flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
        <Button
          size="sm"
          variant={viewMode === "simple" ? "default" : "ghost"}
          onClick={() => setViewMode("simple")}
          className={
            viewMode === "simple"
              ? "bg-blue-600"
              : "text-zinc-400 hover:text-white"
          }
        >
          <LayoutGrid className="h-4 w-4 mr-1" />
          Simple
        </Button>
        <Button
          size="sm"
          variant={viewMode === "pro" ? "default" : "ghost"}
          onClick={() => setViewMode("pro")}
          className={
            viewMode === "pro"
              ? "bg-blue-600"
              : "text-zinc-400 hover:text-white"
          }
        >
          <Terminal className="h-4 w-4 mr-1" />
          Pro
        </Button>
      </div>

      {/* Render active view */}
      <div className={viewMode === "simple" ? "p-6" : ""}>
        {viewMode === "simple" ? <SimpleView /> : <ProView />}
      </div>

      {/* Enrichment Progress Dialog */}
      <Dialog open={showEnrichDialog} onOpenChange={setShowEnrichDialog}>
        <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-amber-500" />
              {isEnriching ? "Enriching Leads..." : "Enrichment Complete"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {enrichProgress && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Progress</span>
                    <span className="text-white">
                      {enrichProgress.processed} / {enrichProgress.total}
                    </span>
                  </div>
                  <Progress
                    value={
                      (enrichProgress.processed / enrichProgress.total) * 100
                    }
                    className="h-2"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-zinc-800 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">
                      {enrichProgress.successful}
                    </div>
                    <div className="text-xs text-zinc-500">Successful</div>
                  </div>
                  <div className="p-3 bg-zinc-800 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">
                      {enrichProgress.withPhones}
                    </div>
                    <div className="text-xs text-zinc-500">With Phones</div>
                  </div>
                  <div className="p-3 bg-zinc-800 rounded-lg">
                    <div className="text-2xl font-bold text-zinc-400">
                      {enrichProgress.total - enrichProgress.processed}
                    </div>
                    <div className="text-xs text-zinc-500">Remaining</div>
                  </div>
                </div>
              </>
            )}

            {!isEnriching && enrichProgress && (
              <p className="text-sm text-zinc-400 text-center">
                Ready to send SMS or make calls to enriched leads!
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEnrichDialog(false)}
              disabled={isEnriching}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
            >
              {isEnriching ? "Processing..." : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMS Dialog - Enhanced with contextual templates */}
      <Dialog open={showSmsDialog} onOpenChange={setShowSmsDialog}>
        <DialogContent className="sm:max-w-[600px] bg-zinc-900 border-zinc-700 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Send className="h-5 w-5 text-green-500" />
              SMS Command Center
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-800 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-400">
                  {getSelectedPhoneCount()}
                </div>
                <div className="text-xs text-zinc-500">Phones</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {selectedLeads.size}
                </div>
                <div className="text-xs text-zinc-500">Leads</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-amber-400">
                  ${(getSelectedPhoneCount() * 0.008).toFixed(2)}
                </div>
                <div className="text-xs text-zinc-500">Est. Cost</div>
              </div>
            </div>

            {/* Execution Mode Toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Execution Mode
              </label>
              <div className="flex gap-2">
                <Button
                  variant={scheduleMode === "instant" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setScheduleMode("instant")}
                  className={
                    scheduleMode === "instant"
                      ? "bg-green-600"
                      : "border-zinc-600 text-zinc-300"
                  }
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Instant
                </Button>
                <Button
                  variant={scheduleMode === "scheduled" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setScheduleMode("scheduled")}
                  className={
                    scheduleMode === "scheduled"
                      ? "bg-blue-600"
                      : "border-zinc-600 text-zinc-300"
                  }
                >
                  <Activity className="h-4 w-4 mr-1" />
                  Scheduled
                </Button>
              </div>
              {scheduleMode === "scheduled" && (
                <Input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="bg-zinc-800 border-zinc-600 text-white mt-2"
                />
              )}
            </div>

            {/* Template Categories */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300">
                Contextual Templates
              </label>

              {/* Openers */}
              <div className="space-y-1">
                <div className="text-xs text-blue-400 uppercase tracking-wider">
                  Openers
                </div>
                <div className="flex flex-wrap gap-2">
                  {smsTemplates
                    .filter((t) => t.category === "opener")
                    .map((t) => (
                      <Button
                        key={t.id}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-blue-500 text-xs"
                        onClick={() => applyTemplate(t.message)}
                      >
                        {t.name}
                      </Button>
                    ))}
                </div>
              </div>

              {/* Retirement/Exit */}
              <div className="space-y-1">
                <div className="text-xs text-amber-400 uppercase tracking-wider">
                  Exit/Succession
                </div>
                <div className="flex flex-wrap gap-2">
                  {smsTemplates
                    .filter((t) => t.category === "retirement")
                    .map((t) => (
                      <Button
                        key={t.id}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-amber-500 text-xs"
                        onClick={() => applyTemplate(t.message)}
                      >
                        {t.name}
                      </Button>
                    ))}
                </div>
              </div>

              {/* Followups */}
              <div className="space-y-1">
                <div className="text-xs text-purple-400 uppercase tracking-wider">
                  Follow-Ups
                </div>
                <div className="flex flex-wrap gap-2">
                  {smsTemplates
                    .filter((t) => t.category === "followup")
                    .map((t) => (
                      <Button
                        key={t.id}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-purple-500 text-xs"
                        onClick={() => applyTemplate(t.message)}
                      >
                        {t.name}
                      </Button>
                    ))}
                </div>
              </div>

              {/* Creative */}
              <div className="space-y-1">
                <div className="text-xs text-green-400 uppercase tracking-wider">
                  Pattern Breakers
                </div>
                <div className="flex flex-wrap gap-2">
                  {smsTemplates
                    .filter((t) => t.category === "creative")
                    .map((t) => (
                      <Button
                        key={t.id}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-green-500 text-xs"
                        onClick={() => applyTemplate(t.message)}
                      >
                        {t.name}
                      </Button>
                    ))}
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Message Preview
              </label>
              <textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Select a template or type custom message..."
                className="w-full min-h-[80px] p-3 rounded-md border bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-500 font-mono text-sm"
                maxLength={160}
              />
              <div className="flex justify-between text-xs">
                <span
                  className={
                    smsMessage.length > 140 ? "text-amber-400" : "text-zinc-500"
                  }
                >
                  {smsMessage.length}/160 chars
                </span>
                <span className="text-zinc-600">
                  Variables: {"{{name}}, {{company}}, {{industry}}, {{state}}"}
                </span>
              </div>
            </div>

            {/* Progress */}
            {smsProgress && (
              <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      {smsProgress.sent}
                    </div>
                    <div className="text-xs text-zinc-500">Sent</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">
                      {smsProgress.failed}
                    </div>
                    <div className="text-xs text-zinc-500">Failed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-zinc-400">
                      {smsProgress.total}
                    </div>
                    <div className="text-xs text-zinc-500">Total</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSmsDialog(false)}
              disabled={sendingSms}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={sendSmsToSelected}
              disabled={
                sendingSms ||
                !smsMessage.trim() ||
                (scheduleMode === "scheduled" && !scheduledTime)
              }
              className={
                scheduleMode === "instant"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }
            >
              {sendingSms ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : scheduleMode === "instant" ? (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Send Now ({getSelectedPhoneCount()})
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Schedule Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Modal - Keyboard Shortcuts Reference */}
      <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
        <DialogContent className="sm:max-w-[450px] bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Keyboard className="h-5 w-5 text-blue-400" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Actions */}
            <div className="space-y-2">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                Actions
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between py-1.5 px-2 bg-zinc-800 rounded">
                  <span className="text-sm text-zinc-300">
                    Enrich selected leads
                  </span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-amber-900/50 text-amber-400 border border-amber-800 rounded">
                    E
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-1.5 px-2 bg-zinc-800 rounded">
                  <span className="text-sm text-zinc-300">
                    Open SMS Command Center
                  </span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-green-900/50 text-green-400 border border-green-800 rounded">
                    S
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-1.5 px-2 bg-zinc-800 rounded">
                  <span className="text-sm text-zinc-300">
                    Select / Deselect all
                  </span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-blue-900/50 text-blue-400 border border-blue-800 rounded">
                    A
                  </kbd>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="space-y-2">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                Navigation
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between py-1.5 px-2 bg-zinc-800 rounded">
                  <span className="text-sm text-zinc-300">Import CSV file</span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-zinc-700 text-zinc-300 border border-zinc-600 rounded">
                    I
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-1.5 px-2 bg-zinc-800 rounded">
                  <span className="text-sm text-zinc-300">
                    Refresh datalake
                  </span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-zinc-700 text-zinc-300 border border-zinc-600 rounded">
                    R
                  </kbd>
                </div>
              </div>
            </div>

            {/* General */}
            <div className="space-y-2">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                General
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between py-1.5 px-2 bg-zinc-800 rounded">
                  <span className="text-sm text-zinc-300">
                    Close dialog / Clear selection
                  </span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-zinc-700 text-zinc-300 border border-zinc-600 rounded">
                    Esc
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-1.5 px-2 bg-zinc-800 rounded">
                  <span className="text-sm text-zinc-300">Show this help</span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-zinc-700 text-zinc-300 border border-zinc-600 rounded">
                    ?
                  </kbd>
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-500 text-center pt-2 border-t border-zinc-800">
              Pro mode only. Shortcuts are disabled when typing in input fields.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════════
          FIELD MAPPING DIALOG - Visual CSV Column Mapper
          ═══════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="sm:max-w-[800px] bg-zinc-900 border-zinc-700 text-white max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <ArrowRight className="h-5 w-5 text-blue-400" />
              Map Your CSV Columns
              {pendingFile && (
                <span className="text-sm font-normal text-zinc-400 ml-2">
                  - {pendingFile.name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                <strong>Auto-detected {fieldMappings.filter(m => m.standardField !== "skip").length} mappings.</strong>{" "}
                Review and adjust column mappings below. First Name and Last Name are required for skip trace.
              </p>
            </div>

            {/* Mapping Grid */}
            <div className="border border-zinc-700 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-800 hover:bg-zinc-800">
                    <TableHead className="text-zinc-300 w-1/3">CSV Column</TableHead>
                    <TableHead className="text-zinc-300 w-1/3">Sample Value</TableHead>
                    <TableHead className="text-zinc-300 w-1/3">Map To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fieldMappings.map((mapping) => (
                    <TableRow key={mapping.csvColumn} className="hover:bg-zinc-800/50">
                      <TableCell className="font-mono text-sm text-white">
                        {mapping.csvColumn}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-400 truncate max-w-[200px]">
                        {mapping.sampleValue || "-"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mapping.standardField}
                          onValueChange={(val) => updateFieldMapping(mapping.csvColumn, val)}
                        >
                          <SelectTrigger className="w-full bg-zinc-800 border-zinc-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-700">
                            <SelectItem value="skip" className="text-zinc-400">
                              ⏭️ Skip this column
                            </SelectItem>
                            {STANDARD_FIELDS.map(field => (
                              <SelectItem 
                                key={field.key} 
                                value={field.key}
                                className={field.required ? "text-amber-400" : "text-white"}
                              >
                                {field.label} {field.required && "⭐"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Validation Summary */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                {fieldMappings.some(m => m.standardField === "firstName") ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <X className="h-4 w-4 text-red-400" />
                )}
                <span className={fieldMappings.some(m => m.standardField === "firstName") ? "text-green-400" : "text-red-400"}>
                  First Name
                </span>
              </div>
              <div className="flex items-center gap-2">
                {fieldMappings.some(m => m.standardField === "lastName") ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <X className="h-4 w-4 text-red-400" />
                )}
                <span className={fieldMappings.some(m => m.standardField === "lastName") ? "text-green-400" : "text-red-400"}>
                  Last Name
                </span>
              </div>
              <div className="flex items-center gap-2">
                {fieldMappings.some(m => m.standardField === "address") ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <span className="h-4 w-4 text-zinc-500">○</span>
                )}
                <span className="text-zinc-400">Address (optional)</span>
              </div>
            </div>

            {/* Preview Section */}
            {csvPreview.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-zinc-500 uppercase tracking-wider">
                  Data Preview (first {csvPreview.length} rows)
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3 overflow-x-auto">
                  <table className="text-xs font-mono">
                    <thead>
                      <tr>
                        {csvHeaders.slice(0, 6).map(h => (
                          <th key={h} className="px-2 py-1 text-left text-zinc-400">
                            {h.substring(0, 15)}
                          </th>
                        ))}
                        {csvHeaders.length > 6 && (
                          <th className="px-2 py-1 text-zinc-500">+{csvHeaders.length - 6} more</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i}>
                          {csvHeaders.slice(0, 6).map(h => (
                            <td key={h} className="px-2 py-1 text-zinc-300 truncate max-w-[120px]">
                              {row[h] || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-zinc-800 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowMappingDialog(false)}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={processCSVWithMapping}
              disabled={!fieldMappings.some(m => m.standardField === "firstName") || !fieldMappings.some(m => m.standardField === "lastName")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Continue to Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
