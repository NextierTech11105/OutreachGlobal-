"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { $http } from "@/lib/http";
import { useCurrentTeam } from "@/features/team/team.context";
import { useRouter } from "next/navigation";
import { useApiError } from "@/hooks/use-api-error";
import { FacetFilterItem } from "./facet-filter-item";
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
import { DownloadIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/formatter";
import { AnimatePresence } from "motion/react";
import { LoadingOverlay } from "@/components/ui/loading/loading-overlay";
import { CreateImportLeadPreset } from "../mutations/import-lead-preset.mutations";
import { ImportLeadPresetModal } from "./import-lead-preset-modal";
import { LoadPresetModal } from "./load-preset-modal";
import { useMutation } from "@apollo/client";
import { IMPORT_LEAD_FROM_BUSINESS_LIST_MUTATION } from "../mutations/lead.mutations";

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
  title: { value: [] },
  company_name: { value: [] },
  company_domain: { value: [] },
  industry: { value: [] },
};

export function BusinessListImport() {
  const { team } = useCurrentTeam();
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [isImporting, setIsImporting] = useState(false);
  const [importBusinessList] = useMutation(
    IMPORT_LEAD_FROM_BUSINESS_LIST_MUTATION,
  );

  const [loading, setLoading] = useState(true);
  const [estimatedCount, setEstimatedCount] = useState(0);
  const [hits, setHits] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounceValue(query, 300);
  const [selectedPreset, setSelectedPreset] =
    useState<CreateImportLeadPreset | null>(null);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [loadPresetOpen, setLoadPresetOpen] = useState(false);
  const { showError } = useApiError();

  const searchParams = useMemo(() => {
    return {
      searchQuery: debouncedQuery,
      state: getFilterValue(filters.state),
      title: getFilterValue(filters.title),
      company_name: getFilterValue(filters.company_name),
      company_domain: getFilterValue(filters.company_domain),
      industry: getFilterValue(filters.industry),
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

  const handlePresetSaved = (preset: CreateImportLeadPreset) => {
    setPresetModalOpen(false);
    setSelectedPreset(preset);
  };

  const handleFilterChange = (name: string, value: string[]) => {
    setFilters((prev) => ({
      ...prev,
      [name]: { value },
    }));
  };

  const importContacts = async () => {
    setLoading(true);
    try {
      await importBusinessList({
        variables: {
          teamId: team.id,
          input: searchParams,
          presetId: selectedPreset?.id || undefined,
        },
      });
      toast.success("Success, your lead import is being processed");
      router.replace(`/t/${team.slug}/leads`);
    } catch (error) {
      showError(error, { gql: true });
      setLoading(false);
    }
  };

  useEffect(() => {
    const firstFetch = async () => {
      setLoading(true);
      try {
        const { data } = await $http.post(`/${team.id}/business-list`, {
          ...searchParams,
        });
        setEstimatedCount(data.estimatedTotalHits || 0);
        setHits(data.hits);
      } catch (error) {
        toast.error(
          "Failed to load business list, please check your api token or report this issue",
        );
      } finally {
        setLoading(false);
      }
    };

    firstFetch();
  }, [searchParams, team.id]);

  return (
    <>
      {!isImporting ? (
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
                  name="title"
                  label="Title"
                  checkedValues={filters.title.value}
                  onValueChange={handleFilterChange}
                  placeholder="Search title"
                />
                <FacetFilterItem
                  name="industry"
                  label="Industry"
                  checkedValues={filters.industry.value}
                  onValueChange={handleFilterChange}
                  placeholder="Search industry"
                />
                <FacetFilterItem
                  name="state"
                  label="State"
                  checkedValues={filters.state.value}
                  onValueChange={handleFilterChange}
                  placeholder="Search state"
                />
                <FacetFilterItem
                  name="company_name"
                  label="Company Name"
                  checkedValues={filters.company_name.value}
                  onValueChange={handleFilterChange}
                  placeholder="Search company name"
                />
                <FacetFilterItem
                  name="company_domain"
                  label="Company Domain"
                  checkedValues={filters.company_domain.value}
                  onValueChange={handleFilterChange}
                  placeholder="Search company domain"
                />
              </Accordion>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex mb-4">
              <div className="flex items-center gap-x-2">
                <Input
                  placeholder="Search"
                  onChange={(e) => setQuery(e.target.value)}
                />

                <Button
                  disabled={!estimatedCount}
                  onClick={() => setIsImporting(true)}
                >
                  <DownloadIcon size={18} />
                  <span className="hidden lg:inline ml-2">Import</span>
                </Button>
              </div>
            </div>
            <Card className="relative overflow-hidden">
              {loading && <LoadingOverlay />}
              <CardHeader className="border-b">
                <CardTitle>Contacts Preview</CardTitle>
              </CardHeader>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Industry</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {!loading && !hits?.length && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center">
                        No Contacts found
                      </TableCell>
                    </TableRow>
                  )}

                  {hits?.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>{contact.name}</TableCell>
                      <TableCell>{contact.title ?? "-"}</TableCell>
                      <TableCell>{contact.email}</TableCell>
                      <TableCell>{contact.phone ?? "-"}</TableCell>
                      <TableCell>{contact.address}</TableCell>
                      <TableCell>{contact.city ?? "-"}</TableCell>
                      <TableCell>{contact.state ?? "-"}</TableCell>
                      <TableCell>{contact.company_name ?? "-"}</TableCell>
                      <TableCell>
                        {!contact.revenue
                          ? "-"
                          : currencyFormat(contact.revenue / 100)}
                      </TableCell>
                      <TableCell>{contact.employees ?? "-"}</TableCell>
                      <TableCell>{contact.industry ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!loading && (
                <CardFooter className="border-t text-sm">
                  <p>Estimated Contacts: {formatNumber(estimatedCount)}</p>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {presetModalOpen && (
              <ImportLeadPresetModal
                open={presetModalOpen}
                onOpenChange={setPresetModalOpen}
                onSaved={handlePresetSaved}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {loadPresetOpen && (
              <LoadPresetModal
                open={loadPresetOpen}
                onOpenChange={setLoadPresetOpen}
                selectedPreset={selectedPreset}
                onPresetSelect={setSelectedPreset}
              />
            )}
          </AnimatePresence>

          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {formatNumber(estimatedCount)} contact(s) will be imported to
                your lead.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex justify-between items-center">
              <div className="flex flex-col">
                <CardTitle>Email Deduplication Settings</CardTitle>
                <CardDescription>
                  Configure how you want to filter and deduplicate your email
                  list
                </CardDescription>
              </div>

              <div className="flex items-center gap-x-2">
                <Button
                  onClick={() => setLoadPresetOpen(true)}
                  size="sm"
                  className="min-w-btn"
                >
                  Load
                </Button>
                <Button
                  onClick={() => setPresetModalOpen(true)}
                  variant="outline"
                  size="sm"
                >
                  <PlusIcon size={18} className="mr-2" />
                  Create
                </Button>
              </div>
            </CardHeader>

            {!selectedPreset ? (
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  No Preset Selected
                </p>
              </CardContent>
            ) : (
              <div className="border-t">
                <dl className="divide-y">
                  <CardContent className="sm:grid sm:grid-cols-3 sm:gap-4 text-sm">
                    <dt className="font-medium">Preset Name</dt>
                    <dd className="mt-1 text-muted-foreground sm:col-span-2 sm:mt-0">
                      {selectedPreset.name}
                    </dd>
                  </CardContent>
                  <CardContent className="sm:grid sm:grid-cols-3 sm:gap-4 text-sm">
                    <dt className="font-medium">Respect Titles</dt>
                    <dd className="mt-1 text-muted-foreground sm:col-span-2 sm:mt-0">
                      {selectedPreset.config?.respectTitles ? "Yes" : "No"}
                    </dd>
                  </CardContent>
                  <CardContent className="sm:grid sm:grid-cols-3 sm:gap-4 text-sm">
                    <dt className="font-medium">Selected Titles</dt>
                    <dd className="mt-1 text-muted-foreground sm:col-span-2 sm:mt-0">
                      {selectedPreset.config?.selectedTitles.join(", ") || "-"}
                    </dd>
                  </CardContent>
                  <CardContent className="sm:grid sm:grid-cols-3 sm:gap-4 text-sm">
                    <dt className="font-medium">Excluded Domains</dt>
                    <dd className="mt-1 text-muted-foreground sm:col-span-2 sm:mt-0">
                      {selectedPreset.config?.excludedDomains.join(", ") || "-"}
                    </dd>
                  </CardContent>
                </dl>
              </div>
            )}
          </Card>

          <div className="flex items-center gap-x-3">
            <Button
              className="flex-1"
              onClick={importContacts}
              loading={loading}
            >
              Import Contacts
            </Button>
            <Button variant="outline" onClick={() => setIsImporting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
