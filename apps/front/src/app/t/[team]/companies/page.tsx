"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  MapPin,
  Users,
  Globe,
  Loader2,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Company {
  id: string;
  name: string;
  industry: string | null;
  location: string | null;
  employees: number | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  ownerName: string | null;
  ownerTitle: string | null;
  status: string | null;
  score: number | null;
  enrichmentStatus: string | null;
}

export default function CompaniesPage() {
  const params = useParams<{ team: string }>();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch(`/api/companies?search=${encodeURIComponent(search)}`);
        if (res.ok) {
          const data = await res.json();
          setCompanies(data.companies || []);
          setTotal(data.total || 0);
        }
      } catch (error) {
        console.error("Failed to fetch companies:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCompanies();
  }, [search]);

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "customer":
        return "bg-green-500";
      case "prospect":
        return "bg-blue-500";
      case "active":
        return "bg-yellow-500";
      case "new":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getEnrichmentBadge = (status: string | null) => {
    switch (status) {
      case "sms_ready":
        return <Badge className="bg-green-500 text-white">SMS Ready</Badge>;
      case "enriched":
        return <Badge className="bg-blue-500 text-white">Enriched</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "no_match":
        return <Badge variant="secondary">No Match</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            {total.toLocaleString()} companies in your database
          </p>
        </div>
        <Button onClick={() => window.location.href = `/${params.team}/import`}>
          <Plus className="mr-2 h-4 w-4" />
          Import Companies
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                className="pl-10 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No companies yet</h3>
              <p className="text-muted-foreground text-center mt-1">
                Import your first company list to get started
              </p>
              <Button className="mt-4" onClick={() => window.location.href = `/${params.team}/import`}>
                <Plus className="mr-2 h-4 w-4" />
                Import Companies
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Decision Maker</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow
                    key={company.id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{company.name}</div>
                          {company.industry && (
                            <div className="text-sm text-muted-foreground">
                              {company.industry}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {company.ownerName ? (
                        <div>
                          <div className="font-medium">{company.ownerName}</div>
                          {company.ownerTitle && (
                            <div className="text-sm text-muted-foreground">
                              {company.ownerTitle}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {company.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {company.phone}
                          </div>
                        )}
                        {company.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {company.email}
                          </div>
                        )}
                        {!company.phone && !company.email && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {company.location && company.location !== ", " ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {company.location}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {company.score !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${company.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{company.score}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getEnrichmentBadge(company.enrichmentStatus)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
