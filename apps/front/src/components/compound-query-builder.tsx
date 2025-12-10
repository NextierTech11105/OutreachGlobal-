"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { MapComponent } from "@/components/map-component";
import { SearchResults } from "@/components/search-results";
import type { PropertySearchQuery, PropertySearchResult } from "@/lib/services/real-estate-api";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { sf } from "@/lib/utils/safe-format";

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

export function CompoundQueryBuilder() {
  const [activeTab, setActiveTab] = useState("location");
  const [isSearching, setIsSearching] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Location filters
  const [selectedState, setSelectedState] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [zipCodes, setZipCodes] = useState("");

  // Equity filters
  const [equityRange, setEquityRange] = useState([0, 100]);
  const [highEquity, setHighEquity] = useState(false);
  const [freeClear, setFreeClear] = useState(false);

  // Distress filters
  const [preForeclosure, setPreForeclosure] = useState(false);
  const [foreclosure, setForeclosure] = useState(false);
  const [auction, setAuction] = useState(false);
  const [taxLien, setTaxLien] = useState(false);
  const [vacant, setVacant] = useState(false);
  const [inherited, setInherited] = useState(false);
  const [death, setDeath] = useState(false);

  // Owner filters
  const [absenteeOwner, setAbsenteeOwner] = useState(false);
  const [corporateOwned, setCorporateOwned] = useState(false);
  const [cashBuyer, setCashBuyer] = useState(false);
  const [investorBuyer, setInvestorBuyer] = useState(false);

  // Property filters
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [idsOnly, setIdsOnly] = useState(true);

  // Sort
  const [sortField, setSortField] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Results
  const [results, setResults] = useState<PropertySearchResult[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [currentQuery, setCurrentQuery] = useState<PropertySearchQuery | null>(null);

  const buildQuery = useCallback((): PropertySearchQuery => {
    const query: PropertySearchQuery = {};

    // Location - at least one required
    if (selectedState) query.state = selectedState;
    if (county) query.county = county;
    if (city) query.city = city;
    if (zipCodes) {
      const zips = zipCodes.split(",").map(z => z.trim()).filter(Boolean);
      if (zips.length === 1) query.zip = zips[0];
    }

    // Equity
    if (equityRange[0] > 0) query.equity_percent_min = equityRange[0];
    if (equityRange[1] < 100) query.equity_percent_max = equityRange[1];
    if (highEquity) query.high_equity = true;
    if (freeClear) query.free_clear = true;

    // Distress indicators
    if (preForeclosure) query.pre_foreclosure = true;
    if (foreclosure) query.foreclosure = true;
    if (auction) query.auction = true;
    if (taxLien) query.tax_lien = true;
    if (vacant) query.vacant = true;
    if (inherited) query.inherited = true;
    if (death) query.death = true;

    // Owner types
    if (absenteeOwner) query.absentee_owner = true;
    if (corporateOwned) query.corporate_owned = true;
    if (cashBuyer) query.cash_buyer = true;
    if (investorBuyer) query.investor_buyer = true;

    // Property types
    if (propertyTypes.length > 0) {
      query.property_type = propertyTypes;
    }

    // Sort
    if (sortField) {
      query.sort = { [sortField]: sortOrder } as PropertySearchQuery["sort"];
    }

    // Result mode
    if (idsOnly) {
      query.ids_only = true;
      query.size = 1000;
    } else {
      query.size = 50;
    }

    return query;
  }, [
    selectedState, county, city, zipCodes,
    equityRange, highEquity, freeClear,
    preForeclosure, foreclosure, auction, taxLien, vacant, inherited, death,
    absenteeOwner, corporateOwned, cashBuyer, investorBuyer,
    propertyTypes, sortField, sortOrder, idsOnly
  ]);

  const handleSearch = async () => {
    // Validate location
    if (!selectedState && !county && !city && !zipCodes) {
      setError("Please specify at least one location filter (state, county, city, or ZIP)");
      return;
    }

    setError(null);
    setIsSearching(true);

    try {
      const query = buildQuery();
      setCurrentQuery(query);

      const response = await fetch("/api/property-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Search failed");
      }

      const data = await response.json();

      if (idsOnly) {
        setPropertyIds(data.ids || []);
        setResultCount(data.count || data.ids?.length || 0);
        setResults([]);
      } else {
        setResults(data.properties || []);
        setResultCount(data.resultCount || data.properties?.length || 0);
        setPropertyIds([]);
      }

      setSearchComplete(true);
      toast.success(`Found ${data.resultCount || data.count || data.ids?.length || 0} properties`);
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : "Search failed");
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveSearch = async () => {
    if (!currentQuery) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "default-user",
          name: `${selectedState || city || "Search"} - ${new Date().toLocaleDateString()}`,
          description: buildSearchDescription(),
          query: currentQuery,
          notifyOnChanges: false,
        }),
      });

      if (!response.ok) throw new Error("Failed to save search");

      const data = await response.json();
      toast.success(`Saved search with ${data.propertyIds?.length || 0} property IDs tracked`);
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save search");
    } finally {
      setIsSaving(false);
    }
  };

  const buildSearchDescription = () => {
    const parts: string[] = [];
    if (selectedState) parts.push(selectedState);
    if (county) parts.push(county);
    if (city) parts.push(city);
    if (highEquity) parts.push("High Equity");
    if (preForeclosure) parts.push("Pre-Foreclosure");
    if (vacant) parts.push("Vacant");
    if (absenteeOwner) parts.push("Absentee");
    return parts.join(", ") || "Property Search";
  };

  const togglePropertyType = (type: string) => {
    setPropertyTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedState || county || city || zipCodes) count++;
    if (equityRange[0] > 0 || equityRange[1] < 100 || highEquity || freeClear) count++;
    if (preForeclosure || foreclosure || auction || taxLien || vacant || inherited || death) count++;
    if (absenteeOwner || corporateOwned || propertyTypes.length > 0) count++;
    return count;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Compound Query Builder</CardTitle>
            <CardDescription>
              Build complex property searches with multiple filters
            </CardDescription>
          </div>
          {getActiveFiltersCount() > 0 && (
            <Badge variant="secondary">{getActiveFiltersCount()} filter groups active</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {!searchComplete ? (
          <Tabs
            defaultValue="location"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="location">Location</TabsTrigger>
              <TabsTrigger value="equity">Equity</TabsTrigger>
              <TabsTrigger value="distress">Distress</TabsTrigger>
              <TabsTrigger value="property">Property</TabsTrigger>
            </TabsList>

            <TabsContent value="location" className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(state => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    placeholder="e.g., Los Angeles"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Austin"
                />
              </div>

              <div className="space-y-2">
                <Label>Draw Polygon</Label>
                <div className="h-[300px] rounded-md border">
                  <MapComponent />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip-codes">ZIP Codes (optional)</Label>
                <Input
                  id="zip-codes"
                  value={zipCodes}
                  onChange={(e) => setZipCodes(e.target.value)}
                  placeholder="e.g., 78701, 78702, 78703"
                />
                <p className="text-xs text-muted-foreground">
                  Enter comma-separated ZIP codes to further narrow your search
                </p>
              </div>
            </TabsContent>

            <TabsContent value="equity" className="mt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Equity Percentage Range</Label>
                    <span className="text-sm text-muted-foreground">
                      {equityRange[0]}% - {equityRange[1]}%
                    </span>
                  </div>
                  <Slider
                    defaultValue={[0, 100]}
                    max={100}
                    step={5}
                    value={equityRange}
                    onValueChange={setEquityRange}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="high-equity"
                    checked={highEquity}
                    onCheckedChange={(checked) => setHighEquity(checked === true)}
                  />
                  <Label htmlFor="high-equity">High Equity (80%+)</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="free-clear"
                    checked={freeClear}
                    onCheckedChange={(checked) => setFreeClear(checked === true)}
                  />
                  <Label htmlFor="free-clear">Free & Clear (No Mortgage)</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sort Results By</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={sortField} onValueChange={setSortField}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="years_owned">Years Owned</SelectItem>
                      <SelectItem value="equity_percent">Equity %</SelectItem>
                      <SelectItem value="estimated_equity">Equity Amount</SelectItem>
                      <SelectItem value="estimated_value">Property Value</SelectItem>
                      <SelectItem value="year_built">Year Built</SelectItem>
                      <SelectItem value="building_size">Building Size</SelectItem>
                      <SelectItem value="lot_size">Lot Size</SelectItem>
                      <SelectItem value="last_sale_date">Last Sale Date</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Descending</SelectItem>
                      <SelectItem value="asc">Ascending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="distress" className="mt-6 space-y-4">
              <div className="space-y-4">
                <Label className="text-base font-semibold">Distress Indicators</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="pre-foreclosure"
                      checked={preForeclosure}
                      onCheckedChange={setPreForeclosure}
                    />
                    <Label htmlFor="pre-foreclosure">Pre-Foreclosure / Lis Pendens</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="foreclosure"
                      checked={foreclosure}
                      onCheckedChange={setForeclosure}
                    />
                    <Label htmlFor="foreclosure">Foreclosure</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auction"
                      checked={auction}
                      onCheckedChange={setAuction}
                    />
                    <Label htmlFor="auction">Auction</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="tax-lien"
                      checked={taxLien}
                      onCheckedChange={setTaxLien}
                    />
                    <Label htmlFor="tax-lien">Tax Lien</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="vacant"
                      checked={vacant}
                      onCheckedChange={setVacant}
                    />
                    <Label htmlFor="vacant">Vacant Property</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="inherited"
                      checked={inherited}
                      onCheckedChange={setInherited}
                    />
                    <Label htmlFor="inherited">Inherited</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="death"
                      checked={death}
                      onCheckedChange={setDeath}
                    />
                    <Label htmlFor="death">Death in Family</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-semibold">Owner Characteristics</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="absentee"
                      checked={absenteeOwner}
                      onCheckedChange={(checked) => setAbsenteeOwner(checked === true)}
                    />
                    <Label htmlFor="absentee">Absentee Owner</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="corporate"
                      checked={corporateOwned}
                      onCheckedChange={(checked) => setCorporateOwned(checked === true)}
                    />
                    <Label htmlFor="corporate">Corporate Owned (LLC)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="cash-buyer"
                      checked={cashBuyer}
                      onCheckedChange={(checked) => setCashBuyer(checked === true)}
                    />
                    <Label htmlFor="cash-buyer">Cash Buyer</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="investor"
                      checked={investorBuyer}
                      onCheckedChange={(checked) => setInvestorBuyer(checked === true)}
                    />
                    <Label htmlFor="investor">Investor Buyer</Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="property" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Property Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sfr"
                      checked={propertyTypes.includes("SFR")}
                      onCheckedChange={() => togglePropertyType("SFR")}
                    />
                    <Label htmlFor="sfr">Single Family</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mfr"
                      checked={propertyTypes.includes("MFR")}
                      onCheckedChange={() => togglePropertyType("MFR")}
                    />
                    <Label htmlFor="mfr">Multi-Family</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="condo"
                      checked={propertyTypes.includes("CONDO")}
                      onCheckedChange={() => togglePropertyType("CONDO")}
                    />
                    <Label htmlFor="condo">Condo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="townhouse"
                      checked={propertyTypes.includes("TOWNHOUSE")}
                      onCheckedChange={() => togglePropertyType("TOWNHOUSE")}
                    />
                    <Label htmlFor="townhouse">Townhouse</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="land"
                      checked={propertyTypes.includes("LAND")}
                      onCheckedChange={() => togglePropertyType("LAND")}
                    />
                    <Label htmlFor="land">Vacant Land</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mobile"
                      checked={propertyTypes.includes("MOBILE")}
                      onCheckedChange={() => togglePropertyType("MOBILE")}
                    />
                    <Label htmlFor="mobile">Mobile Home</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ids-only" className="text-base font-semibold">IDs Only Mode</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fetch up to 10,000 property IDs for tracking & change detection
                    </p>
                  </div>
                  <Switch
                    id="ids-only"
                    checked={idsOnly}
                    onCheckedChange={setIdsOnly}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <h3 className="font-semibold text-lg">{sf(resultCount)} Properties Found</h3>
                <p className="text-sm text-muted-foreground">
                  {idsOnly
                    ? `${sf(propertyIds.length)} IDs retrieved for tracking`
                    : `Showing ${results.length} detailed results`
                  }
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleSaveSearch}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Search
              </Button>
            </div>
            <SearchResults
              results={results}
              propertyIds={propertyIds}
              resultCount={resultCount}
              idsOnly={idsOnly}
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {!searchComplete ? (
          <>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  const tabs = ["location", "equity", "distress", "property"];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex > 0) {
                    setActiveTab(tabs[currentIndex - 1]);
                  }
                }}
                disabled={activeTab === "location"}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const tabs = ["location", "equity", "distress", "property"];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1]);
                  }
                }}
                disabled={activeTab === "property"}
              >
                Next
              </Button>
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                "Search Properties"
              )}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setSearchComplete(false)}>
              Back to Query
            </Button>
            <Button>Proceed to Enrichment</Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
