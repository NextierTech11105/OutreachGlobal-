"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SearchResults() {
  // Mock data for demonstration
  const results = [
    {
      id: "NY-QNS-12345",
      address: "123 Main Street, Queens, NY 11101",
      type: "Single Family",
      equity: 85,
      distress: "Lis Pendens",
      zoning: "R6",
    },
    {
      id: "NY-QNS-23456",
      address: "456 Oak Avenue, Queens, NY 11102",
      type: "Multi-Family",
      equity: 72,
      distress: null,
      zoning: "R7",
    },
    {
      id: "NY-QNS-34567",
      address: "789 Pine Boulevard, Queens, NY 11103",
      type: "Condo",
      equity: 65,
      distress: "Pre-Foreclosure",
      zoning: "R8",
    },
    {
      id: "NY-QNS-45678",
      address: "321 Elm Street, Queens, NY 11104",
      type: "Single Family",
      equity: 25,
      distress: null,
      zoning: "R6",
    },
    {
      id: "NY-QNS-56789",
      address: "654 Maple Drive, Queens, NY 11105",
      type: "Vacant Land",
      equity: 90,
      distress: null,
      zoning: "R7",
    },
    {
      id: "NY-QNS-67890",
      address: "987 Cedar Lane, Queens, NY 11106",
      type: "Multi-Family",
      equity: 15,
      distress: "REO",
      zoning: "R8",
    },
    {
      id: "NY-QNS-78901",
      address: "246 Birch Road, Queens, NY 11107",
      type: "Single Family",
      equity: 78,
      distress: null,
      zoning: "R6",
    },
    {
      id: "NY-QNS-89012",
      address: "135 Spruce Court, Queens, NY 11108",
      type: "Multi-Family",
      equity: 82,
      distress: "Vacant",
      zoning: "R7",
    },
    {
      id: "NY-QNS-90123",
      address: "864 Willow Way, Queens, NY 11109",
      type: "Condo",
      equity: 45,
      distress: null,
      zoning: "R8",
    },
    {
      id: "NY-QNS-01234",
      address: "753 Aspen Avenue, Queens, NY 11110",
      type: "Single Family",
      equity: 68,
      distress: "Lis Pendens",
      zoning: "R6",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Search Results</h3>
          <p className="text-sm text-muted-foreground">
            10,000 property IDs found, showing first 10 results
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="enrich-count" className="text-sm">
              Enrich Top:
            </Label>
            <Select defaultValue="1000">
              <SelectTrigger id="enrich-count" className="w-24">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="250">250</SelectItem>
                <SelectItem value="500">500</SelectItem>
                <SelectItem value="1000">1,000</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button>Enrich Selected</Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Input className="max-w-sm" placeholder="Filter results..." />
        <Button variant="outline">Filter</Button>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox />
              </TableHead>
              <TableHead>Property ID</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Equity</TableHead>
              <TableHead>Distress</TableHead>
              <TableHead>Zoning</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.id}>
                <TableCell>
                  <Checkbox />
                </TableCell>
                <TableCell className="font-medium">{result.id}</TableCell>
                <TableCell>{result.address}</TableCell>
                <TableCell>{result.type}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      result.equity >= 80
                        ? "default"
                        : result.equity <= 30
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {result.equity}%
                  </Badge>
                </TableCell>
                <TableCell>
                  {result.distress ? (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    >
                      {result.distress}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>{result.zoning}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing 1-10 of 10,000 results
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
