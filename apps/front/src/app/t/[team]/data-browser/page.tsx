"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, Search, Filter, Database, Users, MessageSquare, Building, Loader2 } from "lucide-react";
import { useCurrentTeam } from "@/features/team/team.context";
import { useQuery, gql } from "@apollo/client";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";

// GraphQL query for leads data
const LEADS_DATA_QUERY = gql`
  query LeadsData($teamId: ID!, $limit: Int, $offset: Int, $search: String) {
    leads(teamId: $teamId, limit: $limit, offset: $offset, search: $search) {
      id
      firstName
      lastName
      email
      phone
      company
      status
      score
      sector
      createdAt
    }
    leadsCount(teamId: $teamId, search: $search)
  }
`;

type DataType = 'leads' | 'campaigns' | 'messages' | 'properties';

export default function DataBrowserPage() {
  const { team, teamId, isTeamReady } = useCurrentTeam();
  const [activeTab, setActiveTab] = useState<DataType>('leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const { data, loading, refetch } = useQuery(LEADS_DATA_QUERY, {
    variables: {
      teamId,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: searchQuery || undefined,
    },
    skip: !isTeamReady || activeTab !== 'leads',
  });

  const leads = data?.leads || [];
  const totalCount = data?.leadsCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    // Export logic - trigger download
    const exportData = leads.map((lead: any) => ({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      status: lead.status,
      score: lead.score,
      sector: lead.sector,
    }));

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } else {
      const headers = Object.keys(exportData[0] || {}).join(',');
      const rows = exportData.map((row: any) => Object.values(row).join(',')).join('\n');
      const csv = `${headers}\n${rows}`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  };

  return (
    <TeamSection>
      <TeamHeader
        title="Data Browser"
        links={[{ title: "Dashboard", href: "/" }]}
      />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Data Lake</h1>
            <p className="text-muted-foreground mt-1">Explore and manage your raw data</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export JSON</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DataType)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Leads</span>
              <Badge variant="secondary">{totalCount.toLocaleString()}</Badge>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Campaigns</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>Messages</span>
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span>Properties</span>
            </TabsTrigger>
          </TabsList>

          {/* Search Bar */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={`Search ${activeTab}...`}
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <span>Showing {leads.length} of {totalCount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leads Tab */}
          <TabsContent value="leads" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Leads Data Lake</CardTitle>
                <CardDescription>Raw imported data - {totalCount.toLocaleString()} records</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : leads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No leads found. Import data to get started.
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Sector</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leads.map((lead: any) => (
                            <TableRow key={lead.id}>
                              <TableCell className="font-medium">
                                {lead.firstName} {lead.lastName}
                              </TableCell>
                              <TableCell>{lead.email || '-'}</TableCell>
                              <TableCell>{lead.phone || '-'}</TableCell>
                              <TableCell>{lead.company || '-'}</TableCell>
                              <TableCell>
                                {lead.sector && (
                                  <Badge variant="outline">{lead.sector}</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={lead.score >= 70 ? "default" : "secondary"}>
                                  {lead.score || 0}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{lead.status || 'new'}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs - placeholders */}
          <TabsContent value="campaigns" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaigns Data</CardTitle>
                <CardDescription>Campaign performance and metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Campaign data coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Messages Data</CardTitle>
                <CardDescription>SMS and email communication history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Messages data coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Properties Data</CardTitle>
                <CardDescription>Real estate and property records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Properties data coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TeamSection>
  );
}
