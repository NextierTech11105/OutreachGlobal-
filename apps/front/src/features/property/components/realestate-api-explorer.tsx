"use client";

import { useState } from "react";
import {  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { $http } from "@/lib/http";
import {
  SearchIcon,
  HomeIcon,
  UserSearchIcon,
  BookmarkIcon,
  PlayIcon,
  DownloadIcon,
  SaveIcon,
  HistoryIcon,
  LayoutListIcon,
  LayoutGridIcon,
  FileTextIcon,
  MapIcon,
  SparklesIcon,
} from "lucide-react";
import { LoadingOverlay } from "@/components/ui/loading/loading-overlay";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDownIcon } from "lucide-react";

interface QueryParams {
  // Geo Filters
  state?: string;
  city?: string;
  county?: string;
  zipCode?: string;

  // Property Type & Use
  propertyType?: string;
  propertyUseCode?: number[];  // Commercial property codes

  // Building & Lot
  buildingSizeMin?: number;
  buildingSizeMax?: number;
  lotSizeMin?: number;
  lotSizeMax?: number;
  zoning?: string;
  landUse?: string;

  // Value Filters
  valueMin?: number;
  valueMax?: number;

  // Equity Filters
  equityPercentMin?: number;
  equityPercentMax?: number;
  highEquity?: boolean;
  freeClear?: boolean;

  // Portfolio Filters (Investors)
  propertiesOwnedMin?: number;
  propertiesOwnedMax?: number;
  portfolioValueMin?: number;

  // Active Buyer Discovery
  portfolioPurchasedLast12Min?: number;

  // Distress Signals (EVENT SIGNALS)
  preForeclosure?: boolean;
  foreclosure?: boolean;
  vacant?: boolean;
  lisPendens?: boolean;
  auction?: boolean;
  soldLast12Months?: boolean;

  // Owner Filters (NON-EVENT SIGNALS)
  absenteeOwner?: boolean;
  outOfStateOwner?: boolean;
  corporateOwned?: boolean;
  owned5YearsPlus?: boolean;

  // Property Characteristics (Residential)
  bedsMin?: number;
  bedsMax?: number;
  bathsMin?: number;
  bathsMax?: number;
  unitsMin?: number;
  unitsMax?: number;
  yearBuiltMin?: number;
  yearBuiltMax?: number;

  // Limit
  size?: number;
}

export function RealEstateAPIExplorer() {
  const teamId = "test"; // Hardcoded for standalone mode
  const [activeTab, setActiveTab] = useState("property-search");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [queryParams, setQueryParams] = useState<QueryParams>({
    size: 50,
  });

  // WIZARD STATE
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [searchType, setSearchType] = useState<"properties" | "businesses" | "both">("properties");

  // ZIP CODE TAGS (for macro targeting)
  const [zipCodes, setZipCodes] = useState<string[]>([]);
  const [zipCodeInput, setZipCodeInput] = useState("");

  // SELECTION & ENRICHMENT STATE
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());
  const [enrichedProperties, setEnrichedProperties] = useState<Map<string, any>>(new Map());
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [propertyDetailOpen, setPropertyDetailOpen] = useState(false);
  const [propertyDetailLoading, setPropertyDetailLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "card" | "detail" | "map">("list");

  // ZIP CODE TAG HANDLERS
  const addZipCode = () => {
    const zip = zipCodeInput.trim();
    if (zip && !zipCodes.includes(zip)) {
      setZipCodes([...zipCodes, zip]);
      setZipCodeInput("");
    }
  };

  const removeZipCode = (zipToRemove: string) => {
    setZipCodes(zipCodes.filter(z => z !== zipToRemove));
  };

  const executePropertySearch = async () => {
    setLoading(true);
    try {
      // If multiple zip codes, run parallel searches and combine results
      if (zipCodes.length > 0) {
        const allResults = [];

        for (const zip of zipCodes) {
          const { data } = await $http.post(`/rest/${teamId}/realestate-api/property-search`, {
            ...queryParams,
            zipCode: zip,
          });
          allResults.push(...(data.data || []));
        }

        setResults(allResults);
        setTotalResults(allResults.length);
        toast.success(`Found ${allResults.length} properties across ${zipCodes.length} zip codes!`);
      } else {
        const { data } = await $http.post(`/rest/${teamId}/realestate-api/property-search`, {
          ...queryParams,
        });

        setResults(data.data || []);
        setTotalResults(data.total || 0);
        toast.success(`Found ${data.total || 0} properties!`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Property search failed");
    } finally {
      setLoading(false);
    }
  };

  const executeSkipTrace = async (propertyId: string) => {
    setLoading(true);
    try {
      const { data} = await $http.post(`/rest/${teamId}/realestate-api/skip-trace`, {
        propertyId,
      });

      // Store enriched data
      const newEnriched = new Map(enrichedProperties);
      newEnriched.set(propertyId, data);
      setEnrichedProperties(newEnriched);

      toast.success("Skip trace complete! Contact data retrieved.");
      return data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Skip trace failed");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const viewPropertyDetail = async (propertyId: string) => {
    setPropertyDetailLoading(true);
    setPropertyDetailOpen(true);
    try {
      const { data } = await $http.post(
        `/rest/${teamId}/realestate-api/property-detail/${propertyId}`,
        {}
      );

      setSelectedProperty(data);
      toast.success("Property details loaded!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load property details");
      setPropertyDetailOpen(false);
    } finally {
      setPropertyDetailLoading(false);
    }
  };

  // FULL REPORT - Get everything for one property
  const getFullReport = async (propertyId: string) => {
    setPropertyDetailLoading(true);
    setPropertyDetailOpen(true);

    try {
      toast.info("Getting full report...");

      // Step 1: Get property details
      const { data: propertyData } = await $http.post(
        `/rest/${teamId}/realestate-api/property-detail/${propertyId}`,
        {}
      );

      // Step 2: Run skip trace
      const { data: skipTraceData } = await $http.post(
        `/rest/${teamId}/realestate-api/skip-trace`,
        { propertyId }
      );

      // Store enriched data
      const newEnriched = new Map(enrichedProperties);
      newEnriched.set(propertyId, skipTraceData);
      setEnrichedProperties(newEnriched);

      // Combine all data
      const fullReport = {
        ...propertyData,
        skipTrace: skipTraceData,
        phones: skipTraceData?.identity?.phones || [],
        emails: skipTraceData?.identity?.emails || [],
        relatives: skipTraceData?.identity?.relatives || [],
        associates: skipTraceData?.identity?.associates || [],
      };

      setSelectedProperty(fullReport);
      toast.success("Full report loaded! Property details + contact data retrieved.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load full report");
      setPropertyDetailOpen(false);
    } finally {
      setPropertyDetailLoading(false);
    }
  };

  const createSavedSearch = async () => {
    setLoading(true);
    try {
      const searchName = prompt("Enter a name for this saved search:");
      if (!searchName) return;

      const { data } = await $http.post(`/rest/${teamId}/realestate-api/saved-search/create`, {
        searchName,
        searchQuery: queryParams,
      });

      toast.success("Saved search created!");
      setSavedSearches([...savedSearches, data]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create saved search");
    } finally {
      setLoading(false);
    }
  };

  const calculateDealScore = (property: any): number => {
    let score = 0;

    // Equity scoring (0-30 points)
    if (property.equityPercent >= 80) score += 30;
    else if (property.equityPercent >= 60) score += 20;
    else if (property.equityPercent >= 40) score += 10;

    // Distress signals (0-25 points)
    if (property.preForeclosure) score += 15;
    if (property.foreclosure) score += 15;
    if (property.vacant) score += 10;
    if (property.lisPendens) score += 10;

    // Owner type (0-20 points)
    if (property.absenteeOwner) score += 10;
    if (property.outOfStateOwner) score += 5;
    if (property.corporateOwned) score += 5;

    // Portfolio/Investor (0-15 points)
    if (property.propertiesOwned >= 10) score += 15;
    else if (property.propertiesOwned >= 5) score += 10;
    else if (property.propertiesOwned >= 2) score += 5;

    // MLS Status (0-10 points)
    if (!property.mlsListed) score += 10; // Off-market = more valuable

    return Math.min(score, 100); // Cap at 100
  };

  const getDealScoreBadge = (score: number) => {
    if (score >= 90) return { label: "🔥 Hot Deal", variant: "default" as const };
    if (score >= 70) return { label: "✅ Good Deal", variant: "default" as const };
    if (score >= 50) return { label: "⚠️ Warm Lead", variant: "outline" as const };
    return { label: "❄️ Cold Lead", variant: "outline" as const };
  };

  const exportResults = () => {
    const csv = [
      ["Address", "City", "State", "Value", "Equity %", "Owner", "Property Type", "Deal Score"].join(","),
      ...results.map(r =>
        [
          r.address?.address || r.address?.street || r.address || "N/A",
          r.address?.city || r.city || "N/A",
          r.address?.state || r.state || "N/A",
          r.value,
          r.equityPercent,
          r.ownerName,
          r.propertyType,
          calculateDealScore(r),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `realestate-search-${Date.now()}.csv`;
    a.click();
    toast.success("Exported to CSV!");
  };

  // SELECTION
  const togglePropertySelection = (propertyId: string) => {
    const newSelection = new Set(selectedPropertyIds);
    if (newSelection.has(propertyId)) {
      newSelection.delete(propertyId);
    } else {
      newSelection.add(propertyId);
    }
    setSelectedPropertyIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedPropertyIds.size === results.length) {
      setSelectedPropertyIds(new Set());
    } else {
      setSelectedPropertyIds(new Set(results.map(r => r.id || r.propertyId)));
    }
  };

  // ENRICH SELECTED (Skip Trace)
  const enrichSelected = async () => {
    const selected = results.filter(r => selectedPropertyIds.has(r.id || r.propertyId));

    if (selected.length === 0) {
      toast.error("Please select properties to enrich");
      return;
    }

    setLoading(true);
    let successCount = 0;
    const newEnriched = new Map(enrichedProperties);

    try {
      toast.info(`Enriching ${selected.length} properties...`);

      for (const property of selected) {
        try {
          const skipData = await executeSkipTrace(property.id || property.propertyId);
          if (skipData) {
            newEnriched.set(property.id || property.propertyId, skipData);
            successCount++;
          }
        } catch (err) {
          console.error("Skip trace failed for", property.id);
        }
      }

      setEnrichedProperties(newEnriched);
      toast.success(`Enriched ${successCount}/${selected.length} properties with contact data!`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Enrichment failed");
    } finally {
      setLoading(false);
    }
  };

  // PUSH TO CAMPAIGN
  const pushToCampaign = async () => {
    const selected = results.filter(r => selectedPropertyIds.has(r.id || r.propertyId));

    if (selected.length === 0) {
      toast.error("Please select properties to push to campaign");
      return;
    }

    if (!selectedCampaignId) {
      toast.error("Please select a campaign");
      return;
    }

    setLoading(true);
    try {
      const propertyIds = selected.map(r => r.id || r.propertyId);

      await $http.post(`/rest/${teamId}/realestate-api/import-to-campaign`, {
        propertyIds,
        campaignName: selectedCampaignId, // TODO: Get actual campaign name
        messageTemplateId: undefined, // TODO: Add template selector
      });

      toast.success(`Pushed ${selected.length} properties to campaign queue!`);
      setSelectedPropertyIds(new Set());
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to push to campaign");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Results</CardTitle>
            <SearchIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResults.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Properties found</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Searches</CardTitle>
            <BookmarkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{savedSearches.length}</div>
            <p className="text-xs text-muted-foreground">Tracking daily</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Results Loaded</CardTitle>
            <HomeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.length}</div>
            <p className="text-xs text-muted-foreground">In current view</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Status</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Main API Explorer */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="property-search">
            <SearchIcon className="mr-2 h-4 w-4" />
            Property Search
          </TabsTrigger>
          <TabsTrigger value="skip-trace">
            <UserSearchIcon className="mr-2 h-4 w-4" />
            Skip Trace
          </TabsTrigger>
          <TabsTrigger value="saved-searches">
            <BookmarkIcon className="mr-2 h-4 w-4" />
            Saved Searches
          </TabsTrigger>
          <TabsTrigger value="history">
            <HistoryIcon className="mr-2 h-4 w-4" />
            Query History
          </TabsTrigger>
        </TabsList>

        {/* PROPERTY SEARCH TAB */}
        <TabsContent value="property-search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Property Search Query Builder</CardTitle>
              <CardDescription>
                Build powerful property searches with 60+ filters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading && <LoadingOverlay />}

              {/* WIZARD PROGRESS */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-2">
                    <button
                      onClick={() => setWizardStep(step as 1 | 2 | 3)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        wizardStep === step
                          ? "bg-black dark:bg-white text-white dark:text-black"
                          : wizardStep > step
                          ? "bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          : "bg-gray-200 dark:bg-gray-800 text-gray-400"
                      }`}
                    >
                      {step}
                    </button>
                    {step < 3 && (
                      <div
                        className={`h-px w-12 ${
                          wizardStep > step ? "bg-gray-300 dark:bg-gray-700" : "bg-gray-200 dark:bg-gray-800"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* STEP 1: WHAT */}
              {wizardStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <h2 className="text-xl font-semibold mb-1">What are you looking for?</h2>
                    <p className="text-sm text-gray-500">Choose your target type</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <button
                      onClick={() => setSearchType("properties")}
                      className={`p-6 rounded border text-left transition-colors ${
                        searchType === "properties"
                          ? "border-black dark:border-white bg-gray-50 dark:bg-gray-900"
                          : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                      }`}
                    >
                      <h3 className="font-medium mb-1">Properties</h3>
                      <p className="text-xs text-gray-500">
                        Residential & Commercial
                      </p>
                    </button>

                    <button
                      onClick={() => setSearchType("businesses")}
                      className={`p-6 rounded border text-left transition-colors ${
                        searchType === "businesses"
                          ? "border-black dark:border-white bg-gray-50 dark:bg-gray-900"
                          : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                      }`}
                    >
                      <h3 className="font-medium mb-1">Businesses</h3>
                      <p className="text-xs text-gray-500">
                        Business Owners
                      </p>
                    </button>

                    <button
                      onClick={() => setSearchType("both")}
                      className={`p-6 rounded border text-left transition-colors ${
                        searchType === "both"
                          ? "border-black dark:border-white bg-gray-50 dark:bg-gray-900"
                          : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                      }`}
                    >
                      <h3 className="font-medium mb-1">Both</h3>
                      <p className="text-xs text-gray-500">
                        Properties + Businesses
                      </p>
                    </button>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setWizardStep(2)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: DEMOGRAPHICS (NON-EVENT SIGNALS) */}
              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <h2 className="text-xl font-semibold mb-1">Demographics & Characteristics</h2>
                    <p className="text-sm text-gray-500">Define your target criteria</p>
                  </div>

                  {/* Geographic */}
                  <div className="p-6 rounded border border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-medium mb-4 text-gray-900 dark:text-gray-100">Geographic</h3>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">State</Label>
                        <Select
                          value={queryParams.state}
                          onValueChange={(value) =>
                            setQueryParams({ ...queryParams, state: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All states" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NY">New York</SelectItem>
                            <SelectItem value="CT">Connecticut</SelectItem>
                            <SelectItem value="NJ">New Jersey</SelectItem>
                            <SelectItem value="FL">Florida</SelectItem>
                            <SelectItem value="TX">Texas</SelectItem>
                            <SelectItem value="CA">California</SelectItem>
                            <SelectItem value="AZ">Arizona</SelectItem>
                            <SelectItem value="PA">Pennsylvania</SelectItem>
                            <SelectItem value="MA">Massachusetts</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">City</Label>
                        <Input
                          placeholder=""
                          value={queryParams.city || ""}
                          onChange={(e) =>
                            setQueryParams({ ...queryParams, city: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">County</Label>
                        <Input
                          placeholder=""
                          value={queryParams.county || ""}
                          onChange={(e) =>
                            setQueryParams({ ...queryParams, county: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Zip Codes (Macro Targeting)</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder=""
                            value={zipCodeInput}
                            onChange={(e) => setZipCodeInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addZipCode();
                              }
                            }}
                          />
                          <Button type="button" onClick={addZipCode} variant="outline" size="sm">
                            Add
                          </Button>
                        </div>
                        {zipCodes.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {zipCodes.map(zip => (
                              <Badge key={zip} variant="outline" className="px-2 py-1">
                                {zip}
                                <button
                                  type="button"
                                  onClick={() => removeZipCode(zip)}
                                  className="ml-2 text-xs hover:text-red-500"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Property Type & Value */}
                  <div className="p-6 rounded border border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-medium mb-4 text-gray-900 dark:text-gray-100">Property Type & Value</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Property Type</Label>
                        <Select
                          value={queryParams.propertyType}
                          onValueChange={(value) =>
                            setQueryParams({ ...queryParams, propertyType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SFR">Single Family</SelectItem>
                            <SelectItem value="MFH">Multi-Family</SelectItem>
                            <SelectItem value="APARTMENT">Apartments</SelectItem>
                            <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                            <SelectItem value="LAND">Land</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Min Value</Label>
                        <Input
                          type="number"
                          placeholder=""
                          value={queryParams.valueMin || ""}
                          onChange={(e) =>
                            setQueryParams({
                              ...queryParams,
                              valueMin: parseInt(e.target.value) || undefined,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Max Value</Label>
                        <Input
                          type="number"
                          placeholder=""
                          value={queryParams.valueMax || ""}
                          onChange={(e) =>
                            setQueryParams({
                              ...queryParams,
                              valueMax: parseInt(e.target.value) || undefined,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Owner Type */}
                  <div className="p-6 rounded border border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-medium mb-4 text-gray-900 dark:text-gray-100">Owner Type</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={queryParams.absenteeOwner ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setQueryParams({
                            ...queryParams,
                            absenteeOwner: !queryParams.absenteeOwner,
                          })
                        }
                      >
                        Absentee
                      </Button>
                      <Button
                        variant={queryParams.outOfStateOwner ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setQueryParams({
                            ...queryParams,
                            outOfStateOwner: !queryParams.outOfStateOwner,
                          })
                        }
                      >
                        Out-of-State
                      </Button>
                      <Button
                        variant={queryParams.corporateOwned ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setQueryParams({
                            ...queryParams,
                            corporateOwned: !queryParams.corporateOwned,
                          })
                        }
                      >
                        Corporate
                      </Button>
                      <Button
                        variant={queryParams.owned5YearsPlus ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setQueryParams({
                            ...queryParams,
                            owned5YearsPlus: !queryParams.owned5YearsPlus,
                          })
                        }
                      >
                        5+ Years
                      </Button>
                    </div>
                  </div>

                  {/* Property Characteristics */}
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <div className="p-6 rounded border border-gray-200 dark:border-gray-800 cursor-pointer hover:border-gray-300 dark:hover:border-gray-700">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Building & Lot Details</h3>
                          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-6 border-x border-b border-gray-200 dark:border-gray-800 rounded-b">
                        <div className="grid gap-4 md:grid-cols-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-gray-500">Min Beds</Label>
                            <Input
                              type="number"
                              placeholder=""
                              value={queryParams.bedsMin || ""}
                              onChange={(e) =>
                                setQueryParams({
                                  ...queryParams,
                                  bedsMin: parseInt(e.target.value) || undefined,
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs text-gray-500">Min Baths</Label>
                            <Input
                              type="number"
                              placeholder=""
                              value={queryParams.bathsMin || ""}
                              onChange={(e) =>
                                setQueryParams({
                                  ...queryParams,
                                  bathsMin: parseInt(e.target.value) || undefined,
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs text-gray-500">Building Sqft (Min)</Label>
                            <Input
                              type="number"
                              placeholder=""
                              value={queryParams.buildingSizeMin || ""}
                              onChange={(e) =>
                                setQueryParams({
                                  ...queryParams,
                                  buildingSizeMin: parseInt(e.target.value) || undefined,
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs text-gray-500">Lot Sqft (Min)</Label>
                            <Input
                              type="number"
                              placeholder=""
                              value={queryParams.lotSizeMin || ""}
                              onChange={(e) =>
                                setQueryParams({
                                  ...queryParams,
                                  lotSizeMin: parseInt(e.target.value) || undefined,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Portfolio (Investors) */}
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">💼 Portfolio (Investors)</h3>
                          <ChevronDownIcon className="h-5 w-5" />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 border-x border-b border-gray-200 dark:border-gray-800 rounded-b-lg bg-gray-50 dark:bg-slate-800/50">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Min Properties Owned</Label>
                            <Input
                              type="number"
                              placeholder=""
                              value={queryParams.propertiesOwnedMin || ""}
                              onChange={(e) =>
                                setQueryParams({
                                  ...queryParams,
                                  propertiesOwnedMin: parseInt(e.target.value) || undefined,
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Min Portfolio Value</Label>
                            <Input
                              type="number"
                              placeholder=""
                              value={queryParams.portfolioValueMin || ""}
                              onChange={(e) =>
                                setQueryParams({
                                  ...queryParams,
                                  portfolioValueMin: parseInt(e.target.value) || undefined,
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Purchased Last 12 Months</Label>
                            <Input
                              type="number"
                              placeholder=""
                              value={queryParams.portfolioPurchasedLast12Min || ""}
                              onChange={(e) =>
                                setQueryParams({
                                  ...queryParams,
                                  portfolioPurchasedLast12Min: parseInt(e.target.value) || undefined,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="flex justify-between gap-2 pt-4">
                    <Button variant="outline" onClick={() => setWizardStep(1)}>
                      Back
                    </Button>
                    <Button onClick={() => setWizardStep(3)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: EVENT SIGNALS (MOTIVATION/DISTRESS) */}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  {/* QUICK ACTION PRESETS */}
                  <div className="p-6 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                    <h3 className="text-sm font-semibold mb-4 text-gray-900 dark:text-gray-100">Quick Action Presets</h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Button
                        size="lg"
                        className="h-16 text-lg font-bold"
                        onClick={() => {
                          setQueryParams({
                            state: "FL",
                            equityPercentMin: 70,
                            highEquity: true,
                            size: 100,
                          });
                          toast.success("High Equity Florida preset loaded!");
                        }}
                      >
                        High Equity FL
                      </Button>
                      <Button
                        size="lg"
                        className="h-16 text-lg font-bold"
                        onClick={() => {
                          setQueryParams({
                            state: "NY",
                            preForeclosure: true,
                            vacant: true,
                            size: 100,
                          });
                          toast.success("Distressed NY properties preset loaded!");
                        }}
                      >
                        Distressed NY
                      </Button>
                      <Button
                        size="lg"
                        className="h-16 text-lg font-bold"
                        onClick={() => {
                          setQueryParams({
                            propertiesOwnedMin: 5,
                            portfolioPurchasedLast12Min: 1,
                            size: 100,
                          });
                          toast.success("Active Investors preset loaded!");
                        }}
                      >
                        Active Investors
                      </Button>
                    </div>
                  </div>

                  <div className="text-center mb-8">
                    <h2 className="text-xl font-semibold mb-1">Event Signals</h2>
                    <p className="text-sm text-gray-500">Motivation & distress indicators</p>
                  </div>

                  {/* Equity */}
                  <div className="p-6 rounded border border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-medium mb-4 text-gray-900 dark:text-gray-100">Equity</h3>
                    <div className="grid gap-4 md:grid-cols-2 mb-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Min Equity %</Label>
                        <Input
                          type="number"
                          placeholder=""
                          value={queryParams.equityPercentMin || ""}
                          onChange={(e) =>
                            setQueryParams({
                              ...queryParams,
                              equityPercentMin: parseInt(e.target.value) || undefined,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Max Equity %</Label>
                        <Input
                          type="number"
                          placeholder=""
                          value={queryParams.equityPercentMax || ""}
                          onChange={(e) =>
                            setQueryParams({
                              ...queryParams,
                              equityPercentMax: parseInt(e.target.value) || undefined,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant={queryParams.highEquity ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setQueryParams({
                            ...queryParams,
                            highEquity: !queryParams.highEquity,
                          })
                        }
                      >
                        High Equity
                      </Button>
                      <Button
                        variant={queryParams.freeClear ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setQueryParams({
                            ...queryParams,
                            freeClear: !queryParams.freeClear,
                          })
                        }
                      >
                        Free & Clear
                      </Button>
                    </div>
                  </div>

                  {/* Distress */}
                  <div className="p-6 rounded border border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-medium mb-4 text-gray-900 dark:text-gray-100">Distress Signals</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={queryParams.preForeclosure ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setQueryParams({
                            ...queryParams,
                            preForeclosure: !queryParams.preForeclosure,
                          })
                        }
                      >
                        Pre-Foreclosure
                      </Button>
                      <Button
                        variant={queryParams.foreclosure ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setQueryParams({
                            ...queryParams,
                            foreclosure: !queryParams.foreclosure,
                          })
                        }
                      >
                        Foreclosure
                      </Button>
                      <Button
                        variant={queryParams.vacant ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setQueryParams({
                            ...queryParams,
                            vacant: !queryParams.vacant,
                          })
                        }
                      >
                        Vacant
                      </Button>
                      <Button
                        variant={queryParams.lisPendens ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setQueryParams({
                            ...queryParams,
                            lisPendens: !queryParams.lisPendens,
                          })
                        }
                      >
                        Lis Pendens
                      </Button>
                      <Button
                        variant={queryParams.auction ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setQueryParams({
                            ...queryParams,
                            auction: !queryParams.auction,
                          })
                        }
                      >
                        Auction
                      </Button>
                      <Button
                        variant={queryParams.soldLast12Months ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setQueryParams({
                            ...queryParams,
                            soldLast12Months: !queryParams.soldLast12Months,
                          })
                        }
                      >
                        Sold Last 12Mo
                      </Button>
                    </div>
                  </div>

                  {/* Result Limit */}
                  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900">
                    <div className="space-y-2">
                      <Label>Results Limit</Label>
                      <Input
                        type="number"
                        placeholder=""
                        value={queryParams.size || ""}
                        onChange={(e) =>
                          setQueryParams({
                            ...queryParams,
                            size: parseInt(e.target.value) || undefined,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-between gap-2">
                    <Button variant="outline" onClick={() => setWizardStep(2)}>
                      ← Back
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        onClick={executePropertySearch}
                        disabled={loading}
                        size="lg"
                        className="h-14 px-8 text-xl font-bold bg-green-600 hover:bg-green-700 text-white"
                      >
                        <PlayIcon className="mr-2 h-6 w-6" />
                        EXECUTE
                      </Button>
                      <Button variant="outline" onClick={createSavedSearch} disabled={loading} size="lg">
                        <SaveIcon className="mr-2 h-4 w-4" />
                        Save Search
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Search Results ({totalResults.toLocaleString()} total)</CardTitle>
                      <CardDescription>
                        Showing {results.length} properties • {selectedPropertyIds.size} selected
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={viewMode === "list" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                      >
                        <LayoutListIcon className="h-4 w-4 mr-2" />
                        List
                      </Button>
                      <Button
                        variant={viewMode === "card" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("card")}
                      >
                        <LayoutGridIcon className="h-4 w-4 mr-2" />
                        Card
                      </Button>
                      <Button
                        variant={viewMode === "detail" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("detail")}
                      >
                        <FileTextIcon className="h-4 w-4 mr-2" />
                        Detail
                      </Button>
                      <Button
                        variant={viewMode === "map" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("map")}
                      >
                        <MapIcon className="h-4 w-4 mr-2" />
                        Map
                      </Button>
                    </div>
                  </div>

                  {/* ACTION BAR */}
                  {selectedPropertyIds.size > 0 && (
                    <div className="p-6 rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                          {selectedPropertyIds.size} SELECTED
                        </span>
                        <div className="flex-1" />

                        {/* Export */}
                        <Button variant="outline" onClick={exportResults} size="sm">
                          <DownloadIcon className="mr-2 h-4 w-4" />
                          Export CSV
                        </Button>
                      </div>

                      {/* PROMINENT SKIP TRACE BUTTONS */}
                      <div className="grid gap-3 md:grid-cols-2">
                        <Button
                          onClick={enrichSelected}
                          disabled={loading}
                          size="lg"
                          className="h-16 text-xl font-bold bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <UserSearchIcon className="mr-2 h-6 w-6" />
                          SKIP TRACE ALL ({selectedPropertyIds.size})
                        </Button>
                        <Button
                          onClick={exportResults}
                          disabled={loading}
                          size="lg"
                          variant="outline"
                          className="h-16 text-xl font-bold border-2"
                        >
                          <DownloadIcon className="mr-2 h-6 w-6" />
                          EXPORT SELECTED
                        </Button>
                      </div>

                      {/* Campaign Selection + Push */}
                      <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-gray-500 whitespace-nowrap">Campaign:</Label>
                          <Input
                            placeholder=""
                            value={selectedCampaignId}
                            onChange={(e) => setSelectedCampaignId(e.target.value)}
                            className="w-64"
                          />
                        </div>
                        <Button
                          onClick={pushToCampaign}
                          disabled={loading || !selectedCampaignId}
                          size="sm"
                        >
                          <PlayIcon className="mr-2 h-4 w-4" />
                          Push to Campaign
                        </Button>
                        {enrichedProperties.size > 0 && (
                          <Badge variant="outline" className="ml-auto">
                            {enrichedProperties.size} enriched
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* LIST VIEW */}
                {viewMode === "list" && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <input
                              type="checkbox"
                              checked={selectedPropertyIds.size === results.length && results.length > 0}
                              onChange={toggleSelectAll}
                              className="cursor-pointer"
                            />
                          </TableHead>
                          <TableHead>Deal Score</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Equity</TableHead>
                          <TableHead>Last Sale</TableHead>
                          <TableHead>Loan Amount</TableHead>
                          <TableHead>MLS Status</TableHead>
                          <TableHead>Tags & Flags</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {results.map((property, index) => {
                        const dealScore = calculateDealScore(property);
                        const scoreBadge = getDealScoreBadge(dealScore);
                        const propertyId = property.id || property.propertyId || `prop-${index}`;
                        const isSelected = selectedPropertyIds.has(propertyId);
                        const isEnriched = enrichedProperties.has(propertyId);

                        return (
                          <TableRow key={index} className={isSelected ? "bg-blue-50 dark:bg-blue-950/30" : ""}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePropertySelection(propertyId)}
                                className="cursor-pointer"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="text-2xl font-bold">{dealScore}</div>
                                <Badge variant={scoreBadge.variant} className="text-xs">
                                  {scoreBadge.label}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div>{property.address?.address || property.address?.street || "N/A"}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {property.address?.city || property.city || "N/A"}, {property.address?.state || property.state || "N/A"}
                                  </div>
                                </div>
                                {isEnriched && (
                                  <Badge variant="outline" className="text-xs">
                                    ✓ Enriched
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          <TableCell>
                            <div>
                              <div>{property.ownerName || "N/A"}</div>
                              {property.propertiesOwned > 1 && (
                                <div className="text-xs text-muted-foreground">
                                  {property.propertiesOwned} properties
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            ${property.value?.toLocaleString() || "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                property.equityPercent >= 50 ? "default" : "outline"
                              }
                            >
                              {property.equityPercent || 0}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {property.lastSaleDate ? (
                              <div>
                                <div>{new Date(property.lastSaleDate).toLocaleDateString()}</div>
                                {property.lastSalePrice && (
                                  <div className="text-xs text-muted-foreground">
                                    ${property.lastSalePrice.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell>
                            {property.loanAmount ? (
                              `$${property.loanAmount.toLocaleString()}`
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell>
                            {property.mlsListed ? (
                              <Badge variant="default">Listed</Badge>
                            ) : (
                              <Badge variant="outline">Off Market</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {property.equityPercent >= 80 && (
                                <Badge variant="default" className="text-xs">
                                  High Equity
                                </Badge>
                              )}
                              {property.preForeclosure && (
                                <Badge variant="destructive" className="text-xs">
                                  Pre-Foreclosure
                                </Badge>
                              )}
                              {property.vacant && (
                                <Badge variant="destructive" className="text-xs">
                                  Vacant
                                </Badge>
                              )}
                              {property.propertiesOwned >= 5 && (
                                <Badge variant="default" className="text-xs">
                                  Investor
                                </Badge>
                              )}
                              {property.absenteeOwner && (
                                <Badge variant="outline" className="text-xs">
                                  Absentee
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => executeSkipTrace(propertyId)}
                                title="Skip trace this property"
                                disabled={loading}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                              >
                                <UserSearchIcon className="mr-1 h-3 w-3" />
                                SKIP TRACE
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => getFullReport(propertyId)}
                                title="Full report: Property details + Skip trace + Owner info"
                                disabled={loading}
                              >
                                <SearchIcon className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewPropertyDetail(propertyId)}
                                title="Property details only"
                              >
                                <FileTextIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* CARD VIEW */}
              {viewMode === "card" && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {results.map((property, index) => {
                    const dealScore = calculateDealScore(property);
                    const scoreBadge = getDealScoreBadge(dealScore);
                    return (
                      <Card key={index} className="relative">
                        <div className="absolute top-3 right-3">
                          <Badge variant={scoreBadge.variant}>
                            Score: {dealScore}
                          </Badge>
                        </div>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            {property.address?.address || property.address?.street || "N/A"}
                          </CardTitle>
                          <CardDescription>
                            {property.address?.city || property.city || "N/A"}, {property.address?.state || property.state || "N/A"} {property.address?.zip || property.zipCode || ""}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Key Metrics */}
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <div className="text-muted-foreground">Value</div>
                              <div className="font-semibold text-green-600">
                                ${property.value?.toLocaleString() || "N/A"}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Equity</div>
                              <div>
                                <Badge variant={property.equityPercent >= 50 ? "default" : "outline"}>
                                  {property.equityPercent || 0}%
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          {/* Owner Info */}
                          <div>
                            <div className="text-xs text-muted-foreground">Owner</div>
                            <div className="font-medium">{property.ownerName || "N/A"}</div>
                            {property.propertiesOwned > 1 && (
                              <div className="text-xs text-muted-foreground">
                                {property.propertiesOwned} properties owned
                              </div>
                            )}
                          </div>

                          {/* Property Details */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Type:</span>{" "}
                              {property.propertyType || "N/A"}
                            </div>
                            <div>
                              <span className="text-muted-foreground">MLS:</span>{" "}
                              {property.mlsListed ? (
                                <Badge variant="default" className="text-xs">Listed</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Off Market</Badge>
                              )}
                            </div>
                            {property.beds && (
                              <div>
                                <span className="text-muted-foreground">Beds:</span> {property.beds}
                              </div>
                            )}
                            {property.baths && (
                              <div>
                                <span className="text-muted-foreground">Baths:</span> {property.baths}
                              </div>
                            )}
                            {property.buildingSize && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Size:</span>{" "}
                                {property.buildingSize.toLocaleString()} sqft
                              </div>
                            )}
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1">
                            {property.equityPercent >= 80 && (
                              <Badge variant="default" className="text-xs">High Equity</Badge>
                            )}
                            {property.preForeclosure && (
                              <Badge variant="destructive" className="text-xs">Pre-Foreclosure</Badge>
                            )}
                            {property.vacant && (
                              <Badge variant="destructive" className="text-xs">Vacant</Badge>
                            )}
                            {property.propertiesOwned >= 5 && (
                              <Badge variant="default" className="text-xs">Investor</Badge>
                            )}
                            {property.absenteeOwner && (
                              <Badge variant="outline" className="text-xs">Absentee</Badge>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => executeSkipTrace(property.id)}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                            >
                              <UserSearchIcon className="mr-1 h-3 w-3" />
                              Skip Trace
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewPropertyDetail(property.id)}
                              className="flex-1"
                            >
                              Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* DETAIL VIEW */}
              {viewMode === "detail" && (
                <div className="space-y-4">
                  {results.map((property, index) => {
                    const dealScore = calculateDealScore(property);
                    const scoreBadge = getDealScoreBadge(dealScore);
                    return (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle>{property.address?.address || property.address?.street || "N/A"}</CardTitle>
                              <CardDescription>
                                {property.address?.city || property.city || "N/A"}, {property.address?.state || property.state || "N/A"} {property.address?.zip || property.zipCode || ""} • {property.address?.county || property.county || "N/A"} County
                              </CardDescription>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="text-3xl font-bold">{dealScore}</div>
                              <Badge variant={scoreBadge.variant}>
                                {scoreBadge.label}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-6 md:grid-cols-3">
                            {/* Column 1: Property & Valuation */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-semibold mb-2">Property Details</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Type:</span>
                                    <span className="font-medium">{property.propertyType || "N/A"}</span>
                                  </div>
                                  {property.beds && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Beds/Baths:</span>
                                      <span className="font-medium">{property.beds}/{property.baths || 0}</span>
                                    </div>
                                  )}
                                  {property.buildingSize && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Building Size:</span>
                                      <span className="font-medium">{property.buildingSize.toLocaleString()} sqft</span>
                                    </div>
                                  )}
                                  {property.lotSize && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Lot Size:</span>
                                      <span className="font-medium">{property.lotSize.toLocaleString()} sqft</span>
                                    </div>
                                  )}
                                  {property.yearBuilt && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Year Built:</span>
                                      <span className="font-medium">{property.yearBuilt}</span>
                                    </div>
                                  )}
                                  {property.units && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Units:</span>
                                      <span className="font-medium">{property.units}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <Separator />

                              <div>
                                <h4 className="text-sm font-semibold mb-2">Valuation</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Market Value:</span>
                                    <span className="font-semibold text-green-600">
                                      ${property.value?.toLocaleString() || "N/A"}
                                    </span>
                                  </div>
                                  {property.assessedValue && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Assessed Value:</span>
                                      <span className="font-medium">${property.assessedValue.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {property.taxAmount && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Tax Amount:</span>
                                      <span className="font-medium">${property.taxAmount.toLocaleString()}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Equity %:</span>
                                    <Badge variant={property.equityPercent >= 50 ? "default" : "outline"}>
                                      {property.equityPercent || 0}%
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Column 2: Owner & Financials */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-semibold mb-2">Owner Information</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Name:</span>
                                    <span className="font-medium">{property.ownerName || "N/A"}</span>
                                  </div>
                                  {property.ownerType && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Type:</span>
                                      <span className="font-medium">{property.ownerType}</span>
                                    </div>
                                  )}
                                  {property.propertiesOwned > 1 && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Portfolio:</span>
                                      <span className="font-medium">{property.propertiesOwned} properties</span>
                                    </div>
                                  )}
                                  {property.portfolioValue && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Portfolio Value:</span>
                                      <span className="font-medium">${property.portfolioValue.toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {property.absenteeOwner && <Badge variant="outline" className="text-xs">Absentee</Badge>}
                                  {property.corporateOwned && <Badge variant="outline" className="text-xs">Corporate</Badge>}
                                  {property.outOfStateOwner && <Badge variant="outline" className="text-xs">Out-of-State</Badge>}
                                </div>
                              </div>

                              <Separator />

                              <div>
                                <h4 className="text-sm font-semibold mb-2">Mortgage & Liens</h4>
                                <div className="space-y-1 text-sm">
                                  {property.loanAmount ? (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Loan Amount:</span>
                                      <span className="font-semibold">${property.loanAmount.toLocaleString()}</span>
                                    </div>
                                  ) : (
                                    <div className="text-muted-foreground">No mortgage data available</div>
                                  )}
                                  {property.lenderName && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Lender:</span>
                                      <span className="font-medium">{property.lenderName}</span>
                                    </div>
                                  )}
                                  {property.loanType && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Loan Type:</span>
                                      <span className="font-medium">{property.loanType}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Column 3: Sale History & Status */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-semibold mb-2">Sale History</h4>
                                <div className="space-y-1 text-sm">
                                  {property.lastSaleDate ? (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Last Sale:</span>
                                        <span className="font-medium">
                                          {new Date(property.lastSaleDate).toLocaleDateString()}
                                        </span>
                                      </div>
                                      {property.lastSalePrice && (
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Sale Price:</span>
                                          <span className="font-semibold">${property.lastSalePrice.toLocaleString()}</span>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="text-muted-foreground">No sale history available</div>
                                  )}
                                </div>
                              </div>

                              <Separator />

                              <div>
                                <h4 className="text-sm font-semibold mb-2">MLS Status</h4>
                                <div className="text-sm">
                                  {property.mlsListed ? (
                                    <Badge variant="default">Listed on MLS</Badge>
                                  ) : (
                                    <Badge variant="outline">Off Market</Badge>
                                  )}
                                </div>
                              </div>

                              <Separator />

                              <div>
                                <h4 className="text-sm font-semibold mb-2">Distress Signals</h4>
                                <div className="flex flex-wrap gap-1">
                                  {property.preForeclosure && (
                                    <Badge variant="destructive" className="text-xs">Pre-Foreclosure</Badge>
                                  )}
                                  {property.foreclosure && (
                                    <Badge variant="destructive" className="text-xs">Foreclosure</Badge>
                                  )}
                                  {property.vacant && (
                                    <Badge variant="destructive" className="text-xs">Vacant</Badge>
                                  )}
                                  {property.lisPendens && (
                                    <Badge variant="destructive" className="text-xs">Lis Pendens</Badge>
                                  )}
                                  {!property.preForeclosure && !property.foreclosure && !property.vacant && !property.lisPendens && (
                                    <span className="text-xs text-muted-foreground">None detected</span>
                                  )}
                                </div>
                              </div>

                              {property.propertiesOwned >= 5 && (
                                <>
                                  <Separator />
                                  <div>
                                    <Badge variant="default" className="w-full justify-center">
                                      Active Investor ({property.propertiesOwned} properties)
                                    </Badge>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <Separator className="my-4" />
                          <div className="flex gap-2">
                            <Button
                              size="lg"
                              onClick={() => executeSkipTrace(property.id)}
                              className="flex-1 h-14 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <UserSearchIcon className="mr-2 h-5 w-5" />
                              SKIP TRACE
                            </Button>
                            <Button
                              size="lg"
                              variant="outline"
                              onClick={() => viewPropertyDetail(property.id)}
                              className="flex-1 h-14 text-lg font-bold"
                            >
                              <FileTextIcon className="mr-2 h-5 w-5" />
                              VIEW DETAILS
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* MAP VIEW */}
              {viewMode === "map" && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg p-6 border-2 border-dashed">
                    <div className="text-center space-y-4">
                      <MapIcon className="h-16 w-16 mx-auto text-muted-foreground" />
                      <div>
                        <h3 className="text-xl font-bold mb-2">Interactive Property Map</h3>
                        <p className="text-muted-foreground mb-4">
                          Visualize {results.length} properties on an interactive map with deal score color coding
                        </p>
                      </div>

                      {/* Property Location Grid */}
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 mt-6">
                        {results.slice(0, 20).map((property, index) => {
                          const dealScore = calculateDealScore(property);
                          const scoreBadge = getDealScoreBadge(dealScore);

                          // Determine pin color based on deal score
                          let pinColor = "bg-blue-500"; // Cold
                          if (dealScore >= 90) pinColor = "bg-red-500"; // Hot
                          else if (dealScore >= 70) pinColor = "bg-green-500"; // Good
                          else if (dealScore >= 50) pinColor = "bg-yellow-500"; // Warm

                          return (
                            <Card
                              key={index}
                              className="hover:shadow-lg transition-shadow cursor-pointer"
                              onClick={() => viewPropertyDetail(property.id)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  {/* Pin Marker */}
                                  <div className="relative flex-shrink-0">
                                    <div className={`w-8 h-8 rounded-full ${pinColor} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                                      {dealScore}
                                    </div>
                                    <div className={`w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] ${pinColor} border-l-transparent border-r-transparent absolute left-1/2 -translate-x-1/2`} />
                                  </div>

                                  {/* Property Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                      {property.address?.address || property.address?.street || "N/A"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {property.address?.city || property.city || "N/A"}, {property.address?.state || property.state || "N/A"}
                                    </div>
                                    <div className="text-xs font-semibold text-green-600 mt-1">
                                      ${property.value?.toLocaleString() || "N/A"}
                                    </div>
                                    <Badge variant={scoreBadge.variant} className="text-xs mt-1">
                                      {scoreBadge.label}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Location Coordinates (hidden but available) */}
                                {property.latitude && property.longitude && (
                                  <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                                    📍 {property.latitude.toFixed(4)}, {property.longitude.toFixed(4)}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      {results.length > 20 && (
                        <div className="mt-4 text-sm text-muted-foreground">
                          Showing first 20 of {results.length} properties • Click any property to view details
                        </div>
                      )}

                      {/* Legend */}
                      <div className="mt-8 pt-6 border-t">
                        <h4 className="text-sm font-semibold mb-3">Deal Score Legend</h4>
                        <div className="flex flex-wrap gap-4 justify-center">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-red-500 shadow-lg" />
                            <span className="text-sm">🔥 Hot Deal (90-100)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-green-500 shadow-lg" />
                            <span className="text-sm">✅ Good Deal (70-89)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-yellow-500 shadow-lg" />
                            <span className="text-sm">⚠️ Warm Lead (50-69)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500 shadow-lg" />
                            <span className="text-sm">❄️ Cold Lead (0-49)</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                          <SparklesIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <div className="text-left">
                            <div className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">
                              Coming Soon: Full Interactive Map
                            </div>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              Full Mapbox/Google Maps integration with clustering, heat maps, and advanced filtering. Properties will be plotted with real-time latitude/longitude coordinates from the RealEstateAPI Mapping (Pins) endpoint.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </TabsContent>

        {/* SKIP TRACE TAB */}
        <TabsContent value="skip-trace">
          <Card>
            <CardHeader>
              <CardTitle>Skip Trace Properties</CardTitle>
              <CardDescription>
                Get verified phone numbers and emails for property owners
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Skip trace functionality coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SAVED SEARCHES TAB */}
        <TabsContent value="saved-searches">
          <Card>
            <CardHeader>
              <CardTitle>Saved Searches</CardTitle>
              <CardDescription>
                Automated searches that run daily and track property changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {savedSearches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No saved searches yet. Create one from the Property Search tab.
                </p>
              ) : (
                <div className="space-y-4">
                  {savedSearches.map((search, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-lg">{search.searchName}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">
                          Total Properties: {search.totalProperties || 0}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Query History</CardTitle>
              <CardDescription>
                View and rerun your previous searches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Query history coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Property Detail Sheet */}
      <Sheet open={propertyDetailOpen} onOpenChange={setPropertyDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Property Details</SheetTitle>
            <SheetDescription>
              Comprehensive property information and owner data
            </SheetDescription>
          </SheetHeader>

          {propertyDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingOverlay />
            </div>
          ) : selectedProperty ? (
            <div className="space-y-6 mt-6">
              {/* Property Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Property Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-medium">Street Address:</div>
                    <div>{selectedProperty.address?.address || selectedProperty.address?.street || "N/A"}</div>
                    <div className="font-medium">City:</div>
                    <div>{selectedProperty.address?.city || selectedProperty.city || "N/A"}</div>
                    <div className="font-medium">State:</div>
                    <div>{selectedProperty.address?.state || selectedProperty.state || "N/A"}</div>
                    <div className="font-medium">Zip Code:</div>
                    <div>{selectedProperty.address?.zip || selectedProperty.zipCode || "N/A"}</div>
                    <div className="font-medium">County:</div>
                    <div>{selectedProperty.address?.county || selectedProperty.county || "N/A"}</div>
                    <div className="font-medium">APN:</div>
                    <div>{selectedProperty.apn || "N/A"}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Property Valuation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Valuation & Financials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-medium">Market Value:</div>
                    <div className="font-semibold text-green-600">
                      ${selectedProperty.value?.toLocaleString() || "N/A"}
                    </div>
                    <div className="font-medium">Assessed Value:</div>
                    <div>${selectedProperty.assessedValue?.toLocaleString() || "N/A"}</div>
                    <div className="font-medium">Tax Amount:</div>
                    <div>${selectedProperty.taxAmount?.toLocaleString() || "N/A"}</div>
                    <div className="font-medium">Equity Percent:</div>
                    <div>
                      <Badge variant={selectedProperty.equityPercent >= 50 ? "default" : "outline"}>
                        {selectedProperty.equityPercent || 0}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Last Sale Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sale History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-medium">Last Sale Date:</div>
                    <div>
                      {selectedProperty.lastSaleDate
                        ? new Date(selectedProperty.lastSaleDate).toLocaleDateString()
                        : "N/A"}
                    </div>
                    <div className="font-medium">Last Sale Price:</div>
                    <div className="font-semibold">
                      ${selectedProperty.lastSalePrice?.toLocaleString() || "N/A"}
                    </div>
                    <div className="font-medium">Recording Date:</div>
                    <div>
                      {selectedProperty.recordingDate
                        ? new Date(selectedProperty.recordingDate).toLocaleDateString()
                        : "N/A"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mortgage Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Mortgage & Liens</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-medium">Loan Amount:</div>
                    <div className="font-semibold">
                      ${selectedProperty.loanAmount?.toLocaleString() || "N/A"}
                    </div>
                    <div className="font-medium">Lender Name:</div>
                    <div>{selectedProperty.lenderName || "N/A"}</div>
                    <div className="font-medium">Loan Type:</div>
                    <div>{selectedProperty.loanType || "N/A"}</div>
                    <div className="font-medium">Loan Date:</div>
                    <div>
                      {selectedProperty.loanDate
                        ? new Date(selectedProperty.loanDate).toLocaleDateString()
                        : "N/A"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Property Characteristics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Property Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-medium">Property Type:</div>
                    <div>{selectedProperty.propertyType || "N/A"}</div>
                    <div className="font-medium">Bedrooms:</div>
                    <div>{selectedProperty.beds || "N/A"}</div>
                    <div className="font-medium">Bathrooms:</div>
                    <div>{selectedProperty.baths || "N/A"}</div>
                    <div className="font-medium">Building Size:</div>
                    <div>{selectedProperty.buildingSize?.toLocaleString() || "N/A"} sqft</div>
                    <div className="font-medium">Lot Size:</div>
                    <div>{selectedProperty.lotSize?.toLocaleString() || "N/A"} sqft</div>
                    <div className="font-medium">Year Built:</div>
                    <div>{selectedProperty.yearBuilt || "N/A"}</div>
                    <div className="font-medium">Units:</div>
                    <div>{selectedProperty.units || "N/A"}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Owner Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Owner Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-medium">Owner Name:</div>
                    <div>{selectedProperty.ownerName || "N/A"}</div>
                    <div className="font-medium">Owner Type:</div>
                    <div>{selectedProperty.ownerType || "N/A"}</div>
                    <div className="font-medium">Mailing Address:</div>
                    <div>{selectedProperty.mailingAddress || "N/A"}</div>
                    <div className="font-medium">Mailing City/State:</div>
                    <div>
                      {selectedProperty.mailingCity && selectedProperty.mailingState
                        ? `${selectedProperty.mailingCity}, ${selectedProperty.mailingState}`
                        : "N/A"}
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex flex-wrap gap-2">
                    {selectedProperty.absenteeOwner && (
                      <Badge variant="outline">Absentee Owner</Badge>
                    )}
                    {selectedProperty.corporateOwned && (
                      <Badge variant="outline">Corporate Owned</Badge>
                    )}
                    {selectedProperty.outOfStateOwner && (
                      <Badge variant="outline">Out-of-State Owner</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Portfolio Information */}
              {selectedProperty.propertiesOwned > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Portfolio Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="font-medium">Properties Owned:</div>
                      <div className="font-semibold">{selectedProperty.propertiesOwned}</div>
                      <div className="font-medium">Portfolio Value:</div>
                      <div>${selectedProperty.portfolioValue?.toLocaleString() || "N/A"}</div>
                      <div className="font-medium">Purchased Last 12 Months:</div>
                      <div>{selectedProperty.portfolioPurchasedLast12 || 0}</div>
                    </div>
                    {selectedProperty.propertiesOwned >= 5 && (
                      <Badge variant="default" className="mt-2">Active Investor</Badge>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Distress Signals */}
              {(selectedProperty.preForeclosure || selectedProperty.foreclosure || selectedProperty.vacant || selectedProperty.lisPendens) && (
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-lg text-destructive">Distress Signals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperty.preForeclosure && (
                        <Badge variant="destructive">Pre-Foreclosure</Badge>
                      )}
                      {selectedProperty.foreclosure && (
                        <Badge variant="destructive">Foreclosure</Badge>
                      )}
                      {selectedProperty.vacant && (
                        <Badge variant="destructive">Vacant</Badge>
                      )}
                      {selectedProperty.lisPendens && (
                        <Badge variant="destructive">Lis Pendens</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* MLS Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">MLS Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-medium">MLS Listed:</div>
                    <div>
                      {selectedProperty.mlsListed ? (
                        <Badge variant="default">Listed</Badge>
                      ) : (
                        <Badge variant="outline">Off Market</Badge>
                      )}
                    </div>
                    {selectedProperty.mlsListingDate && (
                      <>
                        <div className="font-medium">Listing Date:</div>
                        <div>
                          {new Date(selectedProperty.mlsListingDate).toLocaleDateString()}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  onClick={() => executeSkipTrace(selectedProperty.id)}
                  className="w-full h-16 text-xl font-bold bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <UserSearchIcon className="mr-2 h-6 w-6" />
                  SKIP TRACE THIS PROPERTY
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    setPropertyDetailOpen(false);
                  }}
                  className="w-full h-12"
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No property data available
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
