"use client";

import { LeadDetailsQuery } from "@/graphql/types";

interface Props {
  lead: LeadDetailsQuery["lead"];
}

export function LeadPropertyDetails({ lead }: Props) {
  const property = lead.property;

  if (!property) {
    return (
      <p className="text-center text-muted-foreground">
        No property details available
      </p>
    );
  }

  const details = [
    { label: "Address", value: property.address?.street },
    { label: "City", value: property.address?.city },
    { label: "State", value: property.address?.state },
    { label: "Zip Code", value: property.address?.zipCode },
    { label: "Property Type", value: property.type },
    { label: "Year Built", value: property.yearBuilt },
    { label: "Square Feet", value: property.buildingSquareFeet },
    { label: "Lot Size", value: property.lotSquareFeet },
    {
      label: "Assessed Value",
      value: property.assessedValue
        ? `$${property.assessedValue.toLocaleString()}`
        : null,
    },
    {
      label: "Estimated Value",
      value: property.estimatedValue
        ? `$${property.estimatedValue.toLocaleString()}`
        : null,
    },
    { label: "Owner Occupied", value: property.ownerOccupied ? "Yes" : "No" },
  ].filter((d) => d.value);

  return (
    <div className="grid grid-cols-2 gap-4">
      {details.map((detail) => (
        <div key={detail.label}>
          <dt className="text-sm font-medium text-muted-foreground">
            {detail.label}
          </dt>
          <dd className="text-sm mt-1">{detail.value}</dd>
        </div>
      ))}
    </div>
  );
}
