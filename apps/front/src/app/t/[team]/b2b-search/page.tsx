"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Search,
  MapPin,
  Users,
  DollarSign,
  Filter,
  Download,
  Loader2,
  Phone,
  Mail,
  UserCheck,
  Globe,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

// Business from /api/b2b/search
interface Business {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  sic_code: string;
  sic_description: string;
  industry: string;
  revenue: string;
  employees: string;
  is_decision_maker: boolean;
  website?: string;
}

interface SearchFilters {
  company: string;
  state: string;
  city: string;
  sicCode: string;
  title: string;
  decisionMakersOnly: boolean;
}

// US States for dropdown
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

export default function B2BSearchPage() {
  const { toast } = useToast();
  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [source, setSource] = useState<string>("");
  const [filters, setFilters] = useState<SearchFilters>({
    company: "",
    state: "",
    city: "",
    sicCode: "",
    title: "",
    decisionMakersOnly: true,
  });

  // Search businesses
  const searchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/b2b/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...filters,
          limit: 50,
          offset: 0,
          source: "postgresql",
        }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setResults(data.leads || []);
      setTotalCount(data.total || 0);
      setSource(data.source || "unknown");
      
      toast({
        title: "Search Complete",
        description: `Found ${data.total?.toLocaleString() || 0} businesses`,
      });
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search Failed",
        description: "Could not search businesses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  // Initial load - get sample data
  useEffect(() => {
    searchBusinesses();
  }, []);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">B2B Search</h1>
          <p className="text-muted-foreground">
            Search {totalCount > 0 ? `${totalCount.toLocaleString()}+` : ""} business prospects from USBizData
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-xs">
            Source: {source || "PostgreSQL"}
          </Badge>
          <Button variant="outline" disabled={results.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export Results
          </Button>
        </div>
      </div>

      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Filters</CardTitle>
          <CardDescription>
            Search 7.3M+ B2B contacts from USBizData
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label htmlFor="company" className="text-sm text-muted-foreground">Company Name</Label>
              <Input
                id="company"
                placeholder="Search by company name..."
                value={filters.company}
                onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">State</Label>
              <Select
                value={filters.state}
                onValueChange={(value) => setFilters({ ...filters, state: value === "all" ? "" : value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="city" className="text-sm text-muted-foreground">City</Label>
              <Input
                id="city"
                placeholder="City..."
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="sic" className="text-sm text-muted-foreground">SIC Code</Label>
              <Input
                id="sic"
                placeholder="e.g., 5812"
                value={filters.sicCode}
                onChange={(e) => setFilters({ ...filters, sicCode: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="title" className="text-sm text-muted-foreground">Job Title</Label>
              <Input
                id="title"
                placeholder="e.g., Owner, CEO"
                value={filters.title}
                onChange={(e) => setFilters({ ...filters, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex items-end md:col-span-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="decision-makers"
                  checked={filters.decisionMakersOnly}
                  onCheckedChange={(checked) =>
                    setFilters({ ...filters, decisionMakersOnly: checked === true })
                  }
                />
                <Label htmlFor="decision-makers" className="text-sm font-medium cursor-pointer">
                  Decision Makers Only (Owners, CEOs, Directors)
                </Label>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={searchBusinesses} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Search
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  company: "",
                  state: "",
                  city: "",
                  sicCode: "",
                  title: "",
                  decisionMakersOnly: true,
                });
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? "Searching..." : `${results.length} of ${totalCount.toLocaleString()} businesses`}
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : results.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No businesses found. Try adjusting your filters.</p>
            </CardContent>
          </Card>
        ) : (
          results.map((business) => (
            <Card key={business.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{business.company || "Unknown Company"}</h3>
                        {business.is_decision_maker && (
                          <Badge variant="default" className="text-xs">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Decision Maker
                          </Badge>
                        )}
                      </div>
                      {(business.first_name || business.last_name) && (
                        <p className="text-sm font-medium">
                          {[business.first_name, business.last_name].filter(Boolean).join(" ")}
                          {business.title && <span className="text-muted-foreground"> — {business.title}</span>}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {business.sic_description && (
                          <Badge variant="secondary">{business.sic_description}</Badge>
                        )}
                        {business.sic_code && !business.sic_description && (
                          <Badge variant="outline">SIC: {business.sic_code}</Badge>
                        )}
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 mr-1" />
                          {[business.city, business.state].filter(Boolean).join(", ") || "Unknown Location"}
                          {business.zip_code && ` ${business.zip_code}`}
                        </div>
                        {business.employees && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="h-3 w-3 mr-1" />
                            {business.employees} employees
                          </div>
                        )}
                        {business.revenue && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {business.revenue}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        {business.phone && (
                          <a href={`tel:${business.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                            <Phone className="h-3 w-3" />
                            {business.phone}
                          </a>
                        )}
                        {business.email && (
                          <a href={`mailto:${business.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                            <Mail className="h-3 w-3" />
                            {business.email}
                          </a>
                        )}
                        {business.website && (
                          <a href={business.website.startsWith("http") ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                            <Globe className="h-3 w-3" />
                            {business.website}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                    <Button size="sm">Add to Campaign</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
