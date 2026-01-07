"use client";

import { useState } from "react";
import {
  Building2,
  Search,
  MapPin,
  Users,
  DollarSign,
  Filter,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Business {
  id: string;
  name: string;
  industry: string;
  location: string;
  employees: string;
  revenue: string;
  phone?: string;
  email?: string;
}

export default function B2BSearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Business[]>([
    {
      id: "1",
      name: "Acme Manufacturing Co",
      industry: "Manufacturing",
      location: "Chicago, IL",
      employees: "50-100",
      revenue: "$5M-$10M",
      phone: "+1 555-123-4567",
      email: "info@acmemfg.com",
    },
    {
      id: "2",
      name: "TechStart Solutions",
      industry: "Technology",
      location: "Austin, TX",
      employees: "10-50",
      revenue: "$1M-$5M",
    },
    {
      id: "3",
      name: "Green Valley Landscaping",
      industry: "Services",
      location: "Phoenix, AZ",
      employees: "10-50",
      revenue: "$500K-$1M",
      phone: "+1 555-987-6543",
    },
  ]);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">B2B Search</h1>
          <p className="text-muted-foreground">
            Find and prospect business contacts
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Results
        </Button>
      </div>

      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search by company name, industry, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="healthcare">Healthcare</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Company Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sizes</SelectItem>
                <SelectItem value="1-10">1-10 employees</SelectItem>
                <SelectItem value="10-50">10-50 employees</SelectItem>
                <SelectItem value="50-100">50-100 employees</SelectItem>
                <SelectItem value="100+">100+ employees</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 mt-4">
            <Button>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {results.length} businesses found
          </p>
        </div>

        {results.map((business) => (
          <Card key={business.id} className="hover:shadow-md transition-shadow">
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{business.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary">{business.industry}</Badge>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-1" />
                        {business.location}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="h-3 w-3 mr-1" />
                        {business.employees}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {business.revenue}
                      </div>
                    </div>
                    {(business.phone || business.email) && (
                      <div className="flex gap-4 mt-2 text-sm">
                        {business.phone && <span>{business.phone}</span>}
                        {business.email && <span>{business.email}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                  <Button size="sm">Add to List</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
