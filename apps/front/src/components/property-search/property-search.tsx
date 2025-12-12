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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Search,
  MapPin,
  Home,
  DollarSign,
  User,
  Phone,
  Loader2,
} from "lucide-react";
import { sf, sfc } from "@/lib/utils/safe-format";

const PROPERTY_TYPES = [
  { value: "SFR", label: "Single Family" },
  { value: "MFR", label: "Multi-Family" },
  { value: "CONDO", label: "Condo" },
  { value: "TOWNHOUSE", label: "Townhouse" },
  { value: "LAND", label: "Land" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "MOBILE", label: "Mobile Home" },
];

interface PropertyResult {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  yearBuilt?: number;
  estimatedValue?: number;
  equity?: number;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
}

export function PropertySearch() {
  const [searchType, setSearchType] = useState<"radius" | "address" | "zip">(
    "radius",
  );
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PropertyResult[]>([]);

  // Radius search params
  const [latitude, setLatitude] = useState("30.2672");
  const [longitude, setLongitude] = useState("-97.7431");
  const [radius, setRadius] = useState([10]);
  const [propertyType, setPropertyType] = useState("SFR");

  // Address search params
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // ZIP search params
  const [zipCode, setZipCode] = useState("");

  // Filters
  const [minBeds, setMinBeds] = useState("");
  const [minBaths, setMinBaths] = useState("");
  const [minEquity, setMinEquity] = useState("");
  const [absenteeOnly, setAbsenteeOnly] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Build query params based on search type
      const endpoint = "/api/property-search";
      const params = new URLSearchParams();

      if (searchType === "radius") {
        params.set("latitude", latitude);
        params.set("longitude", longitude);
        params.set("radius", radius[0].toString());
        params.set("propertyType", propertyType);
      } else if (searchType === "address") {
        params.set("address", address);
        params.set("city", city);
        params.set("state", state);
      } else if (searchType === "zip") {
        params.set("zip", zipCode);
        params.set("propertyType", propertyType);
      }

      // Add filters
      if (minBeds) params.set("minBeds", minBeds);
      if (minBaths) params.set("minBaths", minBaths);
      if (minEquity) params.set("minEquity", minEquity);
      if (absenteeOnly) params.set("absenteeOwner", "true");

      params.set("limit", "50");

      const response = await fetch(`${endpoint}?${params.toString()}`);
      const data = await response.json();

      setResults(data.properties || []);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Property Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={searchType}
            onValueChange={(v) => setSearchType(v as typeof searchType)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="radius">
                <MapPin className="h-4 w-4 mr-2" />
                Radius
              </TabsTrigger>
              <TabsTrigger value="address">
                <Home className="h-4 w-4 mr-2" />
                Address
              </TabsTrigger>
              <TabsTrigger value="zip">
                <MapPin className="h-4 w-4 mr-2" />
                ZIP Code
              </TabsTrigger>
            </TabsList>

            {/* Radius Search */}
            <TabsContent value="radius" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="30.2672"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="-97.7431"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Radius: {radius[0]} miles</Label>
                <Slider
                  value={radius}
                  onValueChange={setRadius}
                  min={1}
                  max={500}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Address Search */}
            <TabsContent value="address" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Austin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="TX"
                    maxLength={2}
                  />
                </div>
              </div>
            </TabsContent>

            {/* ZIP Search */}
            <TabsContent value="zip" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>ZIP Code</Label>
                <Input
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="78701"
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          {/* Filters */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-4">Filters</h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Min Beds</Label>
                <Input
                  type="number"
                  value={minBeds}
                  onChange={(e) => setMinBeds(e.target.value)}
                  placeholder="Any"
                />
              </div>
              <div className="space-y-2">
                <Label>Min Baths</Label>
                <Input
                  type="number"
                  value={minBaths}
                  onChange={(e) => setMinBaths(e.target.value)}
                  placeholder="Any"
                />
              </div>
              <div className="space-y-2">
                <Label>Min Equity ($)</Label>
                <Input
                  type="number"
                  value={minEquity}
                  onChange={(e) => setMinEquity(e.target.value)}
                  placeholder="Any"
                />
              </div>
              <div className="space-y-2">
                <Label>Owner Status</Label>
                <Select
                  value={absenteeOnly ? "absentee" : "all"}
                  onValueChange={(v) => setAbsenteeOnly(v === "absentee")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Owners</SelectItem>
                    <SelectItem value="absentee">Absentee Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button
            className="w-full mt-6"
            size="lg"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search Properties
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results ({results.length} properties)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((property) => (
                <PropertyResultCard key={property.id} property={property} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PropertyResultCard({ property }: { property: PropertyResult }) {
  return (
    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold">{property.address}</h4>
          <p className="text-sm text-muted-foreground">
            {property.city}, {property.state} {property.zip}
          </p>
        </div>
        <Badge variant="secondary">{property.propertyType}</Badge>
      </div>

      <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
        {property.bedrooms && (
          <div className="flex items-center gap-1">
            <Home className="h-4 w-4 text-muted-foreground" />
            {property.bedrooms} bed / {property.bathrooms} bath
          </div>
        )}
        {property.sqft && <div>{sf(property.sqft)} sqft</div>}
        {property.estimatedValue && (
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />$
            {sf(property.estimatedValue)}
          </div>
        )}
        {property.equity && (
          <div className="text-green-600 font-medium">
            ${sf(property.equity)} equity
          </div>
        )}
      </div>

      {property.ownerName && (
        <div className="mt-4 pt-4 border-t flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            {property.ownerName}
          </div>
          {property.ownerPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {property.ownerPhone}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
