"use client";

import { Building, Home, MapPin, Ruler } from "lucide-react";
import type { Lead } from "@/types/lead";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { sf, sfc } from "@/lib/utils/safe-format";

interface LeadPropertyDetailsProps {
  lead: Lead;
}

export function LeadPropertyDetails({ lead }: LeadPropertyDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Home className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Property Overview</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{lead.propertyType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Value</p>
                  <p className="font-medium">
                    ${sf(lead.propertyValue)}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bedrooms</p>
                  <p className="font-medium">{lead.bedrooms || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bathrooms</p>
                  <p className="font-medium">{lead.bathrooms || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Square Feet</p>
                  <p className="font-medium">
                    {sf(lead.squareFeet) || "N/A"}
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Year Built</p>
                <p className="font-medium">{lead.yearBuilt || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Location</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{lead.address}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">City</p>
                  <p className="font-medium">{lead.city}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">State</p>
                  <p className="font-medium">{lead.state}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Zip Code</p>
                  <p className="font-medium">{lead.zipCode}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Image Placeholder */}
      <div className="bg-muted rounded-lg h-[300px] flex items-center justify-center">
        <div className="text-center">
          <Building className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">
            Property image not available
          </p>
        </div>
      </div>

      {/* Property Comparables Placeholder */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Ruler className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Comparable Properties</h3>
          </div>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No comparable properties available
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
