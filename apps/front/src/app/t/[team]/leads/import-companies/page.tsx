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
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/formatter";
import { LoadingOverlay } from "@/components/ui/loading/loading-overlay";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { Checkbox } from "@/components/ui/checkbox";

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
}

export default function ImportCompaniesPage() {
  const { team } = useCurrentTeam();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [estimatedCount, setEstimatedCount] = useState(0);
  const [hits, setHits] = useState<Company[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounceValue(query, 500);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());

  const searchParams = useMemo(() => {
    return {
      name: debouncedQuery || undefined,
      state: getFilterValue(filters.state),
      industry: getFilterValue(filters.industry),
      city: getFilterValue(filters.city),
    };
  }, [debouncedQuery, filters]);

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

  const searchCompanies = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/business-list/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchParams),
      });
      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setEstimatedCount(data.estimatedTotalHits || 0);
      setHits(data.hits || []);
    } catch (error) {
      toast.error("Failed to search companies");
    } finally {
      setLoading(false);
    }
  };

  // Search when filters change
  useEffect(() => {
    if (debouncedQuery || totalFilters > 0) {
      searchCompanies();
    }
  }, [debouncedQuery, filters]);

  return (
    <TeamSection>
      <TeamHeader title="Company Search" />

      <div className="container">
        <div className="mb-4">
          <TeamTitle>Company Search</TeamTitle>
          <p className="text-muted-foreground">
            Search and build lists of companies using Apollo.io
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
              <Button onClick={searchCompanies} disabled={loading}>
                <SearchIcon size={18} className="mr-2" />
                Search
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
                        checked={hits.length > 0 && selectedCompanies.size === hits.length}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Founded</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {!loading && !hits?.length && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        {totalFilters > 0 || debouncedQuery
                          ? "No companies found"
                          : "Enter a search term or select filters to find companies"}
                      </TableCell>
                    </TableRow>
                  )}

                  {hits?.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCompanies.has(company.id)}
                          onCheckedChange={() => toggleCompany(company.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{company.name || "-"}</TableCell>
                      <TableCell>{company.industry || "-"}</TableCell>
                      <TableCell>{company.city || "-"}</TableCell>
                      <TableCell>{company.state || "-"}</TableCell>
                      <TableCell>
                        {company.employees ? formatNumber(company.employees) : "-"}
                      </TableCell>
                      <TableCell>
                        {company.revenue ? currencyFormat(company.revenue) : "-"}
                      </TableCell>
                      <TableCell>
                        {company.domain ? (
                          <a
                            href={company.website || `https://${company.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {company.domain}
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{company.founded_year || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {!loading && (
                <CardFooter className="border-t text-sm flex justify-between">
                  <p>Found: {formatNumber(estimatedCount)} companies</p>
                  {selectedCompanies.size > 0 && (
                    <p>{selectedCompanies.size} selected</p>
                  )}
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </div>
    </TeamSection>
  );
}
