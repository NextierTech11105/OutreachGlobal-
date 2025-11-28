"use client";

import { useCurrentTeam } from "@/features/team/team.context";
import { createDefaultCursor } from "@/graphql/graphql-utils";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { useState } from "react";
import { PROPERTIES_QUERY } from "../queries/property.queries";
import { Card } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading/loading-overlay";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { numberFormat } from "@nextier/common";
import { CursorPagination } from "@/components/pagination/cursor-pagination";

const LIMIT = 10;
const defaultCursor = createDefaultCursor({
  first: LIMIT,
});

export const PropertyList = () => {
  const { team } = useCurrentTeam();
  const [cursor, setCursor] = useState(defaultCursor);
  const [properties, pageInfo, { loading }] = useConnectionQuery(
    PROPERTIES_QUERY,
    {
      pick: "properties",
      variables: {
        ...cursor,
        teamId: team.id,
      },
    },
  );

  return (
    <Card className="relative overflow-hidden">
      {loading && <LoadingOverlay />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Address</TableHead>
            <TableHead>Use Code</TableHead>
            <TableHead>Lot Square Feet</TableHead>
            <TableHead>Building Square Feet</TableHead>
            <TableHead>Auction Date</TableHead>
            <TableHead>Owner Name</TableHead>
            <TableHead>Owner Status</TableHead>
            <TableHead>Assessed Value</TableHead>
            <TableHead>Estimated Value</TableHead>
            <TableHead>Year Built</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {properties?.map((property) => (
            <TableRow key={property.id}>
              <TableCell className="whitespace-normal">
                {property.address.address}
              </TableCell>
              <TableCell>{property.useCode}</TableCell>
              <TableCell>{property.lotSquareFeet}</TableCell>
              <TableCell>{property.buildingSquareFeet}</TableCell>
              <TableCell>{property.auctionDate}</TableCell>
              <TableCell className="whitespace-normal">
                {property.ownerName}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {property.ownerOccupied
                  ? "Owner Occupied"
                  : "Not Owner Occupied"}
              </TableCell>
              <TableCell>
                ${numberFormat(property.assessedValue || 0)}
              </TableCell>
              <TableCell>
                ${numberFormat(property.estimatedValue || 0)}
              </TableCell>
              <TableCell>{property.yearBuilt}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!!pageInfo && (
        <CursorPagination
          variant="table-footer"
          data={pageInfo}
          onPageChange={setCursor}
          limit={LIMIT}
        />
      )}
    </Card>
  );
};
