"use client";

import { useRouter } from "next/navigation";
import { useCurrentTeam } from "@/features/team/team.context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  Search,
  MapPin,
  TrendingUp,
  FileText,
} from "lucide-react";

export default function RealEstateHomePage() {
  const router = useRouter();
  const [team] = useCurrentTeam();

  const quickSearchStates = [
    { code: "NY", name: "New York", color: "bg-blue-500" },
    { code: "FL", name: "Florida", color: "bg-orange-500" },
    { code: "CA", name: "California", color: "bg-purple-500" },
    { code: "TX", name: "Texas", color: "bg-red-500" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              Real Estate Intelligence
            </h2>
            <p className="text-muted-foreground mt-2">
              Search properties, analyze markets, and find investment opportunities
            </p>
          </div>
        </div>

        {/* Quick Action Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Property Search Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push(`/t/${team?.id}/real-estate/search`)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Property Search</CardTitle>
              <CardDescription>
                Search properties by state, city, county, or zip code with advanced filters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                Start Search
                <Search className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Saved Searches Card */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Saved Searches</CardTitle>
              <CardDescription>
                Access your saved property searches and track results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Saved Searches
                <FileText className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Market Analytics Card */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Market Analytics</CardTitle>
              <CardDescription>
                Analyze property trends and market insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Analytics
                <TrendingUp className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick State Searches */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Quick State Searches
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickSearchStates.map((state) => (
              <Card
                key={state.code}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() =>
                  router.push(`/t/${team?.id}/real-estate/search?state=${state.code}`)
                }
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg ${state.color} flex items-center justify-center text-white font-bold text-xl`}>
                      {state.code}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{state.name}</CardTitle>
                      <CardDescription className="text-sm">
                        Search properties
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Search Types Info */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Available Search Types</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Geographic Search</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div>• State-wide searches</div>
                <div>• County targeting</div>
                <div>• City/Neighborhood drilling</div>
                <div>• Zip code precision</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Property Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div>• Absentee owners</div>
                <div>• Vacant properties</div>
                <div>• Pre-foreclosure listings</div>
                <div>• Lis Pendens filed</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
