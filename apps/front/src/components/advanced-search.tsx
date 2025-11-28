"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Filter, Save, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SearchResults } from "@/components/search-results";

export function AdvancedSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);
  const [activeTab, setActiveTab] = useState("property");
  const [equityRange, setEquityRange] = useState([30, 80]);
  const [filingDate, setFilingDate] = useState<Date | undefined>(undefined);

  const handleSearch = () => {
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      setIsSearching(false);
      setSearchComplete(true);
    }, 2000);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Advanced Search</CardTitle>
        <CardDescription>
          Build complex queries with multiple criteria
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!searchComplete ? (
          <Tabs
            defaultValue="property"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="property">Property</TabsTrigger>
              <TabsTrigger value="owner">Owner</TabsTrigger>
              <TabsTrigger value="mortgage">Mortgage</TabsTrigger>
              <TabsTrigger value="distress">Distress</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="property" className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select defaultValue="ny">
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ny">New York</SelectItem>
                      <SelectItem value="nj">New Jersey</SelectItem>
                      <SelectItem value="ct">Connecticut</SelectItem>
                      <SelectItem value="pa">Pennsylvania</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Select defaultValue="queens">
                    <SelectTrigger id="county">
                      <SelectValue placeholder="Select county" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="queens">Queens</SelectItem>
                      <SelectItem value="kings">Kings (Brooklyn)</SelectItem>
                      <SelectItem value="new_york">
                        New York (Manhattan)
                      </SelectItem>
                      <SelectItem value="bronx">Bronx</SelectItem>
                      <SelectItem value="richmond">
                        Richmond (Staten Island)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip-codes">Zip Codes</Label>
                <Input id="zip-codes" placeholder="e.g. 11101, 11102, 11103" />
                <p className="text-xs text-muted-foreground">
                  Enter comma-separated zip codes to narrow your search
                </p>
              </div>

              <div className="space-y-2">
                <Label>Property Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="single-family" />
                    <Label htmlFor="single-family">Single Family</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="multi-family" />
                    <Label htmlFor="multi-family">Multi-Family</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="condo" />
                    <Label htmlFor="condo">Condo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="vacant-land" />
                    <Label htmlFor="vacant-land">Vacant Land</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="commercial" />
                    <Label htmlFor="commercial">Commercial</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="industrial" />
                    <Label htmlFor="industrial">Industrial</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Zoning</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="r1" />
                    <Label htmlFor="r1">R1-R5 (Low Density)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="r6" />
                    <Label htmlFor="r6">R6 (Medium Density)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="r7" />
                    <Label htmlFor="r7">R7 (Medium Density)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="r8" />
                    <Label htmlFor="r8">R8 (High Density)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="r9" />
                    <Label htmlFor="r9">R9-R10 (High Density)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="commercial-zone" />
                    <Label htmlFor="commercial-zone">Commercial</Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min-bedrooms">Minimum Bedrooms</Label>
                  <Select>
                    <SelectTrigger id="min-bedrooms">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                      <SelectItem value="4">4+</SelectItem>
                      <SelectItem value="5">5+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-bathrooms">Minimum Bathrooms</Label>
                  <Select>
                    <SelectTrigger id="min-bathrooms">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                      <SelectItem value="4">4+</SelectItem>
                      <SelectItem value="5">5+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="vacant" />
                  <Label htmlFor="vacant">Vacant Property</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="owner" className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label>Owner Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="individual" />
                    <Label htmlFor="individual">Individual</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="estate" />
                    <Label htmlFor="estate">Estate</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="trust" />
                    <Label htmlFor="trust">Trust</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="llc" />
                    <Label htmlFor="llc">LLC</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="corporation" />
                    <Label htmlFor="corporation">Corporation</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="government" />
                    <Label htmlFor="government">Government</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner-name">Owner Name</Label>
                <Input id="owner-name" placeholder="Enter owner name" />
              </div>

              <div className="space-y-2">
                <Label>Owner Residence</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="absentee" />
                    <Label htmlFor="absentee">Absentee Owner</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="out-of-state" />
                    <Label htmlFor="out-of-state">Out of State Owner</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="years-owned">Years Owned</Label>
                <Select>
                  <SelectTrigger id="years-owned">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="less-than-1">
                      Less than 1 year
                    </SelectItem>
                    <SelectItem value="1-5">1-5 years</SelectItem>
                    <SelectItem value="5-10">5-10 years</SelectItem>
                    <SelectItem value="10-20">10-20 years</SelectItem>
                    <SelectItem value="more-than-20">
                      More than 20 years
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="mortgage" className="mt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Equity Percentage Range</Label>
                    <span className="text-sm text-muted-foreground">
                      {equityRange[0]}% - {equityRange[1]}%
                    </span>
                  </div>
                  <Slider
                    defaultValue={[30, 80]}
                    max={100}
                    step={1}
                    value={equityRange}
                    onValueChange={setEquityRange}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="high-equity" />
                  <Label htmlFor="high-equity">High Equity (80%+)</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="low-equity" />
                  <Label htmlFor="low-equity">Low Equity (Below 30%)</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="negative-equity" />
                  <Label htmlFor="negative-equity">
                    Negative Equity (Underwater)
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Loan Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="conventional" />
                    <Label htmlFor="conventional">Conventional</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="fha" />
                    <Label htmlFor="fha">FHA</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="va" />
                    <Label htmlFor="va">VA</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="reverse" />
                    <Label htmlFor="reverse">Reverse Mortgage</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="heloc" />
                    <Label htmlFor="heloc">HELOC</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="private" />
                    <Label htmlFor="private">Private Lender</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maturity-date">Loan Maturity Date</Label>
                <Select>
                  <SelectTrigger id="maturity-date">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="6months">Within 6 months</SelectItem>
                    <SelectItem value="12months">Within 12 months</SelectItem>
                    <SelectItem value="24months">Within 24 months</SelectItem>
                    <SelectItem value="36months">Within 36 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lender-name">Lender Name</Label>
                <Input id="lender-name" placeholder="Enter lender name" />
              </div>
            </TabsContent>

            <TabsContent value="distress" className="mt-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="lis-pendens" />
                  <Label htmlFor="lis-pendens">Lis Pendens</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="pre-foreclosure" />
                  <Label htmlFor="pre-foreclosure">Pre-Foreclosure</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="auction" />
                  <Label htmlFor="auction">Auction</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="reo" />
                  <Label htmlFor="reo">REO / Bank-Owned</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="tax-lien" />
                  <Label htmlFor="tax-lien">Tax Lien</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="bankruptcy" />
                  <Label htmlFor="bankruptcy">Bankruptcy</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filing-date">Filing Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filingDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filingDate ? format(filingDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filingDate}
                      onSelect={setFilingDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auction-date">Auction Date</Label>
                <Select>
                  <SelectTrigger id="auction-date">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="next-30">Next 30 days</SelectItem>
                    <SelectItem value="next-60">Next 60 days</SelectItem>
                    <SelectItem value="next-90">Next 90 days</SelectItem>
                    <SelectItem value="past-30">Past 30 days</SelectItem>
                    <SelectItem value="past-60">Past 60 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="case-number">Case Number</Label>
                <Input id="case-number" placeholder="Enter case number" />
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="ids-only">IDs Only Search</Label>
                <div className="flex items-center justify-between rounded-md border p-4">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-medium">
                      Enable IDs Only Search
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Fetch up to 10,000 property IDs matching your criteria
                      (recommended for large searches)
                    </p>
                  </div>
                  <Switch id="ids-only" defaultChecked />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-results">Maximum Results</Label>
                <Select defaultValue="1000">
                  <SelectTrigger id="max-results">
                    <SelectValue placeholder="Select maximum results" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="250">250</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="1000">1,000</SelectItem>
                    <SelectItem value="5000">5,000</SelectItem>
                    <SelectItem value="10000">10,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enrichment">Enrichment Level</Label>
                <Select defaultValue="basic">
                  <SelectTrigger id="enrichment">
                    <SelectValue placeholder="Select enrichment level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">
                      Basic (Address, Property ID)
                    </SelectItem>
                    <SelectItem value="standard">
                      Standard (+ Owner, Mortgage)
                    </SelectItem>
                    <SelectItem value="full">Full (+ All Details)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Exclusions</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="exclude-existing" />
                    <Label htmlFor="exclude-existing">
                      Exclude existing records in CRM
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="exclude-campaigns" />
                    <Label htmlFor="exclude-campaigns">
                      Exclude records in active campaigns
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="save-search">Save Search</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="save-search"
                    placeholder="Enter a name for this search"
                  />
                  <Button variant="outline" className="shrink-0">
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <SearchResults />
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {!searchComplete ? (
          <>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  const tabs = [
                    "property",
                    "owner",
                    "mortgage",
                    "distress",
                    "advanced",
                  ];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex > 0) {
                    setActiveTab(tabs[currentIndex - 1]);
                  }
                }}
                disabled={activeTab === "property"}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const tabs = [
                    "property",
                    "owner",
                    "mortgage",
                    "distress",
                    "advanced",
                  ];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1]);
                  }
                }}
                disabled={activeTab === "advanced"}
              >
                Next
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
              <Button onClick={handleSearch} disabled={isSearching}>
                <Search className="mr-2 h-4 w-4" />
                {isSearching ? "Searching..." : "Search Properties"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setSearchComplete(false)}>
              Back to Search
            </Button>
            <Button>Export Results</Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
