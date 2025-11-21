"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCurrentTeam } from "@/features/team/team.context";
import { PropertySearchWizard } from "@/components/property-search-wizard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Home, Loader2 } from "lucide-react";

interface PropertyResult {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  county?: string;
  propertyType?: string;
  ownerName?: string;
  marketValue?: number;
  isAbsenteeOwner?: boolean;
  isVacant?: boolean;
}

export default function RealEstateSearchPage() {
  const [team] = useCurrentTeam();
  const searchParams = useSearchParams();
  const [searchResults, setSearchResults] = useState<PropertyResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);

  // Auto-search if state param is present
  useEffect(() => {
    const stateParam = searchParams.get("state");
    if (stateParam && team) {
      handleQuickSearch(stateParam);
    }
  }, [searchParams, team]);

  const handleQuickSearch = async (state: string) => {
    if (!team) return;

    setIsSearching(true);
    setSearchComplete(false);

    try {
      const response = await fetch(`/api/rest/${team.id}/property/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          limit: 100,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch properties");

      const results = await response.json();
      setSearchResults(results);
      setSearchComplete(true);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleWizardComplete = async (searchParams: any) => {
    if (!team) return;

    setIsSearching(true);
    setSearchComplete(false);

    try {
      const requestBody: any = {
        limit: searchParams.limit || 100,
      };

      // Add location parameters based on search type
      if (searchParams.searchType === "state" && searchParams.state) {
        requestBody.state = searchParams.state;
      } else if (searchParams.searchType === "county") {
        requestBody.state = searchParams.state;
        requestBody.county = searchParams.county;
      } else if (searchParams.searchType === "neighborhood") {
        requestBody.state = searchParams.state;
        if (searchParams.city) requestBody.city = searchParams.city;
        requestBody.neighborhood = searchParams.neighborhood;
      } else if (searchParams.searchType === "zipCode") {
        requestBody.zipCode = searchParams.zipCode;
      }

      const response = await fetch(`/api/rest/${team.id}/property/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error("Failed to fetch properties");

      const results = await response.json();
      setSearchResults(results);
      setSearchComplete(true);

      // Save search if requested
      if (searchParams.saveSearch && searchParams.searchName) {
        // TODO: Implement save search functionality
        console.log("Saving search:", searchParams.searchName);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              Property Search
            </h2>
            <p className="text-muted-foreground mt-2">
              Find properties with advanced search filters
            </p>
          </div>
        </div>

        {/* Search Wizard */}
        <PropertySearchWizard onComplete={handleWizardComplete} />

        {/* Loading State */}
        {isSearching && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Searching properties...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Results */}
        {searchComplete && searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Search Results
              </CardTitle>
              <CardDescription>
                Found {searchResults.length} properties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Address</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Zip Code</TableHead>
                      <TableHead>County</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((property, index) => (
                      <TableRow key={property.id || index}>
                        <TableCell className="font-medium">
                          {property.address || "N/A"}
                        </TableCell>
                        <TableCell>{property.city || "N/A"}</TableCell>
                        <TableCell>{property.state || "N/A"}</TableCell>
                        <TableCell>{property.zipCode || "N/A"}</TableCell>
                        <TableCell>{property.county || "N/A"}</TableCell>
                        <TableCell>{property.ownerName || "N/A"}</TableCell>
                        <TableCell>
                          {property.marketValue
                            ? `$${property.marketValue.toLocaleString()}`
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {property.isAbsenteeOwner && (
                              <Badge variant="secondary">Absentee</Badge>
                            )}
                            {property.isVacant && (
                              <Badge variant="outline">Vacant</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Results */}
        {searchComplete && searchResults.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">No properties found</p>
              <p className="text-muted-foreground">
                Try adjusting your search criteria
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
