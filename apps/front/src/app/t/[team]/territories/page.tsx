"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { MapPin, Building2, Phone, Loader2 } from "lucide-react";
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
  states: string[];
  companyCount: number;
  smsReadyCount: number;
  avgScore: number;
}

interface TerritoryData {
  territories: Territory[];
  summary: {
    totalTerritories: number;
    totalCompanies: number;
    totalSmsReady: number;
    totalStates: number;
  };
}

export default function TerritoriesPage() {
  const params = useParams<{ team: string }>();
  const [data, setData] = useState<TerritoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTerritories() {
      try {
        const res = await fetch("/api/territories");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch territories:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTerritories();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const territories = data?.territories || [];
  const summary = data?.summary;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Territories</h1>
          <p className="text-muted-foreground">
            {summary?.totalCompanies.toLocaleString() || 0} companies across{" "}
            {summary?.totalStates || 0} states
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && summary.totalCompanies > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Regions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalTerritories}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalCompanies.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">SMS Ready</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary.totalSmsReady.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                States Covered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalStates}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {territories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No territories yet</h3>
            <p className="text-muted-foreground text-center mt-1 max-w-md">
              Territories are automatically created based on the states of your
              imported companies. Import companies to see territory breakdowns.
            </p>
          </CardContent>
        </Card>
      ) : (
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
                  {territory.avgScore > 0 && (
                    <Badge variant="outline">
                      Avg Score: {territory.avgScore}
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {territory.states.length} state
                  {territory.states.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mb-4">
                  {territory.states.map((state) => (
                    <Badge key={state} variant="secondary">
                      {state}
                    </Badge>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {territory.companyCount.toLocaleString()} companies
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-green-600" />
                    <span>
                      {territory.smsReadyCount.toLocaleString()} SMS ready
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
