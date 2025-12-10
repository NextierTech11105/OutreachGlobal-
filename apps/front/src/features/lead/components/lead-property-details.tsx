import { Home, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { sf } from "@/lib/utils/safe-format";
import { Separator } from "@/components/ui/separator";
import { LeadDetailsQuery } from "@/graphql/types";

interface LeadPropertyDetailsProps {
  lead: LeadDetailsQuery["lead"];
}

export function LeadPropertyDetails({ lead }: LeadPropertyDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
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
                  <p className="font-medium">{lead.property?.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Value</p>
                  <p className="font-medium">
                    ${sf(lead.property?.assessedValue) || "N/A"}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Square Feet</p>
                  <p className="font-medium">
                    {sf(lead.property?.buildingSquareFeet) || "N/A"}
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Year Built</p>
                <p className="font-medium">
                  {lead.property?.yearBuilt || "N/A"}
                </p>
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
                <p className="font-medium">{lead.property?.address?.street}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">City</p>
                  <p className="font-medium">{lead.property?.address?.city}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">State</p>
                  <p className="font-medium">{lead.property?.address?.state}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Zip Code</p>
                  <p className="font-medium">{lead.property?.address?.zip}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
