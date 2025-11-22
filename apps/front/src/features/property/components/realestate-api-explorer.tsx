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
import { useCurrentTeam } from "@/features/team/team.context";
import {
  SearchIcon,
  HomeIcon,
  UserSearchIcon,
  BookmarkIcon,
  PlayIcon,
  DownloadIcon,
  SaveIcon,
  HistoryIcon,
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

interface QueryParams {
  // Geo Filters
  state?: string;
  city?: string;
  county?: string;
  zipCode?: string;

  // Property Type
  propertyType?: string;

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

  // Distress Signals
  preForeclosure?: boolean;
  foreclosure?: boolean;
  vacant?: boolean;
  lisPendens?: boolean;

  // Owner Filters
  absenteeOwner?: boolean;
  outOfStateOwner?: boolean;
  corporateOwned?: boolean;

  // Property Characteristics
  buildingSizeMin?: number;
  buildingSizeMax?: number;
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
  const { team } = useCurrentTeam();
  const [activeTab, setActiveTab] = useState("property-search");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [queryParams, setQueryParams] = useState<QueryParams>({
    size: 50,
  });

  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [propertyDetailOpen, setPropertyDetailOpen] = useState(false);
  const [propertyDetailLoading, setPropertyDetailLoading] = useState(false);

  const executePropertySearch = async () => {
    setLoading(true);
    try {
      const { data } = await $http.post(`/${team.id}/realestate-api/property-search`, {
        ...queryParams,
      });

      setResults(data.data || []);
      setTotalResults(data.total || 0);
      toast.success(`Found ${data.total || 0} properties!`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Property search failed");
    } finally {
      setLoading(false);
    }
  };

  const executeSkipTrace = async (propertyId: string) => {
    setLoading(true);
    try {
      const { data } = await $http.post(`/${team.id}/realestate-api/skip-trace`, {
        propertyId,
      });

      toast.success("Skip trace complete!");
      return data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Skip trace failed");
    } finally {
      setLoading(false);
    }
  };

  const viewPropertyDetail = async (propertyId: string) => {
    setPropertyDetailLoading(true);
    setPropertyDetailOpen(true);
    try {
      const { data } = await $http.post(
        `/${team.id}/realestate-api/property-detail/${propertyId}`,
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

  const createSavedSearch = async () => {
    setLoading(true);
    try {
      const searchName = prompt("Enter a name for this saved search:");
      if (!searchName) return;

      const { data } = await $http.post(`/${team.id}/realestate-api/saved-search/create`, {
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

  const exportResults = () => {
    const csv = [
      ["Address", "City", "State", "Value", "Equity %", "Owner", "Property Type"].join(","),
      ...results.map(r =>
        [
          r.address,
          r.city,
          r.state,
          r.value,
          r.equityPercent,
          r.ownerName,
          r.propertyType,
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

              {/* Geographic Filters */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Geographic Filters</h3>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Select
                      value={queryParams.state}
                      onValueChange={(value) =>
                        setQueryParams({ ...queryParams, state: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
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
                    <Label>City</Label>
                    <Input
                      placeholder="e.g., Miami"
                      value={queryParams.city || ""}
                      onChange={(e) =>
                        setQueryParams({ ...queryParams, city: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>County</Label>
                    <Input
                      placeholder="e.g., Miami-Dade"
                      value={queryParams.county || ""}
                      onChange={(e) =>
                        setQueryParams({ ...queryParams, county: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Zip Code</Label>
                    <Input
                      placeholder="e.g., 33139"
                      value={queryParams.zipCode || ""}
                      onChange={(e) =>
                        setQueryParams({ ...queryParams, zipCode: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Property Type & Value */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Property Type & Value</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Property Type</Label>
                    <Select
                      value={queryParams.propertyType}
                      onValueChange={(value) =>
                        setQueryParams({ ...queryParams, propertyType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SFR">Single Family Residential</SelectItem>
                        <SelectItem value="MFH">Multi-Family (2-4 units)</SelectItem>
                        <SelectItem value="APARTMENT">Apartments (5+ units)</SelectItem>
                        <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                        <SelectItem value="LAND">Land</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Min Value</Label>
                    <Input
                      type="number"
                      placeholder="$100,000"
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
                    <Label>Max Value</Label>
                    <Input
                      type="number"
                      placeholder="$1,000,000"
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

              {/* Equity Filters */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Equity Filters (Find Motivated Sellers!)</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Min Equity %</Label>
                    <Input
                      type="number"
                      placeholder="50"
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
                    <Label>Max Equity %</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={queryParams.equityPercentMax || ""}
                      onChange={(e) =>
                        setQueryParams({
                          ...queryParams,
                          equityPercentMax: parseInt(e.target.value) || undefined,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Quick Filters</Label>
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
                        High Equity (50%+)
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
                </div>
              </div>

              {/* Portfolio Filters (Find Investors) */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Portfolio Filters (Find Investors & Cash Buyers!)
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Min Properties Owned</Label>
                    <Input
                      type="number"
                      placeholder="5"
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
                      placeholder="$1,000,000"
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
                    <Label>Purchased Last 12 Months (Min)</Label>
                    <Input
                      type="number"
                      placeholder="3"
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

              {/* Distress Signals */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Distress Signals (Hot Leads!)</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={queryParams.preForeclosure ? "destructive" : "outline"}
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
                    variant={queryParams.foreclosure ? "destructive" : "outline"}
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
                    variant={queryParams.vacant ? "destructive" : "outline"}
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
                    variant={queryParams.lisPendens ? "destructive" : "outline"}
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
                </div>
              </div>

              {/* Owner Filters */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Owner Filters</h3>
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
                    Absentee Owner
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
                    Out-of-State Owner
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
                    Corporate Owned
                  </Button>
                </div>
              </div>

              {/* Property Characteristics */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Property Characteristics</h3>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Min Beds</Label>
                    <Input
                      type="number"
                      placeholder="3"
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
                    <Label>Min Baths</Label>
                    <Input
                      type="number"
                      placeholder="2"
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
                    <Label>Min Sqft</Label>
                    <Input
                      type="number"
                      placeholder="1500"
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
                    <Label>Min Units</Label>
                    <Input
                      type="number"
                      placeholder="4"
                      value={queryParams.unitsMin || ""}
                      onChange={(e) =>
                        setQueryParams({
                          ...queryParams,
                          unitsMin: parseInt(e.target.value) || undefined,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Result Limit */}
              <div className="space-y-2">
                <Label>Results Limit</Label>
                <Input
                  type="number"
                  placeholder="50"
                  value={queryParams.size || ""}
                  onChange={(e) =>
                    setQueryParams({
                      ...queryParams,
                      size: parseInt(e.target.value) || undefined,
                    })
                  }
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={executePropertySearch} disabled={loading}>
                  <PlayIcon className="mr-2 h-4 w-4" />
                  Execute Search
                </Button>
                <Button variant="outline" onClick={createSavedSearch} disabled={loading}>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Save Search
                </Button>
                <Button
                  variant="outline"
                  onClick={exportResults}
                  disabled={results.length === 0}
                >
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Search Results ({totalResults.toLocaleString()} total)</CardTitle>
                <CardDescription>
                  Showing {results.length} properties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                      {results.map((property, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{property.address || "N/A"}</div>
                              <div className="text-xs text-muted-foreground">
                                {property.city}, {property.state}
                              </div>
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
                                variant="outline"
                                onClick={() => executeSkipTrace(property.id)}
                                title="Get verified contacts"
                              >
                                Skip Trace
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewPropertyDetail(property.id)}
                                title="View full property details"
                              >
                                Details
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
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
                    <div>{selectedProperty.address || "N/A"}</div>
                    <div className="font-medium">City:</div>
                    <div>{selectedProperty.city || "N/A"}</div>
                    <div className="font-medium">State:</div>
                    <div>{selectedProperty.state || "N/A"}</div>
                    <div className="font-medium">Zip Code:</div>
                    <div>{selectedProperty.zipCode || "N/A"}</div>
                    <div className="font-medium">County:</div>
                    <div>{selectedProperty.county || "N/A"}</div>
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
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={() => executeSkipTrace(selectedProperty.id)}
                  className="flex-1"
                >
                  Skip Trace Owner
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPropertyDetailOpen(false);
                  }}
                  className="flex-1"
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
