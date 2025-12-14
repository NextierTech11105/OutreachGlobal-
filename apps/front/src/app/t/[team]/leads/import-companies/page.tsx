"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCurrentTeam } from "@/features/team/team.context";
import { FacetFilterItem } from "@/features/lead/components/facet-filter-item";
import { Accordion } from "@/components/ui/accordion";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useDebounceValue } from "usehooks-ts";
import {
  SearchIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Phone,
  Mail,
  Building,
  MapPin,
  ExternalLink,
  Loader2,
  PhoneCall,
  Send,
  CalendarPlus,
  MessageSquare,
  ShieldCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/formatter";
import { LoadingOverlay } from "@/components/ui/loading/loading-overlay";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface Filters {
  [key: string]: {
    value: string[];
  };
}

function getFilterValue(filter: Filters[string]) {
  if (!filter?.value?.length) {
    return undefined;
  }
  return filter.value;
}

const defaultFilters: Filters = {
  state: { value: [] },
  industry: { value: [] },
  city: { value: [] },
  autoTag: { value: [] }, // Filter by auto-tags: blue-collar, motel-hotel, property-related
};

// Revenue range presets (in dollars)
const revenuePresets = [
  { label: "$1M - $10M", min: 1000000, max: 10000000 },
  { label: "$1M - $50M", min: 1000000, max: 50000000 },
  { label: "$10M - $50M", min: 10000000, max: 50000000 },
  { label: "$50M - $100M", min: 50000000, max: 100000000 },
  { label: "$100M+", min: 100000000, max: 10000000000 },
];

// Industries/SIC codes highly associated with property
const PROPERTY_RELATED_INDUSTRIES = [
  "real estate",
  "property management",
  "construction",
  "contractor",
  "roofing",
  "plumbing",
  "hvac",
  "electrical",
  "landscaping",
  "home services",
  "home improvement",
  "mortgage",
  "title",
  "escrow",
  "insurance",
  "appraisal",
  "inspection",
  "moving",
  "storage",
  "cleaning",
  "renovation",
  "remodeling",
  "flooring",
  "painting",
  "windows",
  "doors",
  "solar",
  "pest control",
  "security",
  "interior design",
  "architecture",
  "engineering",
];

// Blue collar / trades industries - auto-tag these
const BLUE_COLLAR_INDUSTRIES = [
  // Construction & trades
  "construction",
  "contractor",
  "general contractor",
  "subcontractor",
  "builder",
  "home builder",
  "roofing",
  "roofer",
  "plumbing",
  "plumber",
  "hvac",
  "heating",
  "air conditioning",
  "electrical",
  "electrician",
  "carpentry",
  "carpenter",
  "masonry",
  "mason",
  "concrete",
  "paving",
  "asphalt",
  "excavation",
  "demolition",
  "framing",
  "drywall",
  "insulation",
  "siding",
  "gutters",
  "fencing",
  "decking",
  "deck builder",
  // Home services
  "landscaping",
  "lawn care",
  "tree service",
  "tree removal",
  "irrigation",
  "sprinkler",
  "pool service",
  "pool maintenance",
  "pest control",
  "exterminator",
  "cleaning service",
  "janitorial",
  "pressure washing",
  "window cleaning",
  "carpet cleaning",
  "maid service",
  "handyman",
  "home repair",
  "appliance repair",
  "garage door",
  "locksmith",
  // Automotive & mechanical
  "auto repair",
  "auto body",
  "mechanic",
  "automotive",
  "car wash",
  "oil change",
  "tire",
  "towing",
  "tow truck",
  "auto parts",
  "transmission",
  "muffler",
  "brake",
  // Manufacturing & industrial
  "manufacturing",
  "fabrication",
  "welding",
  "welder",
  "machining",
  "machine shop",
  "metalwork",
  "sheet metal",
  "steel",
  "ironwork",
  "foundry",
  "assembly",
  "warehouse",
  "forklift",
  "industrial",
  // Transportation & logistics
  "trucking",
  "freight",
  "hauling",
  "delivery",
  "courier",
  "moving company",
  "movers",
  "storage",
  "logistics",
  // Utilities & infrastructure
  "utility",
  "water treatment",
  "septic",
  "sewer",
  "plumbing supply",
  "electrical supply",
  // Flooring & surfaces
  "flooring",
  "tile",
  "hardwood",
  "carpet",
  "countertop",
  "granite",
  "marble",
  // Painting & finishing
  "painting",
  "painter",
  "coatings",
  "stucco",
  "plastering",
  // Windows, doors, glass
  "windows",
  "doors",
  "glass",
  "glazing",
  "mirror",
  // Specialty trades
  "solar",
  "solar installation",
  "renewable energy",
  "fire protection",
  "sprinkler system",
  "alarm",
  "security system",
  "elevator",
  "crane",
  "scaffolding",
  "insulation",
  // Agriculture & outdoor
  "farming",
  "agriculture",
  "nursery",
  "greenhouse",
  "equipment rental",
];

// Motel/Hotel/Lodging industries
const MOTEL_HOTEL_INDUSTRIES = [
  "motel",
  "motels",
  "hotel",
  "hotels",
  "inn",
  "lodge",
  "lodging",
  "hospitality",
  "bed and breakfast",
  "b&b",
  "resort",
  "extended stay",
  "suites",
  "accommodation",
  "guest house",
  "hostel",
  "campground",
  "rv park",
  "vacation rental",
  "airbnb",
  "short term rental",
];

// Auto-tag types
type AutoTag = "blue-collar" | "motel-hotel" | "property-related";

// Check if a company is property-related
function isPropertyRelated(company: {
  industry?: string;
  name?: string;
}): boolean {
  const industry = (company.industry || "").toLowerCase();
  const name = (company.name || "").toLowerCase();

  return PROPERTY_RELATED_INDUSTRIES.some(
    (keyword) => industry.includes(keyword) || name.includes(keyword),
  );
}

// Check if a company is blue collar
function isBlueCollar(company: { industry?: string; name?: string }): boolean {
  const industry = (company.industry || "").toLowerCase();
  const name = (company.name || "").toLowerCase();

  return BLUE_COLLAR_INDUSTRIES.some(
    (keyword) => industry.includes(keyword) || name.includes(keyword),
  );
}

// Check if a company is motel/hotel
function isMotelHotel(company: { industry?: string; name?: string }): boolean {
  const industry = (company.industry || "").toLowerCase();
  const name = (company.name || "").toLowerCase();

  return MOTEL_HOTEL_INDUSTRIES.some(
    (keyword) => industry.includes(keyword) || name.includes(keyword),
  );
}

// Get all auto-tags for a company
function getAutoTags(company: { industry?: string; name?: string }): AutoTag[] {
  const tags: AutoTag[] = [];
  if (isBlueCollar(company)) tags.push("blue-collar");
  if (isMotelHotel(company)) tags.push("motel-hotel");
  if (isPropertyRelated(company)) tags.push("property-related");
  return tags;
}

interface PhoneInfo {
  number: string;
  type?: string; // 'mobile' | 'landline' | 'voip' | 'unknown'
  verified?: boolean;
  carrier?: string;
}

interface Company {
  id: string;
  name: string; // Contact name (person)
  firstName?: string;
  lastName?: string;
  title?: string; // Job title (Owner, CEO, etc.)
  companyName?: string; // Organization name
  domain: string;
  website: string;
  industry: string;
  employees: number;
  revenue: number;
  city: string;
  state: string;
  zip?: string;
  country: string;
  phone: string;
  phoneType?: string; // 'mobile' | 'landline' | 'voip' | 'unknown'
  mobile?: string; // Cell/mobile phone
  linkedin_url: string;
  founded_year: number;
  email?: string;
  // Data source tracking
  source?: "apollo" | "usbizdata";
  sourceLabel?: string;
  // Property association tag
  propertyRelated?: boolean;
  // Auto-tags based on industry
  autoTags?: AutoTag[];
  // Business address (for cross-referencing with property data)
  address?: string;
  // Enrichment data
  enriched?: boolean;
  enrichedPhones?: PhoneInfo[];
  enrichedEmails?: string[];
  ownerName?: string;
  ownerTitle?: string;
  // Property data from USBiz/RealEstateAPI cross-reference
  propertyAddresses?: Array<{
    street: string;
    city: string;
    state: string;
    zip: string;
    type?: string;
  }>;
  propertyCount?: number;
  propertyData?: {
    estimatedValue?: number;
    lastSaleDate?: string;
    lastSaleAmount?: number;
  };
}

interface EnrichmentProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
}

export default function ImportCompaniesPage() {
  useCurrentTeam(); // Ensures team context is available
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [estimatedCount, setEstimatedCount] = useState(0);
  const [hits, setHits] = useState<Company[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounceValue(query, 500);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(
    new Set(),
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Sorting state
  type SortColumn =
    | "name"
    | "companyName"
    | "state"
    | "city"
    | "industry"
    | "title";
  type SortDirection = "asc" | "desc";
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Revenue filter state
  const [revenueMin, setRevenueMin] = useState<number | undefined>(undefined);
  const [revenueMax, setRevenueMax] = useState<number | undefined>(undefined);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Enrichment state
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] =
    useState<EnrichmentProgress | null>(null);
  const [showEnrichDialog, setShowEnrichDialog] = useState(false);
  const [enrichResults, setEnrichResults] = useState<{
    successful: number;
    withPhones: number;
    withEmails: number;
    withProperties: number;
    totalProperties: number;
  } | null>(null);

  // SMS state
  const [showSmsDialog, setShowSmsDialog] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [smsProgress, setSmsProgress] = useState<{
    sent: number;
    failed: number;
    total: number;
  } | null>(null);

  // Phone validation state
  const [validatingPhones, setValidatingPhones] = useState(false);

  const searchParams = useMemo(() => {
    return {
      name: debouncedQuery || undefined,
      state: getFilterValue(filters.state),
      industry: getFilterValue(filters.industry),
      city: getFilterValue(filters.city),
      revenueMin,
      revenueMax,
    };
  }, [debouncedQuery, filters, revenueMin, revenueMax]);

  const totalFilters = useMemo(() => {
    return Object.values(filters).reduce((acc, curr) => {
      if (!curr.value.length) {
        return acc + 0;
      }
      return acc + 1;
    }, 0);
  }, [filters]);

  const clearFilters = () => {
    setFilters(defaultFilters);
    setRevenueMin(undefined);
    setRevenueMax(undefined);
    setSelectedPreset(null);
  };

  const selectRevenuePreset = (preset: (typeof revenuePresets)[0]) => {
    setRevenueMin(preset.min);
    setRevenueMax(preset.max);
    setSelectedPreset(preset.label);
  };

  const clearRevenue = () => {
    setRevenueMin(undefined);
    setRevenueMax(undefined);
    setSelectedPreset(null);
  };

  const handleFilterChange = (name: string, value: string[]) => {
    setFilters((prev) => ({
      ...prev,
      [name]: { value },
    }));
  };

  const toggleCompany = (id: string) => {
    setSelectedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedCompanies.size === hits.length) {
      setSelectedCompanies(new Set());
    } else {
      setSelectedCompanies(new Set(hits.map((c) => c.id)));
    }
  };

  // Sorting handler
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Get sorted and filtered hits (client-side sorting + autoTag filtering)
  const sortedHits = useMemo(() => {
    // First filter by autoTags if any selected
    let filtered = hits;
    if (filters.autoTag.value.length > 0) {
      filtered = hits.filter((company) => {
        const companyTags = company.autoTags || [];
        return filters.autoTag.value.some((tag) =>
          companyTags.includes(tag as AutoTag),
        );
      });
    }

    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      let aVal: string | number | undefined;
      let bVal: string | number | undefined;

      switch (sortColumn) {
        case "name":
          aVal = a.name || "";
          bVal = b.name || "";
          break;
        case "companyName":
          aVal = a.companyName || "";
          bVal = b.companyName || "";
          break;
        case "state":
          aVal = a.state || "";
          bVal = b.state || "";
          break;
        case "city":
          aVal = a.city || "";
          bVal = b.city || "";
          break;
        case "industry":
          aVal = a.industry || "";
          bVal = b.industry || "";
          break;
        case "title":
          aVal = a.title || "";
          bVal = b.title || "";
          break;
        default:
          return 0;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
        return sortDirection === "asc" ? comparison : -comparison;
      }
      return 0;
    });
  }, [hits, sortColumn, sortDirection, filters.autoTag.value]);

  // Sortable header component
  const SortableHeader = ({
    column,
    children,
  }: {
    column: SortColumn;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  const searchCompanies = async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch("/api/business-list/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...searchParams, page, per_page: 25 }),
      });
      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setEstimatedCount(data.estimatedTotalHits || 0);
      // Map API response to Company interface and tag property-related businesses
      interface ApiContact {
        id: string;
        name: string;
        firstName?: string;
        lastName?: string;
        title?: string;
        company?: string; // API returns 'company', we map to 'companyName'
        domain?: string;
        website?: string;
        industry?: string;
        employees?: number;
        revenue?: number;
        address?: string; // Street address for skip trace
        city?: string;
        state?: string;
        zip?: string; // Zip code for skip trace
        country?: string;
        phone?: string;
        mobile?: string;
        email?: string;
        linkedin_url?: string;
        source?: "apollo" | "usbizdata";
        sourceLabel?: string;
      }
      const taggedHits = (data.hits || []).map((contact: ApiContact) => ({
        ...contact,
        companyName: contact.company || "", // Map company to companyName
        propertyRelated: isPropertyRelated({
          industry: contact.industry,
          name: contact.company,
        }),
        autoTags: getAutoTags({
          industry: contact.industry,
          name: contact.company,
        }),
      }));
      setHits(taggedHits);
      setCurrentPage(data.page || page);
      setTotalPages(data.total_pages || 1);
    } catch (error) {
      toast.error("Failed to search companies");
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      searchCompanies(page);
    }
  };

  // Single company quick enrich - UPDATED TO USE APOLLO MATCH (PAID ENDPOINT)
  const enrichSingleCompany = async (companyId: string) => {
    const company = hits.find((c) => c.id === companyId);
    if (!company) return;

    // Mark as enriching in UI
    setHits((prev) =>
      prev.map((c) => (c.id === companyId ? { ...c, enriched: false } : c)),
    );

    const titlePriority = [
      "owner",
      "ceo",
      "partner",
      "sales manager",
      "founder",
      "president",
      "director",
      "vp",
      "general manager",
    ];

    try {
      // Step 1: Apollo People Search (FREE - to find decision maker name)
      let ownerFirstName = "";
      let ownerLastName = "";
      let ownerTitle = "";
      let apolloEmail = "";
      let companyPhone = "";

      const apolloResponse = await fetch("/api/people/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.name,
          domain: company.domain,
        }),
      });

      const apolloData = await apolloResponse.json();

      if (apolloData.success && apolloData.data) {
        const people = Array.isArray(apolloData.data)
          ? apolloData.data
          : [apolloData.data];
        const scoredPeople = people.map(
          (p: {
            title?: string;
            firstName?: string;
            lastName?: string;
            name?: string;
            email?: string;
          }) => {
            const title = (p.title || "").toLowerCase();
            let score = 100;
            for (let idx = 0; idx < titlePriority.length; idx++) {
              if (title.includes(titlePriority[idx])) {
                score = idx;
                break;
              }
            }
            return { ...p, score };
          },
        );

        scoredPeople.sort(
          (a: { score: number }, b: { score: number }) => a.score - b.score,
        );
        const bestPerson = scoredPeople[0];

        if (bestPerson) {
          ownerFirstName = bestPerson.firstName || "";
          ownerLastName = bestPerson.lastName || "";
          ownerTitle = bestPerson.title || "";

          if (!ownerFirstName && !ownerLastName && bestPerson.name) {
            const nameParts = bestPerson.name.split(" ");
            ownerFirstName = nameParts[0] || "";
            ownerLastName = nameParts.slice(1).join(" ") || "";
          }
        }
      }

      // Step 2: Apollo People MATCH (PAID - unlocks verified email + company phone)
      if (ownerFirstName && ownerLastName) {
        const matchResponse = await fetch("/api/enrichment/apollo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recordId: company.id,
            bucketId: "import-companies",
            firstName: ownerFirstName,
            lastName: ownerLastName,
            companyName: company.name,
            domain: company.domain,
          }),
        });

        const matchData = await matchResponse.json();

        if (matchData.success && matchData.enrichedData) {
          apolloEmail = matchData.enrichedData.email || "";
          ownerTitle = matchData.enrichedData.title || ownerTitle;
          companyPhone = matchData.enrichedData.organization?.phone || "";
        }
      }

      // Step 3: Skip trace if we have a name (for personal cell + property portfolio)
      const phones: PhoneInfo[] = companyPhone
        ? [{ number: companyPhone, type: "unknown" }]
        : [];
      let emails: string[] = apolloEmail ? [apolloEmail] : [];
      let propertyAddresses: Array<{
        street: string;
        city: string;
        state: string;
        zip: string;
      }> = [];

      if (ownerFirstName || ownerLastName) {
        // Skip trace with contact name + business property address for best results
        // RealEstateAPI expects: first_name, last_name, address, city, state, zip
        const skipTraceResponse = await fetch("/api/skip-trace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: ownerFirstName,
            lastName: ownerLastName,
            address: company.address, // Street address
            city: company.city,
            state: company.state,
            zip: company.zip,
          }),
        });

        const skipData = await skipTraceResponse.json();

        if (skipData.success) {
          // RealEstateAPI returns phones with type info: { phone, phoneType, isConnected, doNotCall }
          const skipPhones: PhoneInfo[] =
            skipData.phones?.map((p: { number: string; type?: string }) => ({
              number: p.number,
              type: p.type?.toLowerCase() || "unknown",
            })) || [];

          // Merge phones, avoiding duplicates
          const existingNumbers = new Set(phones.map((p) => p.number));
          for (const sp of skipPhones) {
            if (!existingNumbers.has(sp.number)) {
              phones.push(sp);
              existingNumbers.add(sp.number);
            }
          }

          const skipEmails =
            skipData.emails?.map((e: { email: string }) => e.email) || [];
          emails = [...new Set([...emails, ...skipEmails].filter(Boolean))];
          propertyAddresses =
            skipData.addresses
              ?.map(
                (a: {
                  street?: string;
                  address?: string;
                  city?: string;
                  state?: string;
                  zip?: string;
                }) => ({
                  street: a.street || a.address || "",
                  city: a.city || "",
                  state: a.state || "",
                  zip: a.zip || "",
                }),
              )
              .filter((a: { street: string }) => a.street) || [];
        }
      }

      // Update the company with enrichment data
      setHits((prev) =>
        prev.map((c) =>
          c.id === companyId
            ? {
                ...c,
                enriched: true,
                enrichedPhones: phones,
                enrichedEmails: emails,
                ownerName: `${ownerFirstName} ${ownerLastName}`.trim(),
                ownerTitle,
                propertyAddresses,
                propertyCount: propertyAddresses.length,
              }
            : c,
        ),
      );

      toast.success(
        `Enriched ${company.name} - ${phones.length} phones, ${emails.length} emails`,
      );
    } catch (error) {
      console.error("Single enrich error:", error);
      toast.error(`Failed to enrich ${company.name}`);
    }
  };

  // Enrich selected companies - THREE-STEP PROCESS:
  // 1. Apollo People Search (FREE) → Find decision maker name (Owner/CEO/Founder)
  // 2. Apollo People Match (PAID) → Get verified email + company phone
  // 3. RealEstateAPI Skip Trace → Get cell phone + property portfolio ($0.05/record)
  const enrichSelectedCompanies = async () => {
    if (selectedCompanies.size === 0) {
      toast.error("Select companies to enrich");
      return;
    }

    const companiesToEnrich = hits.filter((c) => selectedCompanies.has(c.id));
    setEnriching(true);
    setShowEnrichDialog(true);
    setEnrichProgress({
      total: companiesToEnrich.length,
      processed: 0,
      successful: 0,
      failed: 0,
    });
    setEnrichResults(null);

    let successful = 0;
    let withPhones = 0;
    let withEmails = 0;
    let withProperties = 0;
    let totalProperties = 0;

    // Decision maker title priority (in order of importance)
    const titlePriority = [
      "owner",
      "ceo",
      "partner",
      "sales manager",
      "founder",
      "president",
      "director",
      "vp",
      "general manager",
    ];

    // Process in batches of 5
    for (let i = 0; i < companiesToEnrich.length; i += 5) {
      const batch = companiesToEnrich.slice(i, i + 5);

      const batchPromises = batch.map(async (company) => {
        try {
          // STEP 1: Apollo People Search (FREE) to find decision maker name
          let ownerFirstName = "";
          let ownerLastName = "";
          let ownerTitle = "";
          let apolloEmail = "";
          let companyPhone = "";

          const apolloResponse = await fetch("/api/people/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company: company.name,
              domain: company.domain,
            }),
          });

          const apolloData = await apolloResponse.json();

          if (apolloData.success && apolloData.data) {
            const people = Array.isArray(apolloData.data)
              ? apolloData.data
              : [apolloData.data];

            // Score by title priority to find decision maker
            const scoredPeople = people.map(
              (p: {
                title?: string;
                firstName?: string;
                lastName?: string;
                name?: string;
                email?: string;
              }) => {
                const title = (p.title || "").toLowerCase();
                let score = 100;
                for (let idx = 0; idx < titlePriority.length; idx++) {
                  if (title.includes(titlePriority[idx])) {
                    score = idx;
                    break;
                  }
                }
                return { ...p, score };
              },
            );

            scoredPeople.sort(
              (a: { score: number }, b: { score: number }) => a.score - b.score,
            );
            const bestPerson = scoredPeople[0];

            if (bestPerson) {
              ownerFirstName = bestPerson.firstName || "";
              ownerLastName = bestPerson.lastName || "";
              ownerTitle = bestPerson.title || "";

              // If no first/last name, try to parse from full name
              if (!ownerFirstName && !ownerLastName && bestPerson.name) {
                const nameParts = bestPerson.name.split(" ");
                ownerFirstName = nameParts[0] || "";
                ownerLastName = nameParts.slice(1).join(" ") || "";
              }
            }
          }

          // STEP 2: Apollo People MATCH (PAID) to unlock verified email + company phone
          if (ownerFirstName && ownerLastName) {
            const matchResponse = await fetch("/api/enrichment/apollo", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recordId: company.id,
                bucketId: "import-companies",
                firstName: ownerFirstName,
                lastName: ownerLastName,
                companyName: company.name,
                domain: company.domain,
              }),
            });

            const matchData = await matchResponse.json();

            if (matchData.success && matchData.enrichedData) {
              apolloEmail = matchData.enrichedData.email || "";
              ownerTitle = matchData.enrichedData.title || ownerTitle;
              companyPhone = matchData.enrichedData.organization?.phone || "";
            }
          }

          // STEP 3: RealEstateAPI Skip Trace to get cell phone + property data
          // This costs $0.05 per record but gives us cell + property portfolio!
          const phones: PhoneInfo[] = companyPhone
            ? [{ number: companyPhone, type: "unknown" }]
            : [];
          let emails: string[] = apolloEmail ? [apolloEmail] : [];

          if (ownerFirstName || ownerLastName) {
            // Skip trace with contact name + business property address for best results
            // RealEstateAPI expects: first_name, last_name, address, city, state, zip
            const skipTraceResponse = await fetch("/api/skip-trace", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                firstName: ownerFirstName,
                lastName: ownerLastName,
                address: company.address, // Street address
                city: company.city,
                state: company.state,
                zip: company.zip,
              }),
            });

            const skipData = await skipTraceResponse.json();

            if (skipData.success) {
              // RealEstateAPI returns phones with type info: { phone, phoneType, isConnected, doNotCall }
              const skipPhones: PhoneInfo[] =
                skipData.phones?.map(
                  (p: { number: string; type?: string }) => ({
                    number: p.number,
                    type: p.type?.toLowerCase() || "unknown",
                  }),
                ) || [];

              // Merge phones, avoiding duplicates
              const existingNumbers = new Set(phones.map((p) => p.number));
              for (const sp of skipPhones) {
                if (!existingNumbers.has(sp.number)) {
                  phones.push(sp);
                  existingNumbers.add(sp.number);
                }
              }

              const skipEmails =
                skipData.emails?.map((e: { email: string }) => e.email) || [];
              emails = [...new Set([...emails, ...skipEmails].filter(Boolean))];

              // Parse property addresses from skip trace
              const propertyAddresses =
                skipData.addresses
                  ?.map(
                    (a: {
                      street?: string;
                      address?: string;
                      city?: string;
                      state?: string;
                      zip?: string;
                      type?: string;
                    }) => ({
                      street: a.street || a.address || "",
                      city: a.city || "",
                      state: a.state || "",
                      zip: a.zip || "",
                      type: a.type,
                    }),
                  )
                  .filter((a: { street: string }) => a.street) || [];

              return {
                companyId: company.id,
                success: true,
                phones,
                emails,
                ownerName:
                  `${ownerFirstName} ${ownerLastName}`.trim() ||
                  skipData.ownerName,
                ownerTitle,
                // Property data from USBiz datalake cross-reference!
                propertyAddresses,
                propertyCount: propertyAddresses.length,
              };
            }
          }

          // Fallback: Return Apollo data if skip trace failed
          if (apolloEmail || companyPhone) {
            return {
              companyId: company.id,
              success: true,
              phones,
              emails,
              ownerName: `${ownerFirstName} ${ownerLastName}`.trim(),
              ownerTitle,
            };
          }

          return {
            companyId: company.id,
            success: false,
            phones: [],
            emails: [],
          };
        } catch (error) {
          console.error(`Enrich error for ${company.name}:`, error);
          return {
            companyId: company.id,
            success: false,
            phones: [],
            emails: [],
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Update hits with enrichment data + property addresses
      setHits((prev) =>
        prev.map((company) => {
          const result = batchResults.find((r) => r.companyId === company.id);
          if (result) {
            return {
              ...company,
              enriched: result.success,
              enrichedPhones: result.phones as string[],
              enrichedEmails: result.emails as string[],
              ownerName: result.ownerName,
              ownerTitle: result.ownerTitle,
              propertyAddresses: result.propertyAddresses,
              propertyCount: result.propertyCount,
            };
          }
          return company;
        }),
      );

      // Update progress
      const batchSuccessful = batchResults.filter((r) => r.success).length;
      const batchWithPhones = batchResults.filter(
        (r) => r.phones.length > 0,
      ).length;
      const batchWithEmails = batchResults.filter(
        (r) => r.emails.length > 0,
      ).length;
      const batchWithProperties = batchResults.filter(
        (r) => (r.propertyCount || 0) > 0,
      ).length;
      const batchTotalProperties = batchResults.reduce(
        (sum, r) => sum + (r.propertyCount || 0),
        0,
      );

      successful += batchSuccessful;
      withPhones += batchWithPhones;
      withEmails += batchWithEmails;
      withProperties += batchWithProperties;
      totalProperties += batchTotalProperties;

      setEnrichProgress((prev) =>
        prev
          ? {
              ...prev,
              processed: prev.processed + batch.length,
              successful: prev.successful + batchSuccessful,
              failed: prev.failed + (batch.length - batchSuccessful),
            }
          : null,
      );

      // Small delay between batches to respect API rate limits
      if (i + 5 < companiesToEnrich.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setEnriching(false);
    setEnrichResults({
      successful,
      withPhones,
      withEmails,
      withProperties,
      totalProperties,
    });
    toast.success(
      `Enriched ${successful} companies - ${withPhones} phones, ${withEmails} emails, ${totalProperties} properties`,
    );
  };

  // Send SMS via SignalHouse
  const sendSmsToSelected = async () => {
    // Get phones from selected companies (both Apollo phone and enriched phones)
    // Filter out landlines - they can't receive SMS
    const phonesToSms: PhoneInfo[] = [];
    hits
      .filter((c) => selectedCompanies.has(c.id))
      .forEach((company) => {
        if (company.phone) {
          phonesToSms.push({
            number: company.phone,
            type: company.phoneType || "unknown",
          });
        }
        if (company.enrichedPhones) {
          phonesToSms.push(...company.enrichedPhones);
        }
      });

    // Deduplicate and filter out landlines
    const uniquePhonesMap = new Map<string, PhoneInfo>();
    for (const p of phonesToSms) {
      if (p.number && p.number.length > 5 && !uniquePhonesMap.has(p.number)) {
        uniquePhonesMap.set(p.number, p);
      }
    }

    // Separate by type for reporting
    const allPhones = Array.from(uniquePhonesMap.values());
    const landlines = allPhones.filter((p) => p.type === "landline");
    const smsablePhones = allPhones.filter((p) => p.type !== "landline");

    if (smsablePhones.length === 0) {
      toast.error(
        landlines.length > 0
          ? `All ${landlines.length} phone numbers are landlines (cannot receive SMS)`
          : "No phone numbers found in selected companies",
      );
      return;
    }

    if (landlines.length > 0) {
      toast.info(
        `Skipping ${landlines.length} landline number${landlines.length > 1 ? "s" : ""}`,
      );
    }

    const uniquePhones = smsablePhones.map((p) => p.number);

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
          campaignId: `company-sms-${Date.now()}`,
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
    } catch (error) {
      console.error("SMS send failed:", error);
      toast.error("Failed to send SMS");
      setSmsProgress(null);
    } finally {
      setSendingSms(false);
    }
  };

  // Get phone counts for selected companies (with type breakdown)
  const getSelectedPhoneStats = () => {
    const phones: PhoneInfo[] = [];
    hits
      .filter((c) => selectedCompanies.has(c.id))
      .forEach((company) => {
        if (company.phone)
          phones.push({
            number: company.phone,
            type: company.phoneType || "unknown",
          });
        if (company.enrichedPhones) phones.push(...company.enrichedPhones);
      });

    // Deduplicate by number
    const uniquePhones = Array.from(
      new Map(
        phones
          .filter((p) => p.number && p.number.length > 5)
          .map((p) => [p.number, p]),
      ).values(),
    );

    const mobile = uniquePhones.filter(
      (p) => p.type === "mobile" || p.type === "cell",
    ).length;
    const voip = uniquePhones.filter((p) => p.type === "voip").length;
    const landline = uniquePhones.filter((p) => p.type === "landline").length;
    const unknown = uniquePhones.filter(
      (p) => !p.type || p.type === "unknown",
    ).length;

    return {
      total: uniquePhones.length,
      mobile,
      voip,
      landline,
      unknown,
      phones: uniquePhones,
    };
  };

  // Legacy helper
  const getSelectedPhoneCount = () => getSelectedPhoneStats().total;

  // Validate phone types using Twilio Line Type Intelligence
  // Routes: MOBILE → SMS Queue, LANDLINE/VOIP → Call Queue
  const validateSelectedPhones = async () => {
    const stats = getSelectedPhoneStats();
    if (stats.total === 0) {
      toast.error("No phone numbers to validate");
      return;
    }

    setValidatingPhones(true);

    try {
      // Build lead data for queue routing
      const selectedHits = hits.filter((c) => selectedCompanies.has(c.id));
      const leadData = selectedHits.flatMap((company) => {
        const phones: string[] = [];
        if (company.phone) phones.push(company.phone);
        if (company.enrichedPhones)
          phones.push(...company.enrichedPhones.map((p) => p.number));

        return phones.map((phone) => ({
          phone,
          leadId: company.id,
          firstName:
            company.ownerName?.split(" ")[0] ||
            company.name?.split(" ")[0] ||
            "",
          lastName: company.ownerName?.split(" ").slice(1).join(" ") || "",
          companyName: company.companyName || company.company || "",
          address: company.address,
        }));
      });

      // Use Twilio Line Type Validation API
      const response = await fetch("/api/validate-line-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phones: stats.phones.map((p) => p.number),
          addToQueue: false, // Don't auto-add yet, just validate
          leadData,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Update company records with validated phone types
      const validatedMap = new Map<string, { type: string; routeTo: string }>();
      for (const result of data.results || []) {
        validatedMap.set(result.phone.replace(/\D/g, "").slice(-10), {
          type: result.lineType || "unknown",
          routeTo: result.routeTo,
        });
      }

      // Update hits with validated phone types
      setHits((prev) =>
        prev.map((company) => {
          // Update phone if matched
          if (company.phone) {
            const normalized = company.phone.replace(/\D/g, "").slice(-10);
            const validated = validatedMap.get(normalized);
            if (validated) {
              company.phoneType = validated.type;
              company.phoneRouteTo = validated.routeTo;
            }
          }

          // Update enriched phones
          if (company.enrichedPhones?.length) {
            company.enrichedPhones = company.enrichedPhones.map((p) => {
              const normalized = p.number.replace(/\D/g, "").slice(-10);
              const validated = validatedMap.get(normalized);
              if (validated) {
                return {
                  ...p,
                  type: validated.type,
                  routeTo: validated.routeTo,
                  verified: true,
                };
              }
              return p;
            });
          }

          return company;
        }),
      );

      const statsMsg = data.stats;
      toast.success(
        `Validated ${stats.total} phones: ${statsMsg.mobile} mobile → SMS, ${statsMsg.landline + statsMsg.voip} landline/voip → Call, ${statsMsg.skipped} skipped`,
      );
    } catch (error) {
      console.error("Phone validation error:", error);
      toast.error("Failed to validate phones");
    } finally {
      setValidatingPhones(false);
    }
  };

  // Route validated phones to appropriate queues
  // Mobile → SMS Queue, Landline/VoIP → Call Queue
  const routeToQueues = async () => {
    const selectedHits = hits.filter(
      (c) => selectedCompanies.has(c.id) && c.enriched,
    );

    if (selectedHits.length === 0) {
      toast.error("Select enriched companies first");
      return;
    }

    // Separate phones by type
    const smsLeads: Array<{
      leadId: string;
      phone: string;
      firstName: string;
      lastName?: string;
      companyName?: string;
    }> = [];
    const callLeads: Array<{
      id: string;
      name: string;
      phone: string;
      address?: string;
    }> = [];

    for (const company of selectedHits) {
      const ownerName = company.ownerName || company.name || "";
      const firstName = ownerName.split(" ")[0] || "";
      const lastName = ownerName.split(" ").slice(1).join(" ") || "";

      // Check all phones
      const allPhones: PhoneInfo[] = [];
      if (company.phone)
        allPhones.push({
          number: company.phone,
          type: company.phoneType || "unknown",
        });
      if (company.enrichedPhones) allPhones.push(...company.enrichedPhones);

      for (const phone of allPhones) {
        const type = phone.type?.toLowerCase() || "unknown";

        if (type === "mobile" || type === "cell") {
          // Mobile goes to SMS queue
          smsLeads.push({
            leadId: company.id,
            phone: phone.number,
            firstName,
            lastName,
            companyName: company.companyName || company.company || "",
          });
        } else if (
          type === "landline" ||
          type === "voip" ||
          type === "unknown"
        ) {
          // Landline/VoIP/Unknown goes to call queue
          callLeads.push({
            id: company.id,
            name: ownerName,
            phone: phone.number,
            address: company.address,
          });
        }
        // Skip toll_free and premium
      }
    }

    let smsAdded = 0;
    let callAdded = 0;

    // Add to SMS queue
    if (smsLeads.length > 0) {
      try {
        const smsResponse = await fetch("/api/sms-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_batch_draft",
            leads: smsLeads,
            templateMessage:
              "Hi {{firstName}}, this is regarding {{companyName}}...",
            templateCategory: "b2b-outreach",
          }),
        });
        const smsData = await smsResponse.json();
        smsAdded = smsData.added || 0;
      } catch (err) {
        console.error("SMS queue error:", err);
      }
    }

    // Add to Call queue
    if (callLeads.length > 0) {
      try {
        const callResponse = await fetch("/api/call-center/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_batch",
            leads: callLeads,
            priority: 5,
          }),
        });
        const callData = await callResponse.json();
        callAdded = callData.added || 0;
      } catch (err) {
        console.error("Call queue error:", err);
      }
    }

    toast.success(
      `Routed: ${smsAdded} to SMS queue, ${callAdded} to Call queue`,
    );
  };

  // Search when filters change (reset to page 1)
  useEffect(() => {
    if (debouncedQuery || totalFilters > 0 || revenueMin || revenueMax) {
      setCurrentPage(1);
      searchCompanies(1);
    }
  }, [debouncedQuery, filters, revenueMin, revenueMax]);

  return (
    <TeamSection>
      <TeamHeader title="Company Search" />

      <div className="container">
        <div className="mb-4">
          <TeamTitle>B2B Contact Search</TeamTitle>
          <p className="text-muted-foreground">
            Search 275M+ decision makers (Owners, CEOs, Partners) from Apollo.io
            + USBizData
          </p>
        </div>

        <div className="flex gap-x-4">
          <div className="inset-y-0 w-full min-w-[280px] max-w-[280px] bg-card border h-full rounded-md p-2">
            <div className="flex justify-between items-center px-4 py-2">
              <h3 className="text-lg font-bold">Filter</h3>

              <div className="flex items-center gap-x-3 text-xs font-medium">
                <button
                  type="button"
                  className="text-content-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!totalFilters}
                  onClick={clearFilters}
                >
                  {totalFilters > 0 ? `Clear All (${totalFilters})` : "Clear"}
                </button>
              </div>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
              <Accordion type="multiple">
                <FacetFilterItem
                  name="industry"
                  label="Industry"
                  checkedValues={filters.industry.value}
                  onValueChange={handleFilterChange}
                  placeholder="e.g. real estate"
                />
                <FacetFilterItem
                  name="state"
                  label="State"
                  checkedValues={filters.state.value}
                  onValueChange={handleFilterChange}
                  placeholder="e.g. NY, CA"
                />
                <FacetFilterItem
                  name="city"
                  label="City"
                  checkedValues={filters.city.value}
                  onValueChange={handleFilterChange}
                  placeholder="e.g. New York"
                />
              </Accordion>

              {/* Revenue Filter */}
              <div className="px-4 py-3 border-t">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-sm">Revenue</h4>
                  {(revenueMin || revenueMax) && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={clearRevenue}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {revenuePresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        selectedPreset === preset.label
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                      onClick={() => selectRevenuePreset(preset)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {selectedPreset && (
                  <p className="mt-2 text-xs text-green-600 font-medium">
                    Filtering: {selectedPreset}
                  </p>
                )}
              </div>

              {/* Auto-Tag Filter - Blue Collar, Motel/Hotel */}
              <div className="px-4 py-3 border-t">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-sm">Business Type</h4>
                  {filters.autoTag.value.length > 0 && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => handleFilterChange("autoTag", [])}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                      filters.autoTag.value.includes("blue-collar")
                        ? "bg-blue-600 text-white"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                    onClick={() => {
                      const current = filters.autoTag.value;
                      if (current.includes("blue-collar")) {
                        handleFilterChange(
                          "autoTag",
                          current.filter((t) => t !== "blue-collar"),
                        );
                      } else {
                        handleFilterChange("autoTag", [
                          ...current,
                          "blue-collar",
                        ]);
                      }
                    }}
                  >
                    <span className="text-lg">🔧</span>
                    Blue Collar / Trades
                  </button>
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                      filters.autoTag.value.includes("motel-hotel")
                        ? "bg-purple-600 text-white"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                    onClick={() => {
                      const current = filters.autoTag.value;
                      if (current.includes("motel-hotel")) {
                        handleFilterChange(
                          "autoTag",
                          current.filter((t) => t !== "motel-hotel"),
                        );
                      } else {
                        handleFilterChange("autoTag", [
                          ...current,
                          "motel-hotel",
                        ]);
                      }
                    }}
                  >
                    <span className="text-lg">🏨</span>
                    Motel / Hotel
                  </button>
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                      filters.autoTag.value.includes("property-related")
                        ? "bg-green-600 text-white"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                    onClick={() => {
                      const current = filters.autoTag.value;
                      if (current.includes("property-related")) {
                        handleFilterChange(
                          "autoTag",
                          current.filter((t) => t !== "property-related"),
                        );
                      } else {
                        handleFilterChange("autoTag", [
                          ...current,
                          "property-related",
                        ]);
                      }
                    }}
                  >
                    <span className="text-lg">🏠</span>
                    Property Related
                  </button>
                </div>
                {filters.autoTag.value.length > 0 && (
                  <p className="mt-2 text-xs text-green-600 font-medium">
                    Filtering: {filters.autoTag.value.join(", ")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex mb-4 gap-2">
              <Input
                placeholder="Search company name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="max-w-md"
              />
              <Button onClick={() => searchCompanies()} disabled={loading}>
                <SearchIcon size={18} className="mr-2" />
                Search
              </Button>
              <Button
                onClick={enrichSelectedCompanies}
                disabled={enriching || selectedCompanies.size === 0}
                variant="default"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {enriching ? (
                  <Loader2 size={18} className="mr-2 animate-spin" />
                ) : (
                  <Sparkles size={18} className="mr-2" />
                )}
                Enrich ({selectedCompanies.size})
              </Button>
              <Button
                onClick={() => {
                  const phoneCount = getSelectedPhoneCount();
                  if (phoneCount === 0) {
                    toast.error("No phone numbers in selected companies");
                    return;
                  }
                  setShowSmsDialog(true);
                }}
                disabled={selectedCompanies.size === 0}
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                <Send size={18} className="mr-2" />
                SMS ({getSelectedPhoneCount()})
              </Button>
              <Button
                onClick={validateSelectedPhones}
                disabled={validatingPhones || selectedCompanies.size === 0}
                variant="outline"
                title="Validate phone line types using Twilio (mobile/landline/VOIP)"
              >
                {validatingPhones ? (
                  <Loader2 size={18} className="mr-2 animate-spin" />
                ) : (
                  <ShieldCheck size={18} className="mr-2" />
                )}
                Validate
              </Button>
              <Button
                onClick={routeToQueues}
                disabled={selectedCompanies.size === 0}
                variant="outline"
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                title="Route mobiles to SMS queue, landlines/VOIP to call queue"
              >
                <ArrowUpDown size={18} className="mr-2" />
                Route to Queues
              </Button>
            </div>

            <Card className="relative overflow-hidden">
              {loading && <LoadingOverlay />}
              <CardHeader className="border-b">
                <CardTitle>Contacts</CardTitle>
              </CardHeader>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          sortedHits.length > 0 &&
                          selectedCompanies.size === sortedHits.length
                        }
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <SortableHeader column="companyName">
                      Company
                    </SortableHeader>
                    <SortableHeader column="name">Contact</SortableHeader>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Address</TableHead>
                    <SortableHeader column="city">City</SortableHeader>
                    <SortableHeader column="state">State</SortableHeader>
                    <TableHead>Zip</TableHead>
                    <SortableHeader column="industry">Industry</SortableHeader>
                    <TableHead>Tags</TableHead>
                    <TableHead className="w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {!loading && !sortedHits?.length && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8">
                        {totalFilters > 0 || debouncedQuery
                          ? "No companies found"
                          : "Enter a search term or select filters to find companies"}
                      </TableCell>
                    </TableRow>
                  )}

                  {sortedHits?.map((company) => (
                    <TableRow
                      key={company.id}
                      className={
                        company.enriched
                          ? "bg-green-50 dark:bg-green-900/10"
                          : ""
                      }
                    >
                      {/* Checkbox */}
                      <TableCell>
                        <Checkbox
                          checked={selectedCompanies.has(company.id)}
                          onCheckedChange={() => toggleCompany(company.id)}
                        />
                      </TableCell>

                      {/* Company */}
                      <TableCell>
                        <span className="font-medium">
                          {company.companyName ||
                            company.domain?.split(".")[0] ||
                            "-"}
                        </span>
                      </TableCell>

                      {/* Contact */}
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {company.name || "-"}
                          </span>
                          {company.title && (
                            <span className="text-xs text-muted-foreground block">
                              {company.title}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Phone + Type */}
                      <TableCell>
                        {company.enrichedPhones?.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-green-600 font-medium">
                              {company.enrichedPhones[0].number}
                            </span>
                            {company.enrichedPhones[0].type && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1 py-0 ${
                                  company.enrichedPhones[0].type === "mobile"
                                    ? "bg-green-50 text-green-700 border-green-300"
                                    : company.enrichedPhones[0].type === "voip"
                                      ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                                      : company.enrichedPhones[0].type ===
                                          "landline"
                                        ? "bg-red-50 text-red-700 border-red-300"
                                        : "bg-gray-50 text-gray-500 border-gray-300"
                                }`}
                              >
                                {company.enrichedPhones[0].type === "mobile"
                                  ? "M"
                                  : company.enrichedPhones[0].type === "voip"
                                    ? "V"
                                    : company.enrichedPhones[0].type ===
                                        "landline"
                                      ? "L"
                                      : "?"}
                              </Badge>
                            )}
                          </div>
                        ) : company.phone ? (
                          <span>{company.phone}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* Email */}
                      <TableCell>
                        {company.enrichedEmails?.length > 0 ? (
                          <span className="text-green-600 text-sm">
                            {company.enrichedEmails[0]}
                          </span>
                        ) : company.email ? (
                          <span className="text-sm">{company.email}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* Address */}
                      <TableCell>
                        <span className="text-sm">
                          {company.address || "-"}
                        </span>
                      </TableCell>

                      {/* City */}
                      <TableCell>
                        <span>{company.city || "-"}</span>
                      </TableCell>

                      {/* State */}
                      <TableCell>
                        <span>{company.state || "-"}</span>
                      </TableCell>

                      {/* Zip */}
                      <TableCell>
                        <span>{company.zip || "-"}</span>
                      </TableCell>

                      {/* Industry */}
                      <TableCell>
                        <span className="text-xs">
                          {company.industry || "-"}
                        </span>
                      </TableCell>

                      {/* Auto-Tags */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {company.autoTags?.includes("blue-collar") && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-[10px] px-1.5 py-0">
                              🔧 Blue Collar
                            </Badge>
                          )}
                          {company.autoTags?.includes("motel-hotel") && (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-[10px] px-1.5 py-0">
                              🏨 Motel/Hotel
                            </Badge>
                          )}
                          {company.autoTags?.includes("property-related") && (
                            <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px] px-1.5 py-0">
                              🏠 Property
                            </Badge>
                          )}
                          {(!company.autoTags ||
                            company.autoTags.length === 0) && (
                            <span className="text-muted-foreground text-xs">
                              -
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* SMS Button */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            title="Send SMS"
                            disabled={
                              !company.phone &&
                              (!company.enrichedPhones ||
                                company.enrichedPhones.length === 0)
                            }
                            onClick={() => {
                              const phone =
                                company.enrichedPhones?.[0] || company.phone;
                              if (phone) {
                                setSelectedCompanies(new Set([company.id]));
                                setShowSmsDialog(true);
                              } else {
                                toast.error(
                                  "No phone number available. Enrich first.",
                                );
                              }
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>

                          {/* Call Button */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                            title="Call"
                            disabled={
                              !company.phone &&
                              (!company.enrichedPhones ||
                                company.enrichedPhones.length === 0)
                            }
                            onClick={() => {
                              const phone =
                                company.enrichedPhones?.[0] || company.phone;
                              if (phone) {
                                window.open(`tel:${phone}`, "_self");
                              } else {
                                toast.error(
                                  "No phone number available. Enrich first.",
                                );
                              }
                            }}
                          >
                            <PhoneCall className="h-4 w-4" />
                          </Button>

                          {/* Email Button (for SendGrid) */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                            title="Send Email"
                            disabled={
                              !company.email &&
                              (!company.enrichedEmails ||
                                company.enrichedEmails.length === 0)
                            }
                            onClick={() => {
                              const email =
                                company.enrichedEmails?.[0] || company.email;
                              if (email) {
                                window.open(`mailto:${email}`, "_blank");
                              } else {
                                toast.error(
                                  "No email available. Enrich first.",
                                );
                              }
                            }}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>

                          {/* Calendar Button */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                            title="Add to Calendar"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  "/api/calendar/leads",
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      action: "schedule_to_calendar",
                                      leads: [
                                        {
                                          id: company.id,
                                          name:
                                            company.name ||
                                            company.ownerName ||
                                            "Unknown",
                                          phone:
                                            company.enrichedPhones?.[0] ||
                                            company.phone,
                                          email:
                                            company.enrichedEmails?.[0] ||
                                            company.email,
                                          address: company.address,
                                          city: company.city,
                                          state: company.state,
                                          company: company.companyName,
                                        },
                                      ],
                                      scheduledDate: new Date()
                                        .toISOString()
                                        .split("T")[0],
                                    }),
                                  },
                                );
                                const data = await response.json();
                                if (data.success) {
                                  toast.success(
                                    `${company.name || company.companyName} added to calendar`,
                                  );
                                } else {
                                  throw new Error(data.error);
                                }
                              } catch (error) {
                                toast.error("Failed to add to calendar");
                              }
                            }}
                          >
                            <CalendarPlus className="h-4 w-4" />
                          </Button>

                          {/* Enrich Button */}
                          {!company.enriched && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                              title="Enrich Contact"
                              onClick={() => enrichSingleCompany(company.id)}
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {!loading && (
                <CardFooter className="border-t text-sm flex justify-between items-center">
                  <p>Found: {formatNumber(estimatedCount)} contacts</p>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(1)}
                        disabled={currentPage <= 1}
                        title="First page"
                      >
                        ««
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">Page</span>
                        <Input
                          type="number"
                          min={1}
                          max={totalPages}
                          value={currentPage}
                          onChange={(e) => {
                            const page = parseInt(e.target.value, 10);
                            if (page >= 1 && page <= totalPages) {
                              goToPage(page);
                            }
                          }}
                          className="w-16 h-8 text-center"
                        />
                        <span className="text-sm">
                          of {formatNumber(totalPages)}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage >= totalPages}
                        title="Last page"
                      >
                        »»
                      </Button>
                    </div>
                  )}

                  {selectedCompanies.size > 0 && (
                    <p>{selectedCompanies.size} selected</p>
                  )}
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Enrichment Progress Dialog */}
      <Dialog open={showEnrichDialog} onOpenChange={setShowEnrichDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              {enriching ? "Enriching Companies..." : "Enrichment Complete"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {enrichProgress && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>
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
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {enrichProgress.successful}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Successful
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {enrichProgress.failed}
                    </div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {enrichProgress.total - enrichProgress.processed}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Remaining
                    </div>
                  </div>
                </div>
              </>
            )}

            {enrichResults && !enriching && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-medium">
                    Enrichment Summary (Cross-Referenced with USBiz Datalake)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <Phone className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      {enrichResults.withPhones} with phones
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">
                      {enrichResults.withEmails} with emails
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded col-span-2">
                    <Building className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">
                      {enrichResults.withProperties} owners with{" "}
                      {enrichResults.totalProperties} properties found
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Property addresses cross-referenced from USBiz datalake. Ready
                  for outreach via SMS or email.
                </p>
              </div>
            )}
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

      {/* SMS Dialog - SignalHouse Bulk SMS */}
      <Dialog open={showSmsDialog} onOpenChange={setShowSmsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-green-600" />
              Send SMS via SignalHouse
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Phone Type Breakdown */}
            {(() => {
              const stats = getSelectedPhoneStats();
              return (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Sending to{" "}
                    <span className="font-bold text-foreground">
                      {stats.total}
                    </span>{" "}
                    phone numbers from {selectedCompanies.size} companies
                  </div>

                  {/* Type breakdown badges */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {stats.mobile > 0 && (
                      <Badge className="bg-green-100 text-green-700 border-green-300">
                        {stats.mobile} Mobile
                      </Badge>
                    )}
                    {stats.voip > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
                        {stats.voip} VOIP
                      </Badge>
                    )}
                    {stats.landline > 0 && (
                      <Badge className="bg-red-100 text-red-700 border-red-300">
                        {stats.landline} Landline
                      </Badge>
                    )}
                    {stats.unknown > 0 && (
                      <Badge variant="outline" className="text-gray-500">
                        {stats.unknown} Unknown
                      </Badge>
                    )}
                  </div>

                  {/* Warning for landlines */}
                  {stats.landline > 0 && (
                    <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700">
                      <strong>Warning:</strong> {stats.landline} landline number
                      {stats.landline > 1 ? "s" : ""} detected. SMS to landlines
                      will fail. Consider removing landlines or enriching for
                      mobile numbers.
                    </div>
                  )}

                  {/* Warning for unknown types */}
                  {stats.unknown > 0 && stats.landline === 0 && (
                    <div className="rounded-md bg-yellow-50 border border-yellow-200 p-2 text-xs text-yellow-700">
                      <strong>Note:</strong> {stats.unknown} phone
                      {stats.unknown > 1 ? "s" : ""} with unknown line type.
                      Consider validating phone types before sending.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Quick B2B Templates */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quick Templates</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSmsMessage(
                      "Hi! I help businesses like yours save on [service]. Quick 5-min call to see if we're a fit? Reply YES or best time to chat.",
                    )
                  }
                >
                  Intro Pitch
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSmsMessage(
                      "Hey! Saw your company online. We work with similar businesses in your area. Open to a quick chat this week? Reply with a good time.",
                    )
                  }
                >
                  Casual Outreach
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSmsMessage(
                      "Hi, this is [Your Name]. We specialize in helping [industry] companies grow. Would you be open to a brief call? Reply YES for details.",
                    )
                  }
                >
                  Professional
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSmsMessage(
                      "Quick question - are you looking for [solution] for your business? We've helped companies like yours get results. Interested?",
                    )
                  }
                >
                  Direct Ask
                </Button>
              </div>
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Message</label>
              <textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Type your SMS message here..."
                className="w-full min-h-[100px] p-3 rounded-md border bg-background"
                maxLength={160}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{smsMessage.length}/160 characters</span>
                <span className="text-amber-600">
                  Reply STOP added automatically
                </span>
              </div>
            </div>

            {/* Progress */}
            {smsProgress && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {smsProgress.sent}
                    </div>
                    <div className="text-xs text-muted-foreground">Sent</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {smsProgress.failed}
                    </div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {smsProgress.total}
                    </div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
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
              onClick={sendSmsToSelected}
              disabled={sendingSms || !smsMessage.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {sendingSms ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send SMS Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TeamSection>
  );
}
