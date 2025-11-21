"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Search,
  Filter,
  Save,
  ArrowRight,
  ArrowLeft,
  CheckCircle2
} from "lucide-react";
import { useCurrentTeam } from "@/features/team/team.context";

interface PropertySearchWizardProps {
  onComplete?: (searchParams: PropertySearchParams) => void;
}

interface PropertySearchParams {
  searchType: "state" | "county" | "neighborhood" | "zipCode" | "custom";
  state?: string;
  city?: string;
  county?: string;
  neighborhood?: string;
  zipCode?: string;
  limit?: number;
  filters?: {
    absenteeOwner?: boolean;
    vacant?: boolean;
    preForeclosure?: boolean;
    lisPendens?: boolean;
  };
  saveSearch?: boolean;
  searchName?: string;
}

export function PropertySearchWizard({ onComplete }: PropertySearchWizardProps) {
  const [team] = useCurrentTeam();
  const [step, setStep] = useState(1);
  const [searchParams, setSearchParams] = useState<PropertySearchParams>({
    searchType: "state",
    limit: 100,
    filters: {},
  });

  const totalSteps = 4;

  const updateParams = (updates: Partial<PropertySearchParams>) => {
    setSearchParams(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (onComplete) {
      onComplete(searchParams);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-primary" />
            <CardTitle>Property Search Wizard</CardTitle>
          </div>
          <Badge variant="outline">
            Step {step} of {totalSteps}
          </Badge>
        </div>
        <CardDescription>
          Find properties using advanced filters and save your searches
        </CardDescription>

        {/* Progress Bar */}
        <div className="w-full bg-secondary rounded-full h-2 mt-4">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Search Type */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Choose Search Type</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Card
                className={`cursor-pointer transition-all ${
                  searchParams.searchType === "state"
                    ? "border-primary ring-2 ring-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() => updateParams({ searchType: "state" })}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>State Search</span>
                  </CardTitle>
                  <CardDescription>Search entire states</CardDescription>
                </CardHeader>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  searchParams.searchType === "county"
                    ? "border-primary ring-2 ring-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() => updateParams({ searchType: "county" })}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>County Search</span>
                  </CardTitle>
                  <CardDescription>Target specific counties</CardDescription>
                </CardHeader>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  searchParams.searchType === "neighborhood"
                    ? "border-primary ring-2 ring-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() => updateParams({ searchType: "neighborhood" })}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>Neighborhood Search</span>
                  </CardTitle>
                  <CardDescription>Drill down to neighborhoods</CardDescription>
                </CardHeader>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  searchParams.searchType === "zipCode"
                    ? "border-primary ring-2 ring-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() => updateParams({ searchType: "zipCode" })}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>Zip Code Search</span>
                  </CardTitle>
                  <CardDescription>Search by zip code</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        {/* Step 2: Location Details */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Enter Location</h3>

            {searchParams.searchType === "state" && (
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  placeholder="e.g., NY"
                  value={searchParams.state || ""}
                  onChange={(e) => updateParams({ state: e.target.value.toUpperCase() })}
                />
              </div>
            )}

            {searchParams.searchType === "county" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    placeholder="e.g., NY"
                    value={searchParams.state || ""}
                    onChange={(e) => updateParams({ state: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="county">County *</Label>
                  <Input
                    id="county"
                    placeholder="e.g., Kings County"
                    value={searchParams.county || ""}
                    onChange={(e) => updateParams({ county: e.target.value })}
                  />
                </div>
              </>
            )}

            {searchParams.searchType === "neighborhood" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    placeholder="e.g., NY"
                    value={searchParams.state || ""}
                    onChange={(e) => updateParams({ state: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="e.g., Brooklyn"
                    value={searchParams.city || ""}
                    onChange={(e) => updateParams({ city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Neighborhood *</Label>
                  <Input
                    id="neighborhood"
                    placeholder="e.g., Williamsburg"
                    value={searchParams.neighborhood || ""}
                    onChange={(e) => updateParams({ neighborhood: e.target.value })}
                  />
                </div>
              </>
            )}

            {searchParams.searchType === "zipCode" && (
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip Code *</Label>
                <Input
                  id="zipCode"
                  placeholder="e.g., 10001"
                  value={searchParams.zipCode || ""}
                  onChange={(e) => updateParams({ zipCode: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="limit">Result Limit</Label>
              <Select
                value={searchParams.limit?.toString()}
                onValueChange={(value) => updateParams({ limit: Number.parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select limit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 properties</SelectItem>
                  <SelectItem value="100">100 properties</SelectItem>
                  <SelectItem value="250">250 properties</SelectItem>
                  <SelectItem value="500">500 properties</SelectItem>
                  <SelectItem value="1000">1,000 properties</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 3: Filters */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Apply Filters (Optional)</span>
            </h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="absentee"
                  checked={searchParams.filters?.absenteeOwner}
                  onCheckedChange={(checked) =>
                    updateParams({
                      filters: { ...searchParams.filters, absenteeOwner: checked as boolean },
                    })
                  }
                />
                <Label htmlFor="absentee" className="cursor-pointer">
                  Absentee Owners Only
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vacant"
                  checked={searchParams.filters?.vacant}
                  onCheckedChange={(checked) =>
                    updateParams({
                      filters: { ...searchParams.filters, vacant: checked as boolean },
                    })
                  }
                />
                <Label htmlFor="vacant" className="cursor-pointer">
                  Vacant Properties
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="preforeclosure"
                  checked={searchParams.filters?.preForeclosure}
                  onCheckedChange={(checked) =>
                    updateParams({
                      filters: { ...searchParams.filters, preForeclosure: checked as boolean },
                    })
                  }
                />
                <Label htmlFor="preforeclosure" className="cursor-pointer">
                  Pre-Foreclosure
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lispendens"
                  checked={searchParams.filters?.lisPendens}
                  onCheckedChange={(checked) =>
                    updateParams({
                      filters: { ...searchParams.filters, lisPendens: checked as boolean },
                    })
                  }
                />
                <Label htmlFor="lispendens" className="cursor-pointer">
                  Lis Pendens Filed
                </Label>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Save Search */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Save className="h-5 w-5" />
              <span>Save This Search?</span>
            </h3>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="save-search"
                checked={searchParams.saveSearch}
                onCheckedChange={(checked) => updateParams({ saveSearch: checked as boolean })}
              />
              <Label htmlFor="save-search" className="cursor-pointer">
                Save search for later use
              </Label>
            </div>

            {searchParams.saveSearch && (
              <div className="space-y-2">
                <Label htmlFor="search-name">Search Name</Label>
                <Input
                  id="search-name"
                  placeholder="e.g., NY Absentee Owners"
                  value={searchParams.searchName || ""}
                  onChange={(e) => updateParams({ searchName: e.target.value })}
                />
              </div>
            )}

            {/* Summary */}
            <Card className="bg-muted">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Search Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>Type:</strong> {searchParams.searchType}</div>
                {searchParams.state && <div><strong>State:</strong> {searchParams.state}</div>}
                {searchParams.county && <div><strong>County:</strong> {searchParams.county}</div>}
                {searchParams.city && <div><strong>City:</strong> {searchParams.city}</div>}
                {searchParams.neighborhood && <div><strong>Neighborhood:</strong> {searchParams.neighborhood}</div>}
                {searchParams.zipCode && <div><strong>Zip Code:</strong> {searchParams.zipCode}</div>}
                <div><strong>Limit:</strong> {searchParams.limit} properties</div>
                {Object.values(searchParams.filters || {}).some(v => v) && (
                  <div>
                    <strong>Filters:</strong>{" "}
                    {[
                      searchParams.filters?.absenteeOwner && "Absentee",
                      searchParams.filters?.vacant && "Vacant",
                      searchParams.filters?.preForeclosure && "Pre-Foreclosure",
                      searchParams.filters?.lisPendens && "Lis Pendens",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {step < totalSteps ? (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit}>
            <Search className="mr-2 h-4 w-4" />
            Run Search
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
