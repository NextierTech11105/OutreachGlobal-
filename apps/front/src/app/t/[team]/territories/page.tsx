"use client";

import { useState } from "react";
import { MapPin, Plus, Users, Building2, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Territory {
  id: string;
  name: string;
  regions: string[];
  assignedTo: string;
  leadCount: number;
  companyCount: number;
}

export default function TerritoriesPage() {
  const [territories] = useState<Territory[]>([
    {
      id: "1",
      name: "West Coast",
      regions: ["California", "Oregon", "Washington"],
      assignedTo: "John Smith",
      leadCount: 1234,
      companyCount: 456,
    },
    {
      id: "2",
      name: "Southwest",
      regions: ["Texas", "Arizona", "New Mexico"],
      assignedTo: "Jane Doe",
      leadCount: 987,
      companyCount: 321,
    },
    {
      id: "3",
      name: "Northeast",
      regions: ["New York", "New Jersey", "Pennsylvania"],
      assignedTo: "Mike Johnson",
      leadCount: 1567,
      companyCount: 543,
    },
  ]);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Territories</h1>
          <p className="text-muted-foreground">
            Manage geographic sales territories and assignments
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Territory
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {territories.map((territory) => (
          <Card
            key={territory.id}
            className="hover:shadow-md transition-shadow"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <CardTitle>{territory.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                Assigned to {territory.assignedTo}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1 mb-4">
                {territory.regions.map((region) => (
                  <Badge key={region} variant="secondary">
                    {region}
                  </Badge>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{territory.leadCount.toLocaleString()} leads</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {territory.companyCount.toLocaleString()} companies
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
