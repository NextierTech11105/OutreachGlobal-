"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Users,
  Zap,
  Phone,
  Send,
  Plus,
  Trash2,
  Search,
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Target,
  Layers,
  FileText,
  Download,
  Play,
  Pause,
  Settings,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * CAMPAIGN BATCH BUILDER
 *
 * The MONETIZATION ENGINE:
 * 1. ACCESS TO MILLIONS - USBizData universe (70M+) on-demand
 * 2. ECONOMICAL ENRICHMENT - Skip trace ONLY what you're about to blast
 * 3. BATCH CAMPAIGNS - 500 / 1K / 2K / 5K blocks
 * 4. WEEK 1-2: SMS BLITZ - Get 15-min meetings booked
 * 5. WEEK 3-4: AI LISTENING - Classify, prioritize, copilot inbound
 */

// Batch size options
const BATCH_SIZES = [
  {
    value: 500,
    label: "500",
    description: "Test batch",
    color: "from-blue-600 to-blue-700",
    icon: "🧪",
  },
  {
    value: 1000,
    label: "1K",
    description: "Standard",
    color: "from-green-600 to-green-700",
    icon: "✓",
  },
  {
    value: 2000,
    label: "2K",
    description: "Power",
    color: "from-yellow-600 to-yellow-700",
    icon: "⚡",
  },
  {
    value: 5000,
    label: "5K",
    description: "MEGA",
    color: "from-red-600 to-red-700",
    icon: "🚀",
  },
];

// Data cleaning schedules
const CLEANING_SCHEDULES = [
  {
    value: "weekly",
    label: "Weekly",
    description: "Phone + Email validation every 7 days",
  },
  {
    value: "biweekly",
    label: "Bi-Weekly",
    description: "Validation every 14 days",
  },
  {
    value: "monthly",
    label: "Monthly",
    description: "Standard monthly refresh",
  },
  {
    value: "quarterly",
    label: "Quarterly",
    description: "Budget-friendly quarterly clean",
  },
];

// Campaign status colors
const STATUS_COLORS = {
  draft: "bg-gray-600 text-gray-100",
  ready: "bg-blue-600 text-blue-100",
  enriching: "bg-yellow-600 text-yellow-100",
  sending: "bg-purple-600 text-purple-100",
  active: "bg-green-600 text-green-100",
  paused: "bg-orange-600 text-orange-100",
  completed: "bg-emerald-600 text-emerald-100",
};

interface SkipTracedLead {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  email?: string;
}

interface CampaignBlock {
  id: string;
  name: string;
  source: "upload" | "universe" | "retarget";
  batchSize: number;
  leadCount: number;
  enrichedCount: number;
  withPhoneCount: number;
  template: string;
  status:
    | "draft"
    | "ready"
    | "enriching"
    | "sending"
    | "active"
    | "paused"
    | "completed";
  sentCount: number;
  respondedCount: number;
  bookedCount: number;
  createdAt: Date;
  leads?: SkipTracedLead[]; // Enriched leads with phone numbers
  filters?: {
    state?: string;
    sicCode?: string;
    minEmployees?: number;
    maxEmployees?: number;
    minRevenue?: number;
    industry?: string;
  };
}

interface UploadResult {
  success: boolean;
  totalRows: number;
  inserted: number;
  errors: number;
  leadIds: string[];
}

export default function CampaignBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = (params?.team as string) || "default";

  // Campaign blocks state
  const [campaigns, setCampaigns] = useState<CampaignBlock[]>([]);
  const [selectedCampaign, setSelectedCampaign] =
    useState<CampaignBlock | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [selectedBatchSize, setSelectedBatchSize] = useState(1000);
  const [cleaningSchedule, setCleaningSchedule] = useState("monthly");
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>(
    {},
  );

  // Universe search state
  const [showUniverseSearch, setShowUniverseSearch] = useState(false);
  const [universeFilters, setUniverseFilters] = useState({
    state: "",
    sicCode: "",
    minEmployees: "",
    maxEmployees: "",
    industry: "",
  });
  const [universeResults, setUniverseResults] = useState<number>(0);
  const [searchingUniverse, setSearchingUniverse] = useState(false);

  // Enrichment state
  const [enrichingCampaign, setEnrichingCampaign] = useState<string | null>(
    null,
  );
  const [enrichProgress, setEnrichProgress] = useState({
    current: 0,
    total: 0,
    withPhone: 0,
  });

  // Send state
  const [sendingCampaign, setSendingCampaign] = useState<string | null>(null);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });

  // Template editor
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateText, setTemplateText] = useState("");

  // Loading state
  const [loading, setLoading] = useState(true);

  // Fetch campaigns on mount
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch(`/api/campaigns?teamId=${teamId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.data && Array.isArray(result.data)) {
            // Map database campaigns to CampaignBlock format
            const mappedCampaigns: CampaignBlock[] = result.data.map(
              (c: any) => ({
                id: c.id,
                name: c.name || "Unnamed Campaign",
                source: "upload" as const,
                batchSize: c.estimatedLeadsCount || 0,
                leadCount: c.estimatedLeadsCount || 0,
                enrichedCount: 0,
                withPhoneCount: 0,
                template: c.description || "",
                status: (c.status?.toLowerCase() || "draft") as any,
                sentCount: 0,
                respondedCount: 0,
                bookedCount: 0,
                createdAt: new Date(c.createdAt),
              }),
            );
            setCampaigns(mappedCampaigns);
          }
        }
      } catch (error) {
        console.error("Failed to fetch campaigns:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [teamId]);

  // Standard field schema for mapping
  const STANDARD_FIELDS = [
    { key: "company_name", label: "Company Name", required: true },
    { key: "contact_name", label: "Contact Name", required: true },
    { key: "contact_title", label: "Contact Title", required: false },
    { key: "email", label: "Email Address", required: false },
    { key: "phone", label: "Phone Number", required: true },
    { key: "street_address", label: "Street Address", required: false },
    { key: "city", label: "City", required: false },
    { key: "state", label: "State", required: true },
    { key: "zip_code", label: "Zip Code", required: false },
    { key: "sic_code", label: "SIC Code", required: false },
    { key: "employees", label: "Employees", required: false },
    { key: "revenue", label: "Annual Revenue", required: false },
  ];

  // Pre-process file to extract headers for mapping
  const preProcessFile = async (file: File) => {
    setPendingFile(file);
    const text = await file.text();
    const lines = text.split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    setCsvHeaders(headers);

    // Auto-map common field names
    const autoMappings: Record<string, string> = {};
    headers.forEach((header) => {
      const lowerHeader = header.toLowerCase().replace(/[^a-z]/g, "");
      STANDARD_FIELDS.forEach((field) => {
        const lowerKey = field.key.replace(/_/g, "");
        if (lowerHeader.includes(lowerKey) || lowerKey.includes(lowerHeader)) {
          autoMappings[field.key] = header;
        }
      });
    });
    setFieldMappings(autoMappings);
    setShowFieldMapping(true);
  };

  // Create new campaign from upload
  const handleFileUpload = async (file: File, batchSize: number) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "business");
      formData.append("batchSize", String(batchSize));
      formData.append("returnIds", "true"); // Return lead IDs for campaign
      formData.append("cleaningSchedule", cleaningSchedule);
      if (Object.keys(fieldMappings).length > 0) {
        formData.append("fieldMappings", JSON.stringify(fieldMappings));
      }

      const response = await fetch("/api/datalake/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Create campaign block from upload
        const newCampaign: CampaignBlock = {
          id: `campaign-${Date.now()}`,
          name: file.name.replace(/\.csv$/i, ""),
          source: "upload",
          batchSize: batchSize,
          leadCount: data.stats.inserted,
          enrichedCount: 0,
          withPhoneCount: 0,
          template:
            "{firstName}, saw {companyName} is doing great work. 15 min with our team could help scale faster. Worth a quick chat?",
          status: "draft",
          sentCount: 0,
          respondedCount: 0,
          bookedCount: 0,
          createdAt: new Date(),
        };

        setCampaigns((prev) => [...prev, newCampaign]);
        toast.success(
          `Imported ${data.stats.inserted} leads from ${file.name}`,
        );
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
      setUploadProgress(100);
    }
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0], 1000);
    }
  }, []);

  // Search USBizData universe
  const searchUniverse = async () => {
    setSearchingUniverse(true);
    try {
      const params = new URLSearchParams();
      if (universeFilters.state) params.append("state", universeFilters.state);
      if (universeFilters.sicCode)
        params.append("sicCode", universeFilters.sicCode);
      if (universeFilters.minEmployees)
        params.append("minEmployees", universeFilters.minEmployees);
      if (universeFilters.maxEmployees)
        params.append("maxEmployees", universeFilters.maxEmployees);
      if (universeFilters.industry)
        params.append("industry", universeFilters.industry);
      params.append("countOnly", "true");

      const response = await fetch(`/api/b2b/search?${params.toString()}`);
      const data = await response.json();

      setUniverseResults(data.total || 0);
    } catch {
      toast.error("Failed to search universe");
    } finally {
      setSearchingUniverse(false);
    }
  };

  // Create campaign from universe
  const createFromUniverse = async (batchSize: number) => {
    setSearchingUniverse(true);
    try {
      const params = new URLSearchParams();
      if (universeFilters.state) params.append("state", universeFilters.state);
      if (universeFilters.sicCode)
        params.append("sicCode", universeFilters.sicCode);
      if (universeFilters.minEmployees)
        params.append("minEmployees", universeFilters.minEmployees);
      if (universeFilters.maxEmployees)
        params.append("maxEmployees", universeFilters.maxEmployees);
      if (universeFilters.industry)
        params.append("industry", universeFilters.industry);
      params.append("limit", String(batchSize));

      const response = await fetch(`/api/b2b/search?${params.toString()}`);
      const data = await response.json();

      if (data.leads?.length > 0) {
        const newCampaign: CampaignBlock = {
          id: `campaign-${Date.now()}`,
          name: `${universeFilters.state || "National"} ${universeFilters.industry || "Business"} Campaign`,
          source: "universe",
          batchSize: batchSize,
          leadCount: data.leads.length,
          enrichedCount: 0,
          withPhoneCount: 0,
          template:
            "{firstName}, saw {companyName} is doing great work in {city}. 15 min with our team could help scale faster. Worth a quick chat?",
          status: "draft",
          sentCount: 0,
          respondedCount: 0,
          bookedCount: 0,
          createdAt: new Date(),
          filters: {
            state: universeFilters.state || undefined,
            sicCode: universeFilters.sicCode || undefined,
            minEmployees: universeFilters.minEmployees
              ? parseInt(universeFilters.minEmployees)
              : undefined,
            maxEmployees: universeFilters.maxEmployees
              ? parseInt(universeFilters.maxEmployees)
              : undefined,
            industry: universeFilters.industry || undefined,
          },
        };

        setCampaigns((prev) => [...prev, newCampaign]);
        setShowUniverseSearch(false);
        toast.success(
          `Created campaign with ${data.leads.length} leads from USBizData`,
        );
      } else {
        toast.error("No leads found matching filters");
      }
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setSearchingUniverse(false);
    }
  };

  // Skip trace campaign leads
  const skipTraceCampaign = async (campaign: CampaignBlock) => {
    setEnrichingCampaign(campaign.id);
    setEnrichProgress({ current: 0, total: campaign.leadCount, withPhone: 0 });

    try {
      // Call skip trace API with campaign ID
      const response = await fetch("/api/skip-trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          limit: campaign.batchSize,
          bulk: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEnrichProgress({
          current: data.stats?.total || 0,
          total: campaign.leadCount,
          withPhone: data.stats?.withPhones || 0,
        });

        // Extract leads with phones from skip trace results
        const enrichedLeads: SkipTracedLead[] = (data.results || [])
          .filter((r: { success: boolean; phones?: Array<{ number: string; type?: string }> }) =>
            r.success && r.phones && r.phones.length > 0
          )
          .map((r: {
            id?: string;
            input?: { propertyId?: string };
            firstName?: string;
            lastName?: string;
            ownerName?: string;
            phones?: Array<{ number: string; type?: string }>;
            emails?: Array<{ email: string }>;
          }) => {
            // Get mobile phone if available, otherwise first phone
            const mobilePhone = r.phones?.find(p => p.type?.toLowerCase() === "mobile") || r.phones?.[0];
            return {
              id: r.id || r.input?.propertyId || `lead_${Math.random().toString(36).slice(2)}`,
              phone: mobilePhone?.number || "",
              firstName: r.firstName || r.ownerName?.split(" ")[0] || "",
              lastName: r.lastName || r.ownerName?.split(" ").slice(1).join(" ") || "",
              email: r.emails?.[0]?.email,
            };
          })
          .filter((l: { phone: string }) => l.phone);

        // Update campaign with enrichment stats AND leads
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === campaign.id
              ? {
                  ...c,
                  enrichedCount: data.stats?.total || 0,
                  withPhoneCount: enrichedLeads.length,
                  leads: enrichedLeads,
                  status: enrichedLeads.length > 0 ? "ready" : "draft",
                }
              : c,
          ),
        );

        toast.success(
          `Skip traced ${data.stats?.total || 0} leads: ${enrichedLeads.length} with mobile phones`,
        );

        if (data.usage) {
          toast.info(`Daily usage: ${data.usage.today}/${data.usage.limit}`);
        }
      } else {
        toast.error(data.error || "Skip trace failed");
      }
    } catch {
      toast.error("Skip trace failed");
    } finally {
      setEnrichingCampaign(null);
    }
  };

  // Send campaign SMS blast
  const sendCampaign = async (campaign: CampaignBlock) => {
    if (!campaign.leads || campaign.leads.length === 0) {
      toast.error("No phone numbers - run skip trace first!");
      return;
    }

    setSendingCampaign(campaign.id);
    setSendProgress({ sent: 0, total: campaign.leads.length });

    try {
      // Update status to sending
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaign.id ? { ...c, status: "sending" } : c,
        ),
      );

      const response = await fetch("/api/sms/blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          template: campaign.template,
          limit: campaign.leads.length,
          leads: campaign.leads, // Pass the actual leads array
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === campaign.id
              ? {
                  ...c,
                  status: "active",
                  sentCount: data.sent || 0,
                }
              : c,
          ),
        );

        toast.success(`Sent ${data.sent || 0} SMS messages!`);
      } else {
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === campaign.id ? { ...c, status: "ready" } : c,
          ),
        );
        toast.error(data.error || "Send failed");
      }
    } catch {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, status: "ready" } : c)),
      );
      toast.error("Send failed");
    } finally {
      setSendingCampaign(null);
    }
  };

  // Delete campaign
  const deleteCampaign = (id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    toast.success("Campaign deleted");
  };

  // Save template
  const saveTemplate = (campaignId: string) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaignId ? { ...c, template: templateText } : c,
      ),
    );
    setEditingTemplate(null);
    toast.success("Template saved");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Campaign Batch Builder</h1>
        <p className="text-muted-foreground">
          Upload lists, batch them, skip trace on-demand, and blast SMS
          campaigns
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{campaigns.length}</p>
                <p className="text-sm text-blue-300">Active Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold">
                  {campaigns
                    .reduce((acc, c) => acc + c.leadCount, 0)
                    .toLocaleString()}
                </p>
                <p className="text-sm text-purple-300">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-900/50 to-green-800/30 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Phone className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold">
                  {campaigns
                    .reduce((acc, c) => acc + c.withPhoneCount, 0)
                    .toLocaleString()}
                </p>
                <p className="text-sm text-green-300">With Phone</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Send className="h-8 w-8 text-orange-400" />
              <div>
                <p className="text-2xl font-bold">
                  {campaigns
                    .reduce((acc, c) => acc + c.sentCount, 0)
                    .toLocaleString()}
                </p>
                <p className="text-sm text-orange-300">Messages Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Create Campaign */}
        <div className="space-y-6">
          {/* Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload CSV List
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  dragActive
                    ? "border-primary bg-primary/10"
                    : "border-muted-foreground/25 hover:border-primary/50",
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium mb-2">
                  Drop CSV here or click to upload
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  USBizData format: Company, Contact, Phone, Email, Address...
                </p>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  id="csv-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) preProcessFile(file);
                  }}
                />
                <Button asChild variant="outline" disabled={uploading}>
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    {uploading ? "Uploading..." : "Select File"}
                  </label>
                </Button>
              </div>

              {/* Batch Size Selector - VISUAL UI */}
              <div className="mt-6 space-y-4">
                <p className="text-sm font-medium">SELECT BATCH SIZE</p>
                <div className="grid grid-cols-4 gap-3">
                  {BATCH_SIZES.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => setSelectedBatchSize(size.value)}
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all duration-200",
                        selectedBatchSize === size.value
                          ? `border-primary bg-gradient-to-br ${size.color} text-white shadow-lg scale-105`
                          : "border-muted-foreground/20 hover:border-primary/50 bg-muted/30",
                      )}
                    >
                      <span className="text-2xl mb-1 block">{size.icon}</span>
                      <span className="text-2xl font-bold block">
                        {size.label}
                      </span>
                      <span className="text-xs opacity-80 block">
                        {size.description}
                      </span>
                      {selectedBatchSize === size.value && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Cleaning Schedule */}
              <div className="mt-6 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  DATA CLEANING SCHEDULE
                </p>
                <Select
                  value={cleaningSchedule}
                  onValueChange={setCleaningSchedule}
                >
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLEANING_SCHEDULES.map((schedule) => (
                      <SelectItem key={schedule.value} value={schedule.value}>
                        <div>
                          <span className="font-medium">{schedule.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {schedule.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  We take contactability SERIOUSLY - scheduled hygiene keeps
                  your campaigns clean.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Universe Search Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                USBizData Universe
                <Badge variant="secondary" className="ml-auto">
                  70M+
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Access millions of businesses on-demand. Only enrich what you
                campaign.
              </p>
              <Button
                onClick={() => setShowUniverseSearch(true)}
                className="w-full"
              >
                <Search className="h-4 w-4 mr-2" />
                Search Universe
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border-emerald-500/30">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-400" />
                Campaign Economics
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skip Trace Cost</span>
                  <span className="font-mono">~$0.15-0.30/record</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SMS Cost</span>
                  <span className="font-mono">~$0.02/message</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Expected Response
                  </span>
                  <span className="font-mono">2-5%</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="font-medium">1K Batch ROI</span>
                  <span className="font-mono text-emerald-400">
                    20-50 responses
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Columns - Campaign Blocks */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Campaign Blocks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No campaigns yet</p>
                  <p className="text-sm">
                    Upload a CSV or search the universe to create your first
                    campaign
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors"
                    >
                      {/* Campaign Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Badge className={STATUS_COLORS[campaign.status]}>
                            {campaign.status.toUpperCase()}
                          </Badge>
                          <h3 className="font-semibold">{campaign.name}</h3>
                          <Badge variant="outline">
                            {campaign.source === "upload" ? "CSV" : "Universe"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCampaign(campaign.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Campaign Stats */}
                      <div className="grid grid-cols-5 gap-4 mb-4">
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-lg font-bold">
                            {campaign.leadCount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Leads</p>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-lg font-bold">
                            {campaign.enrichedCount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Enriched
                          </p>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-lg font-bold text-green-400">
                            {campaign.withPhoneCount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            With Phone
                          </p>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-lg font-bold text-blue-400">
                            {campaign.sentCount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Sent</p>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-lg font-bold text-purple-400">
                            {campaign.respondedCount}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Responded
                          </p>
                        </div>
                      </div>

                      {/* Template Preview */}
                      <div className="bg-muted/30 rounded p-3 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            TEMPLATE
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTemplate(campaign.id);
                              setTemplateText(campaign.template);
                            }}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                        <p className="text-sm">{campaign.template}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {campaign.template.length} chars
                          </Badge>
                          {campaign.template.length > 160 && (
                            <Badge variant="destructive" className="text-xs">
                              Over 160!
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Skip Trace Button */}
                        <Button
                          variant="outline"
                          onClick={() => skipTraceCampaign(campaign)}
                          disabled={
                            enrichingCampaign === campaign.id ||
                            campaign.status === "active"
                          }
                        >
                          {enrichingCampaign === campaign.id ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Skip Tracing...
                            </>
                          ) : (
                            <>
                              <Phone className="h-4 w-4 mr-2" />
                              Skip Trace
                            </>
                          )}
                        </Button>

                        {/* Send Button */}
                        <Button
                          onClick={() => sendCampaign(campaign)}
                          disabled={
                            campaign.withPhoneCount === 0 ||
                            sendingCampaign === campaign.id ||
                            campaign.status === "active" ||
                            campaign.status === "sending"
                          }
                          className={cn(
                            campaign.withPhoneCount > 0
                              ? "bg-gradient-to-r from-green-600 to-emerald-600"
                              : "",
                          )}
                        >
                          {sendingCampaign === campaign.id ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : campaign.status === "active" ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Active
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Send Blast ({campaign.withPhoneCount})
                            </>
                          )}
                        </Button>

                        {/* View Responses */}
                        {campaign.sentCount > 0 && (
                          <Button
                            variant="outline"
                            onClick={() => router.push(`/t/${teamId}/inbox`)}
                          >
                            <ArrowRight className="h-4 w-4 mr-2" />
                            View Inbox
                          </Button>
                        )}
                      </div>

                      {/* Progress bars */}
                      {enrichingCampaign === campaign.id && (
                        <div className="mt-4">
                          <Progress
                            value={
                              (enrichProgress.current / enrichProgress.total) *
                              100
                            }
                            className="h-2"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Enriching: {enrichProgress.current}/
                            {enrichProgress.total} ({enrichProgress.withPhone}{" "}
                            with phone)
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Universe Search Dialog */}
      <Dialog open={showUniverseSearch} onOpenChange={setShowUniverseSearch}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Search USBizData Universe</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">State</label>
                <Select
                  value={universeFilters.state}
                  onValueChange={(v) =>
                    setUniverseFilters({ ...universeFilters, state: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All States</SelectItem>
                    <SelectItem value="NY">New York</SelectItem>
                    <SelectItem value="CA">California</SelectItem>
                    <SelectItem value="TX">Texas</SelectItem>
                    <SelectItem value="FL">Florida</SelectItem>
                    <SelectItem value="IL">Illinois</SelectItem>
                    <SelectItem value="PA">Pennsylvania</SelectItem>
                    <SelectItem value="OH">Ohio</SelectItem>
                    <SelectItem value="GA">Georgia</SelectItem>
                    <SelectItem value="NC">North Carolina</SelectItem>
                    <SelectItem value="MI">Michigan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  Industry / SIC Code
                </label>
                <Input
                  placeholder="e.g. 1711, Plumbing"
                  value={universeFilters.industry}
                  onChange={(e) =>
                    setUniverseFilters({
                      ...universeFilters,
                      industry: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Min Employees</label>
                <Input
                  type="number"
                  placeholder="1"
                  value={universeFilters.minEmployees}
                  onChange={(e) =>
                    setUniverseFilters({
                      ...universeFilters,
                      minEmployees: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max Employees</label>
                <Input
                  type="number"
                  placeholder="500"
                  value={universeFilters.maxEmployees}
                  onChange={(e) =>
                    setUniverseFilters({
                      ...universeFilters,
                      maxEmployees: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <Button
              onClick={searchUniverse}
              disabled={searchingUniverse}
              className="w-full"
            >
              {searchingUniverse ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Universe
                </>
              )}
            </Button>

            {universeResults > 0 && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-2xl font-bold">
                      {universeResults.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      matching businesses
                    </p>
                  </div>
                  <Database className="h-8 w-8 text-muted-foreground" />
                </div>

                <p className="text-sm font-medium mb-3">Select batch size:</p>
                <div className="grid grid-cols-4 gap-2">
                  {BATCH_SIZES.map((size) => (
                    <Button
                      key={size.value}
                      variant="outline"
                      onClick={() => createFromUniverse(size.value)}
                      disabled={
                        searchingUniverse || universeResults < size.value
                      }
                    >
                      {size.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Editor Dialog */}
      <Dialog
        open={editingTemplate !== null}
        onOpenChange={() => setEditingTemplate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              rows={4}
              placeholder="Your SMS template..."
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Variables: {"{firstName}"}, {"{lastName}"}, {"{companyName}"},{" "}
                {"{city}"}
              </span>
              <Badge
                variant={
                  templateText.length > 160 ? "destructive" : "secondary"
                }
              >
                {templateText.length}/160
              </Badge>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editingTemplate && saveTemplate(editingTemplate)}
            >
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Mapping Dialog - MAP YOUR LIST */}
      <Dialog open={showFieldMapping} onOpenChange={setShowFieldMapping}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Map Your List Fields
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{pendingFile?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {csvHeaders.length} columns detected
                  </p>
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Map your CSV columns to our standard fields. We'll normalize your
              data for optimal campaign performance.
            </div>

            <ScrollArea className="h-80 border rounded-lg p-4">
              <div className="space-y-3">
                {STANDARD_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center gap-4">
                    <div className="w-40 flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm",
                          field.required && "font-medium",
                        )}
                      >
                        {field.label}
                      </span>
                      {field.required && (
                        <span className="text-red-400 text-xs">*</span>
                      )}
                    </div>
                    <Select
                      value={fieldMappings[field.key] || ""}
                      onValueChange={(v) =>
                        setFieldMappings((m) => ({ ...m, [field.key]: v }))
                      }
                    >
                      <SelectTrigger className="flex-1 bg-background">
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Not mapped --</SelectItem>
                        {csvHeaders.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldMappings[field.key] && (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Batch Size in Dialog */}
            <div className="space-y-3">
              <p className="text-sm font-medium">CAMPAIGN BATCH SIZE</p>
              <div className="grid grid-cols-4 gap-2">
                {BATCH_SIZES.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setSelectedBatchSize(size.value)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all text-center",
                      selectedBatchSize === size.value
                        ? `border-primary bg-gradient-to-br ${size.color} text-white`
                        : "border-muted-foreground/20 hover:border-primary/50",
                    )}
                  >
                    <span className="text-xl font-bold">{size.label}</span>
                    <span className="text-xs block opacity-80">
                      {size.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFieldMapping(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (pendingFile) {
                  handleFileUpload(pendingFile, selectedBatchSize);
                  setShowFieldMapping(false);
                  setPendingFile(null);
                }
              }}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import & Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
