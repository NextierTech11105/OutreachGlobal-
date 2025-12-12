"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { currencyFormat } from "@/lib/currency-format";
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
  DollarSign,
  PhoneCall,
  Send,
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

// Check if a company is property-related
function isPropertyRelated(company: { industry?: string; name?: string }): boolean {
  const industry = (company.industry || "").toLowerCase();
  const name = (company.name || "").toLowerCase();

  return PROPERTY_RELATED_INDUSTRIES.some(keyword =>
    industry.includes(keyword) || name.includes(keyword)
  );
}

interface Company {
  id: string;
  name: string;
  domain: string;
  website: string;
  industry: string;
  employees: number;
  revenue: number;
  city: string;
  state: string;
  country: string;
  phone: string;
  linkedin_url: string;
  founded_year: number;
  email?: string;
  // Data source tracking
  source?: "apollo" | "usbizdata";
  sourceLabel?: string;
  // Property association tag
  propertyRelated?: boolean;
  // Business address (for cross-referencing with property data)
  address?: string;
  // Enrichment data
  enriched?: boolean;
  enrichedPhones?: string[];
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
  const { team } = useCurrentTeam();
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
      // Tag property-related businesses
      const taggedHits = (data.hits || []).map((company: Company) => ({
        ...company,
        propertyRelated: isPropertyRelated(company),
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

  // Single company quick enrich
  const enrichSingleCompany = async (companyId: string) => {
    const company = hits.find((c) => c.id === companyId);
    if (!company) return;

    // Mark as enriching in UI
    setHits((prev) =>
      prev.map((c) =>
        c.id === companyId ? { ...c, enriched: false } : c
      )
    );

    const titlePriority = ["owner", "ceo", "partner", "sales manager", "founder", "president", "director", "vp", "general manager"];

    try {
      // Step 1: Apollo People Search
      let ownerFirstName = "";
      let ownerLastName = "";
      let ownerTitle = "";
      let apolloEmail = "";

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
        const people = Array.isArray(apolloData.data) ? apolloData.data : [apolloData.data];
        const scoredPeople = people.map((p: { title?: string; firstName?: string; lastName?: string; name?: string; email?: string }) => {
          const title = (p.title || "").toLowerCase();
          let score = 100;
          for (let idx = 0; idx < titlePriority.length; idx++) {
            if (title.includes(titlePriority[idx])) {
              score = idx;
              break;
            }
          }
          return { ...p, score };
        });

        scoredPeople.sort((a: { score: number }, b: { score: number }) => a.score - b.score);
        const bestPerson = scoredPeople[0];

        if (bestPerson) {
          ownerFirstName = bestPerson.firstName || "";
          ownerLastName = bestPerson.lastName || "";
          ownerTitle = bestPerson.title || "";
          apolloEmail = bestPerson.email || "";

          if (!ownerFirstName && !ownerLastName && bestPerson.name) {
            const nameParts = bestPerson.name.split(" ");
            ownerFirstName = nameParts[0] || "";
            ownerLastName = nameParts.slice(1).join(" ") || "";
          }
        }
      }

      // Step 2: Skip trace if we have a name
      let phones: string[] = [];
      let emails: string[] = apolloEmail ? [apolloEmail] : [];
      let propertyAddresses: Array<{ street: string; city: string; state: string; zip: string }> = [];

      if (ownerFirstName || ownerLastName) {
        const skipTraceResponse = await fetch("/api/skip-trace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: ownerFirstName,
            lastName: ownerLastName,
            city: company.city,
            state: company.state,
          }),
        });

        const skipData = await skipTraceResponse.json();

        if (skipData.success) {
          phones = skipData.phones?.map((p: { number: string }) => p.number) || [];
          emails = [...new Set([apolloEmail, ...(skipData.emails?.map((e: { email: string }) => e.email) || [])].filter(Boolean))];
          propertyAddresses = skipData.addresses?.map((a: { street?: string; address?: string; city?: string; state?: string; zip?: string }) => ({
            street: a.street || a.address || "",
            city: a.city || "",
            state: a.state || "",
            zip: a.zip || "",
          })).filter((a: { street: string }) => a.street) || [];
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
            : c
        )
      );

      toast.success(`Enriched ${company.name} - ${phones.length} phones, ${emails.length} emails`);
    } catch (error) {
      console.error("Single enrich error:", error);
      toast.error(`Failed to enrich ${company.name}`);
    }
  };

  // Enrich selected companies - TWO-STEP PROCESS:
  // 1. Apollo People Search → Find decision maker name (Owner/CEO/Founder)
  // 2. RealEstateAPI Skip Trace → Get cell phone + property portfolio ($0.05/record)
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
          // STEP 1: Apollo People Search to find decision maker name
          let ownerFirstName = "";
          let ownerLastName = "";
          let ownerTitle = "";
          let apolloEmail = "";

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
              apolloEmail = bestPerson.email || "";

              // If no first/last name, try to parse from full name
              if (!ownerFirstName && !ownerLastName && bestPerson.name) {
                const nameParts = bestPerson.name.split(" ");
                ownerFirstName = nameParts[0] || "";
                ownerLastName = nameParts.slice(1).join(" ") || "";
              }
            }
          }

          // STEP 2: RealEstateAPI Skip Trace to get cell phone + property data
          // This costs $0.05 per record but gives us cell + property portfolio!
          if (ownerFirstName || ownerLastName) {
            const skipTraceResponse = await fetch("/api/skip-trace", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                firstName: ownerFirstName,
                lastName: ownerLastName,
                city: company.city,
                state: company.state,
              }),
            });

            const skipData = await skipTraceResponse.json();

            if (skipData.success) {
              // Combine Apollo email with skip trace phones
              const phones =
                skipData.phones?.map((p: { number: string }) => p.number) || [];
              const emails = [
                apolloEmail,
                ...(skipData.emails?.map((e: { email: string }) => e.email) ||
                  []),
              ].filter(Boolean);

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
                phones: [...new Set(phones)],
                emails: [...new Set(emails)],
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

          // Fallback: Return Apollo email if skip trace failed
          if (apolloEmail) {
            return {
              companyId: company.id,
              success: true,
              phones: [],
              emails: [apolloEmail],
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
    const phonesToSms: string[] = [];
    hits
      .filter((c) => selectedCompanies.has(c.id))
      .forEach((company) => {
        if (company.phone) phonesToSms.push(company.phone);
        if (company.enrichedPhones) phonesToSms.push(...company.enrichedPhones);
      });

    const uniquePhones = [...new Set(phonesToSms)].filter(
      (p) => p && p.length > 5,
    );

    if (uniquePhones.length === 0) {
      toast.error("No phone numbers found in selected companies");
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

  // Get phone count for selected companies
  const getSelectedPhoneCount = () => {
    const phones: string[] = [];
    hits
      .filter((c) => selectedCompanies.has(c.id))
      .forEach((company) => {
        if (company.phone) phones.push(company.phone);
        if (company.enrichedPhones) phones.push(...company.enrichedPhones);
      });
    return new Set(phones.filter((p) => p && p.length > 5)).size;
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
          <TeamTitle>Company Search</TeamTitle>
          <p className="text-muted-foreground">
            Search 65M+ companies from Apollo.io (All US) + USBizData (5.5M NY businesses)
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
            </div>

            <Card className="relative overflow-hidden">
              {loading && <LoadingOverlay />}
              <CardHeader className="border-b">
                <CardTitle>Companies</CardTitle>
              </CardHeader>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          hits.length > 0 &&
                          selectedCompanies.size === hits.length
                        }
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Property Address</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Phones</TableHead>
                    <TableHead>Emails</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {!loading && !hits?.length && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        {totalFilters > 0 || debouncedQuery
                          ? "No companies found"
                          : "Enter a search term or select filters to find companies"}
                      </TableCell>
                    </TableRow>
                  )}

                  {hits?.map((company) => (
                    <TableRow
                      key={company.id}
                      className={
                        company.enriched
                          ? "bg-green-50 dark:bg-green-900/10"
                          : ""
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedCompanies.has(company.id)}
                          onCheckedChange={() => toggleCompany(company.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {company.name || "-"}
                          {company.enriched ? (
                            <Badge
                              variant="outline"
                              className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            >
                              ✓ Enriched
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                            >
                              Needs Enrichment
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {company.source && (
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                company.source === "apollo"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                  : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                              }`}
                            >
                              {company.source === "apollo" ? "Apollo" : "USBizData NY"}
                            </Badge>
                          )}
                          {company.propertyRelated && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                            >
                              🏠 Property Related
                            </Badge>
                          )}
                          {company.ownerName && (
                            <span className="text-xs text-muted-foreground">
                              Owner: {company.ownerName}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{company.industry || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {company.city && company.state
                              ? `${company.city}, ${company.state}`
                              : company.state || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {company.propertyAddresses &&
                        company.propertyAddresses.length > 0 ? (
                          <div className="space-y-1">
                            {company.propertyAddresses
                              .slice(0, 2)
                              .map((addr, i) => (
                                <div key={i} className="text-xs">
                                  <div className="flex items-center gap-1">
                                    <Building className="h-3 w-3 text-purple-600" />
                                    <span className="font-medium">
                                      {addr.street}
                                    </span>
                                  </div>
                                  <span className="text-muted-foreground ml-4">
                                    {addr.city}, {addr.state} {addr.zip}
                                  </span>
                                </div>
                              ))}
                            {company.propertyAddresses.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{company.propertyAddresses.length - 2} more
                                properties
                              </Badge>
                            )}
                          </div>
                        ) : company.address ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span>{company.address}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {company.employees
                          ? formatNumber(company.employees)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {company.revenue
                          ? currencyFormat(company.revenue)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {company.enrichedPhones &&
                        company.enrichedPhones.length > 0 ? (
                          <div className="space-y-1">
                            {company.enrichedPhones
                              .slice(0, 2)
                              .map((phone, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-1 text-sm"
                                >
                                  <Phone className="h-3 w-3 text-green-600" />
                                  <a
                                    href={`tel:${phone}`}
                                    className="text-blue-600 hover:underline"
                                  >
                                    {phone}
                                  </a>
                                </div>
                              ))}
                            {company.enrichedPhones.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{company.enrichedPhones.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : company.phone ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{company.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {company.enrichedEmails &&
                        company.enrichedEmails.length > 0 ? (
                          <div className="space-y-1">
                            {company.enrichedEmails
                              .slice(0, 2)
                              .map((email, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-1 text-sm"
                                >
                                  <Mail className="h-3 w-3 text-green-600" />
                                  <a
                                    href={`mailto:${email}`}
                                    className="text-blue-600 hover:underline truncate max-w-[150px]"
                                  >
                                    {email}
                                  </a>
                                </div>
                              ))}
                            {company.enrichedEmails.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{company.enrichedEmails.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {company.domain ? (
                          <a
                            href={
                              company.website || `https://${company.domain}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-500 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {company.domain}
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {company.enriched ? (
                          <div className="flex items-center gap-1">
                            <PhoneCall className="h-4 w-4 text-green-600" />
                            <span className="text-xs text-green-600">Ready</span>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs bg-purple-50 hover:bg-purple-100 border-purple-200"
                            onClick={() => enrichSingleCompany(company.id)}
                          >
                            <Sparkles className="h-3 w-3 mr-1 text-purple-600" />
                            Enrich
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {!loading && (
                <CardFooter className="border-t text-sm flex justify-between items-center">
                  <p>Found: {formatNumber(estimatedCount)} companies</p>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
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
            <div className="text-sm text-muted-foreground">
              Sending to{" "}
              <span className="font-bold text-foreground">
                {getSelectedPhoneCount()}
              </span>{" "}
              phone numbers from {selectedCompanies.size} companies
            </div>

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
