"use client";

import { useState, useCallback } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  Home,
  DollarSign,
  AlertTriangle,
  User,
  Building,
  RotateCcw,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

// US States
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

// Valid RealEstateAPI PropertyType enums: SFR, MFR, LAND, CONDO, OTHER, MOBILE
const PROPERTY_TYPES = [
  { value: "SFR", label: "Single Family" },
  { value: "MFR", label: "Multi-Family" },
  { value: "CONDO", label: "Condo/Townhouse" },
  { value: "LAND", label: "Land" },
  { value: "MOBILE", label: "Mobile Home" },
  { value: "OTHER", label: "Other (Commercial, etc.)" },
];

const ZONING_TYPES = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "INDUSTRIAL", label: "Industrial" },
  { value: "AGRICULTURAL", label: "Agricultural" },
  { value: "MIXED", label: "Mixed Use" },
];

const OWNERSHIP_DURATION = [
  { value: "__any__", label: "Any" },
  { value: "1", label: "1+ years" },
  { value: "3", label: "3+ years" },
  { value: "5", label: "5+ years" },
  { value: "10", label: "10+ years" },
  { value: "15", label: "15+ years" },
];

export interface PropertyFilters {
  // Location
  state?: string;
  county?: string;
  city?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;

  // Property
  property_type?: string;
  zoning?: string;
  beds_min?: number;
  beds_max?: number;
  baths_min?: number;
  baths_max?: number;
  sqft_min?: number;
  sqft_max?: number;
  lot_size_min?: number;
  lot_size_max?: number;
  year_built_min?: number;
  year_built_max?: number;

  // Financial
  estimated_value_min?: number;
  estimated_value_max?: number;
  estimated_equity_min?: number;
  estimated_equity_max?: number;
  equity_percent_min?: number;
  mortgage_balance_min?: number;
  mortgage_balance_max?: number;

  // Distress Flags
  pre_foreclosure?: boolean;
  foreclosure?: boolean;
  auction?: boolean;
  tax_lien?: boolean;
  vacant?: boolean;
  inherited?: boolean;

  // Owner
  absentee_owner?: boolean;
  owner_occupied?: boolean;
  corporate_owned?: boolean;
  ownership_years_min?: number;
  owner_age_min?: number;
  owner_age_max?: number;

  // MLS
  mls_listed?: boolean;
  mls_active?: boolean;
  mls_pending?: boolean;
  mls_sold?: boolean;
  days_on_market_min?: number;
  days_on_market_max?: number;
}

interface PropertyFiltersProps {
  filters: PropertyFilters;
  onChange: (filters: PropertyFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  loading?: boolean;
  className?: string;
}

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  activeCount?: number;
}

function FilterSection({
  title,
  icon,
  defaultOpen = false,
  children,
  activeCount = 0,
}: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-2 hover:bg-muted/50 rounded-md transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
              {activeCount}
            </Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pb-4 space-y-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function PropertyFiltersPanel({
  filters,
  onChange,
  onSearch,
  onReset,
  loading = false,
  className,
}: PropertyFiltersProps) {
  const updateFilter = useCallback(
    <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) => {
      onChange({ ...filters, [key]: value });
    },
    [filters, onChange],
  );

  const countActiveFilters = (keys: (keyof PropertyFilters)[]) => {
    return keys.filter((key) => {
      const value = filters[key];
      return value !== undefined && value !== "" && value !== false;
    }).length;
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search Filters
        </h3>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Scrollable Filters */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Location Section */}
          <FilterSection
            title="Location"
            icon={<MapPin className="h-4 w-4 text-blue-500" />}
            defaultOpen={true}
            activeCount={countActiveFilters([
              "state",
              "county",
              "city",
              "zip",
              "radius",
            ])}
          >
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">State</Label>
                <Select
                  value={filters.state || "__all__"}
                  onValueChange={(v) =>
                    updateFilter("state", v === "__all__" ? undefined : v)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any State</SelectItem>
                    {US_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">County</Label>
                <Input
                  value={filters.county || ""}
                  onChange={(e) =>
                    updateFilter("county", e.target.value || undefined)
                  }
                  placeholder="Enter county"
                  className="h-9"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">City</Label>
                <Input
                  value={filters.city || ""}
                  onChange={(e) =>
                    updateFilter("city", e.target.value || undefined)
                  }
                  placeholder="Enter city"
                  className="h-9"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  ZIP Code
                </Label>
                <Input
                  value={filters.zip || ""}
                  onChange={(e) =>
                    updateFilter("zip", e.target.value || undefined)
                  }
                  placeholder="Enter ZIP"
                  maxLength={5}
                  className="h-9"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Radius: {filters.radius || 25} miles
                </Label>
                <Slider
                  value={[filters.radius || 25]}
                  onValueChange={([v]) => updateFilter("radius", v)}
                  min={1}
                  max={500}
                  step={5}
                  className="mt-2"
                />
              </div>
            </div>
          </FilterSection>

          {/* Property Section */}
          <FilterSection
            title="Property"
            icon={<Home className="h-4 w-4 text-green-500" />}
            activeCount={countActiveFilters([
              "property_type",
              "zoning",
              "beds_min",
              "beds_max",
              "baths_min",
              "baths_max",
              "sqft_min",
              "sqft_max",
              "lot_size_min",
              "lot_size_max",
              "year_built_min",
              "year_built_max",
            ])}
          >
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Property Type
                </Label>
                <Select
                  value={filters.property_type || "__all__"}
                  onValueChange={(v) =>
                    updateFilter(
                      "property_type",
                      v === "__all__" ? undefined : v,
                    )
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any Type</SelectItem>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Zoning</Label>
                <Select
                  value={filters.zoning || "__all__"}
                  onValueChange={(v) =>
                    updateFilter("zoning", v === "__all__" ? undefined : v)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Any zoning" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any Zoning</SelectItem>
                    {ZONING_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Beds Min
                  </Label>
                  <Input
                    type="number"
                    value={filters.beds_min || ""}
                    onChange={(e) =>
                      updateFilter(
                        "beds_min",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Beds Max
                  </Label>
                  <Input
                    type="number"
                    value={filters.beds_max || ""}
                    onChange={(e) =>
                      updateFilter(
                        "beds_max",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Baths Min
                  </Label>
                  <Input
                    type="number"
                    value={filters.baths_min || ""}
                    onChange={(e) =>
                      updateFilter(
                        "baths_min",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Baths Max
                  </Label>
                  <Input
                    type="number"
                    value={filters.baths_max || ""}
                    onChange={(e) =>
                      updateFilter(
                        "baths_max",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    SqFt Min
                  </Label>
                  <Input
                    type="number"
                    value={filters.sqft_min || ""}
                    onChange={(e) =>
                      updateFilter(
                        "sqft_min",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    SqFt Max
                  </Label>
                  <Input
                    type="number"
                    value={filters.sqft_max || ""}
                    onChange={(e) =>
                      updateFilter(
                        "sqft_max",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Lot Min (acres)
                  </Label>
                  <Input
                    type="number"
                    value={filters.lot_size_min || ""}
                    onChange={(e) =>
                      updateFilter(
                        "lot_size_min",
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                    step="0.1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Lot Max (acres)
                  </Label>
                  <Input
                    type="number"
                    value={filters.lot_size_max || ""}
                    onChange={(e) =>
                      updateFilter(
                        "lot_size_max",
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Year Built Min
                  </Label>
                  <Input
                    type="number"
                    value={filters.year_built_min || ""}
                    onChange={(e) =>
                      updateFilter(
                        "year_built_min",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Year Built Max
                  </Label>
                  <Input
                    type="number"
                    value={filters.year_built_max || ""}
                    onChange={(e) =>
                      updateFilter(
                        "year_built_max",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </FilterSection>

          {/* Financial Section */}
          <FilterSection
            title="Financial"
            icon={<DollarSign className="h-4 w-4 text-yellow-500" />}
            activeCount={countActiveFilters([
              "estimated_value_min",
              "estimated_value_max",
              "estimated_equity_min",
              "estimated_equity_max",
              "equity_percent_min",
              "mortgage_balance_min",
              "mortgage_balance_max",
            ])}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Value Min ($)
                  </Label>
                  <Input
                    type="number"
                    value={filters.estimated_value_min || ""}
                    onChange={(e) =>
                      updateFilter(
                        "estimated_value_min",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Value Max ($)
                  </Label>
                  <Input
                    type="number"
                    value={filters.estimated_value_max || ""}
                    onChange={(e) =>
                      updateFilter(
                        "estimated_value_max",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Equity Min ($)
                  </Label>
                  <Input
                    type="number"
                    value={filters.estimated_equity_min || ""}
                    onChange={(e) =>
                      updateFilter(
                        "estimated_equity_min",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Equity Max ($)
                  </Label>
                  <Input
                    type="number"
                    value={filters.estimated_equity_max || ""}
                    onChange={(e) =>
                      updateFilter(
                        "estimated_equity_max",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Min Equity %: {filters.equity_percent_min || 0}%
                </Label>
                <Slider
                  value={[filters.equity_percent_min || 0]}
                  onValueChange={([v]) =>
                    updateFilter("equity_percent_min", v || undefined)
                  }
                  min={0}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Mortgage Min ($)
                  </Label>
                  <Input
                    type="number"
                    value={filters.mortgage_balance_min || ""}
                    onChange={(e) =>
                      updateFilter(
                        "mortgage_balance_min",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Mortgage Max ($)
                  </Label>
                  <Input
                    type="number"
                    value={filters.mortgage_balance_max || ""}
                    onChange={(e) =>
                      updateFilter(
                        "mortgage_balance_max",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </FilterSection>

          {/* Distress Flags Section */}
          <FilterSection
            title="Distress Indicators"
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            activeCount={countActiveFilters([
              "pre_foreclosure",
              "foreclosure",
              "auction",
              "tax_lien",
              "vacant",
              "inherited",
            ])}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Pre-Foreclosure</Label>
                <Switch
                  checked={filters.pre_foreclosure || false}
                  onCheckedChange={(v) =>
                    updateFilter("pre_foreclosure", v || undefined)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Foreclosure</Label>
                <Switch
                  checked={filters.foreclosure || false}
                  onCheckedChange={(v) =>
                    updateFilter("foreclosure", v || undefined)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Auction</Label>
                <Switch
                  checked={filters.auction || false}
                  onCheckedChange={(v) =>
                    updateFilter("auction", v || undefined)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Tax Lien</Label>
                <Switch
                  checked={filters.tax_lien || false}
                  onCheckedChange={(v) =>
                    updateFilter("tax_lien", v || undefined)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Vacant</Label>
                <Switch
                  checked={filters.vacant || false}
                  onCheckedChange={(v) =>
                    updateFilter("vacant", v || undefined)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Inherited/Probate</Label>
                <Switch
                  checked={filters.inherited || false}
                  onCheckedChange={(v) =>
                    updateFilter("inherited", v || undefined)
                  }
                />
              </div>
            </div>
          </FilterSection>

          {/* Owner Section */}
          <FilterSection
            title="Owner Filters"
            icon={<User className="h-4 w-4 text-purple-500" />}
            activeCount={countActiveFilters([
              "absentee_owner",
              "owner_occupied",
              "corporate_owned",
              "ownership_years_min",
              "owner_age_min",
              "owner_age_max",
            ])}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Absentee Owner</Label>
                <Switch
                  checked={filters.absentee_owner || false}
                  onCheckedChange={(v) =>
                    updateFilter("absentee_owner", v || undefined)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Owner Occupied</Label>
                <Switch
                  checked={filters.owner_occupied || false}
                  onCheckedChange={(v) =>
                    updateFilter("owner_occupied", v || undefined)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Corporate Owned</Label>
                <Switch
                  checked={filters.corporate_owned || false}
                  onCheckedChange={(v) =>
                    updateFilter("corporate_owned", v || undefined)
                  }
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Ownership Duration
                </Label>
                <Select
                  value={
                    filters.ownership_years_min
                      ? String(filters.ownership_years_min)
                      : "__any__"
                  }
                  onValueChange={(v) =>
                    updateFilter(
                      "ownership_years_min",
                      v && v !== "__any__" ? parseInt(v) : undefined,
                    )
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Any duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {OWNERSHIP_DURATION.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Owner Age Min
                  </Label>
                  <Input
                    type="number"
                    value={filters.owner_age_min || ""}
                    onChange={(e) =>
                      updateFilter(
                        "owner_age_min",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Owner Age Max
                  </Label>
                  <Input
                    type="number"
                    value={filters.owner_age_max || ""}
                    onChange={(e) =>
                      updateFilter(
                        "owner_age_max",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </FilterSection>

          {/* MLS Section */}
          <FilterSection
            title="MLS Status"
            icon={<Building className="h-4 w-4 text-cyan-500" />}
            activeCount={countActiveFilters([
              "mls_listed",
              "mls_active",
              "mls_pending",
              "mls_sold",
              "days_on_market_min",
              "days_on_market_max",
            ])}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">MLS Listed</Label>
                <Switch
                  checked={filters.mls_listed || false}
                  onCheckedChange={(v) =>
                    updateFilter("mls_listed", v || undefined)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Active Listing</Label>
                <Switch
                  checked={filters.mls_active || false}
                  onCheckedChange={(v) =>
                    updateFilter("mls_active", v || undefined)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Pending Sale</Label>
                <Switch
                  checked={filters.mls_pending || false}
                  onCheckedChange={(v) =>
                    updateFilter("mls_pending", v || undefined)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Recently Sold</Label>
                <Switch
                  checked={filters.mls_sold || false}
                  onCheckedChange={(v) =>
                    updateFilter("mls_sold", v || undefined)
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    DOM Min
                  </Label>
                  <Input
                    type="number"
                    value={filters.days_on_market_min || ""}
                    onChange={(e) =>
                      updateFilter(
                        "days_on_market_min",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    DOM Max
                  </Label>
                  <Input
                    type="number"
                    value={filters.days_on_market_max || ""}
                    onChange={(e) =>
                      updateFilter(
                        "days_on_market_max",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Any"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </FilterSection>
        </div>
      </ScrollArea>

      {/* Search Button */}
      <div className="p-4 border-t">
        <Button className="w-full" onClick={onSearch} disabled={loading}>
          {loading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Search Properties
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
