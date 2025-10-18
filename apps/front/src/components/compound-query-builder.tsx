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

export function CompoundQueryBuilder() {
  const [activeTab, setActiveTab] = useState("location");
  const [isSearching, setIsSearching] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);
  const [equityRange, setEquityRange] = useState([30, 80]);

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
        <CardTitle>Compound Query Builder</CardTitle>
        <CardDescription>
          Build complex property searches with multiple filters
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              <TabsTrigger value="zoning">Zoning</TabsTrigger>
            </TabsList>

            <TabsContent value="location" className="mt-6 space-y-4">
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
                <Label>Draw Polygon</Label>
                <div className="h-[300px] rounded-md border">
                  <MapComponent />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip-codes">Zip Codes (optional)</Label>
                <Input id="zip-codes" placeholder="e.g. 11101, 11102, 11103" />
                <p className="text-xs text-muted-foreground">
                  Enter comma-separated zip codes to further narrow your search
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
                </div>
              </div>
            </TabsContent>

            <TabsContent value="distress" className="mt-6 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="lis-pendens" />
                  <Label htmlFor="lis-pendens">Lis Pendens</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="pre-foreclosure" />
                  <Label htmlFor="pre-foreclosure">Pre-Foreclosure</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="auction" />
                  <Label htmlFor="auction">Auction</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="reo" />
                  <Label htmlFor="reo">REO / Bank-Owned</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="vacant" />
                  <Label htmlFor="vacant">Vacant Property</Label>
                </div>
              </div>

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
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maturity-date">Loan Maturity Date</Label>
                <Select>
                  <SelectTrigger id="maturity-date">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6months">Within 6 months</SelectItem>
                    <SelectItem value="12months">Within 12 months</SelectItem>
                    <SelectItem value="24months">Within 24 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="zoning" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Zoning Type</Label>
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
                    <Checkbox id="commercial" />
                    <Label htmlFor="commercial">Commercial</Label>
                  </div>
                </div>
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
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ids-only">IDs Only Search</Label>
                  <Switch id="ids-only" defaultChecked />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enable to fetch up to 10,000 property IDs matching your
                  criteria (recommended for large searches)
                </p>
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
                  const tabs = ["location", "equity", "distress", "zoning"];
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
                  const tabs = ["location", "equity", "distress", "zoning"];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1]);
                  }
                }}
                disabled={activeTab === "zoning"}
              >
                Next
              </Button>
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? "Searching..." : "Search Properties"}
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
