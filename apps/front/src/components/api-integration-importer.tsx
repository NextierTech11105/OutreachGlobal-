"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import {
  fetchPropertiesFromRealEstateApi,
  type RealEstateApiProperty,
} from "@/lib/services/real-estate-api";

export function ApiIntegrationImporter() {
  const [zipCode, setZipCode] = useState("");
  const [limit, setLimit] = useState("100");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<RealEstateApiProperty[]>(
    [],
  );
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [searchComplete, setSearchComplete] = useState(false);

  const handleSearch = async () => {
    if (!zipCode) return;

    setIsSearching(true);
    setSearchResults([]);
    setSelectedProperties([]);

    try {
      const results = await fetchPropertiesFromRealEstateApi(
        "sseder",
        zipCode,
        Number.parseInt(limit),
      );
      setSearchResults(results);
      setSearchComplete(true);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedProperties.length === searchResults.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(searchResults.map((property) => property.REI_ID));
    }
  };

  const togglePropertySelection = (id: string) => {
    if (selectedProperties.includes(id)) {
      setSelectedProperties(
        selectedProperties.filter((propId) => propId !== id),
      );
    } else {
      setSelectedProperties([...selectedProperties, id]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="zip-code">Zip Code</Label>
            <Input
              id="zip-code"
              placeholder="e.g., 10455"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="record-limit">Record Limit</Label>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger id="record-limit">
                <SelectValue placeholder="Select limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 records</SelectItem>
                <SelectItem value="100">100 records</SelectItem>
                <SelectItem value="250">250 records</SelectItem>
                <SelectItem value="500">500 records</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleSearch}
              disabled={isSearching || !zipCode}
              className="w-full"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Properties
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {searchComplete && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Search Results</h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={
                  selectedProperties.length === searchResults.length &&
                  searchResults.length > 0
                }
                onCheckedChange={toggleSelectAll}
              />
              <Label htmlFor="select-all">Select All</Label>
              <Badge>{selectedProperties.length} selected</Badge>
            </div>
          </div>

          <div className="border rounded-md">
            <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 font-medium text-sm">
              <div className="col-span-1"></div>
              <div className="col-span-2">ID</div>
              <div className="col-span-2">Block/Lot</div>
              <div className="col-span-2">Zoning</div>
              <div className="col-span-2">Neighborhood</div>
              <div className="col-span-3">Status</div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((property, index) => (
                  <div
                    key={property.REI_ID}
                    className={`grid grid-cols-12 gap-2 p-3 text-sm items-center ${
                      index % 2 === 0 ? "bg-background" : "bg-muted/20"
                    }`}
                  >
                    <div className="col-span-1">
                      <Checkbox
                        checked={selectedProperties.includes(property.REI_ID)}
                        onCheckedChange={() =>
                          togglePropertySelection(property.REI_ID)
                        }
                      />
                    </div>
                    <div className="col-span-2">{property.REI_ID}</div>
                    <div className="col-span-2">
                      {property.Block}/{property.Lot}
                    </div>
                    <div className="col-span-2">{property["Zoning Code"]}</div>
                    <div className="col-span-2">{property.Neighborhood}</div>
                    <div className="col-span-3">
                      <div className="flex flex-wrap gap-1">
                        {property.Vacant && (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                          >
                            Vacant
                          </Badge>
                        )}
                        {property["Absentee Owner"] && (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          >
                            Absentee
                          </Badge>
                        )}
                        {property["Lis Pendens Date"] && (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          >
                            Lis Pendens
                          </Badge>
                        )}
                        {property["Auction Schedule Date"] && (
                          <Badge
                            variant="outline"
                            className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                          >
                            Auction
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  {isSearching
                    ? "Searching..."
                    : "No properties found. Try a different zip code."}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {searchResults.length} properties found in zip code {zipCode}
            </div>
            <Button disabled={selectedProperties.length === 0}>
              Import {selectedProperties.length} Properties
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
