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
import { SearchIcon, ChevronLeft, ChevronRight, Sparkles, Phone, Mail, Building, MapPin, ExternalLink, Loader2 } from "lucide-react";
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
  // Enrichment data
  enriched?: boolean;
  enrichedPhones?: string[];
  enrichedEmails?: string[];
  ownerName?: string;
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
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Enrichment state
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<EnrichmentProgress | null>(null);
  const [showEnrichDialog, setShowEnrichDialog] = useState(false);
  const [enrichResults, setEnrichResults] = useState<{
    successful: number;
    withPhones: number;
    withEmails: number;
  } | null>(null);

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
      setHits(data.hits || []);
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

  // Enrich selected companies - skip trace and property data
  const enrichSelectedCompanies = async () => {
    if (selectedCompanies.size === 0) {
      toast.error("Select companies to enrich");
      return;
    }

    const companiesToEnrich = hits.filter((c) => selectedCompanies.has(c.id));
    setEnriching(true);
    setShowEnrichDialog(true);
    setEnrichProgress({ total: companiesToEnrich.length, processed: 0, successful: 0, failed: 0 });
    setEnrichResults(null);

    let successful = 0;
    let withPhones = 0;
    let withEmails = 0;

    // Process in batches of 5
    for (let i = 0; i < companiesToEnrich.length; i += 5) {
      const batch = companiesToEnrich.slice(i, i + 5);

      const batchPromises = batch.map(async (company) => {
        try {
          // Build skip trace request from company data
          const skipTraceBody = {
            // Use company name as last name if no better data
            lastName: company.name,
            address: company.city ? `${company.city}, ${company.state}` : undefined,
            city: company.city,
            state: company.state,
          };

          const response = await fetch("/api/skip-trace", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(skipTraceBody),
          });

          const data = await response.json();

          if (data.success) {
            return {
              companyId: company.id,
              success: true,
              phones: data.phones?.map((p: { number: string }) => p.number) || [],
              emails: data.emails?.map((e: { email: string }) => e.email) || [],
              ownerName: data.ownerName,
            };
          }

          return { companyId: company.id, success: false, phones: [], emails: [] };
        } catch (error) {
          console.error(`Enrich error for ${company.name}:`, error);
          return { companyId: company.id, success: false, phones: [], emails: [] };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Update hits with enrichment data
      setHits((prev) =>
        prev.map((company) => {
          const result = batchResults.find((r) => r.companyId === company.id);
          if (result) {
            return {
              ...company,
              enriched: result.success,
              enrichedPhones: result.phones,
              enrichedEmails: result.emails,
              ownerName: result.ownerName,
            };
          }
          return company;
        })
      );

      // Update progress
      const batchSuccessful = batchResults.filter((r) => r.success).length;
      const batchWithPhones = batchResults.filter((r) => r.phones.length > 0).length;
      const batchWithEmails = batchResults.filter((r) => r.emails.length > 0).length;

      successful += batchSuccessful;
      withPhones += batchWithPhones;
      withEmails += batchWithEmails;

      setEnrichProgress((prev) =>
        prev
          ? {
              ...prev,
              processed: prev.processed + batch.length,
              successful: prev.successful + batchSuccessful,
              failed: prev.failed + (batch.length - batchSuccessful),
            }
          : null
      );

      // Small delay between batches
      if (i + 5 < companiesToEnrich.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setEnriching(false);
    setEnrichResults({ successful, withPhones, withEmails });
    toast.success(`Enriched ${successful} companies - ${withPhones} with phones, ${withEmails} with emails`);
  };

  // Search when filters change (reset to page 1)
  useEffect(() => {
    if (debouncedQuery || totalFilters > 0) {
      setCurrentPage(1);
      searchCompanies(1);
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
                    <TableHead>Location</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Phones</TableHead>
                    <TableHead>Emails</TableHead>
                    <TableHead>Website</TableHead>
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
                    <TableRow key={company.id} className={company.enriched ? "bg-green-50 dark:bg-green-900/10" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCompanies.has(company.id)}
                          onCheckedChange={() => toggleCompany(company.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {company.name || "-"}
                          {company.enriched && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              Enriched
                            </Badge>
                          )}
                        </div>
                        {company.ownerName && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Owner: {company.ownerName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{company.industry || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{company.city && company.state ? `${company.city}, ${company.state}` : company.state || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {company.employees ? formatNumber(company.employees) : "-"}
                      </TableCell>
                      <TableCell>
                        {company.revenue ? currencyFormat(company.revenue) : "-"}
                      </TableCell>
                      <TableCell>
                        {company.enrichedPhones && company.enrichedPhones.length > 0 ? (
                          <div className="space-y-1">
                            {company.enrichedPhones.slice(0, 2).map((phone, i) => (
                              <div key={i} className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-green-600" />
                                <a href={`tel:${phone}`} className="text-blue-600 hover:underline">
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
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {company.enrichedEmails && company.enrichedEmails.length > 0 ? (
                          <div className="space-y-1">
                            {company.enrichedEmails.slice(0, 2).map((email, i) => (
                              <div key={i} className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-green-600" />
                                <a href={`mailto:${email}`} className="text-blue-600 hover:underline truncate max-w-[150px]">
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
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {company.domain ? (
                          <a
                            href={company.website || `https://${company.domain}`}
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
                    <span>{enrichProgress.processed} / {enrichProgress.total}</span>
                  </div>
                  <Progress
                    value={(enrichProgress.processed / enrichProgress.total) * 100}
                    className="h-2"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{enrichProgress.successful}</div>
                    <div className="text-xs text-muted-foreground">Successful</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{enrichProgress.failed}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{enrichProgress.total - enrichProgress.processed}</div>
                    <div className="text-xs text-muted-foreground">Remaining</div>
                  </div>
                </div>
              </>
            )}

            {enrichResults && !enriching && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-medium">Enrichment Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <Phone className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{enrichResults.withPhones} with phones</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">{enrichResults.withEmails} with emails</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enriched data is now shown in the table. You can export the results or continue searching.
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
    </TeamSection>
  );
}
