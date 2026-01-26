"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, Filter, Database, Users, MessageSquare, Building, Loader2, Zap, Phone, CheckCircle } from "lucide-react";
import { useCurrentTeam } from "@/features/team/team.context";
import { useQuery, gql } from "@apollo/client";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";

// GraphQL query for leads data - matches API schema
const LEADS_DATA_QUERY = gql`
  query LeadsData($teamId: ID!, $first: Int, $after: String, $searchQuery: String) {
    leads(teamId: $teamId, first: $first, after: $after, searchQuery: $searchQuery) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          id
          firstName
          lastName
          name
          email
          phone
          company
          status
          score
          pipelineStatus
          city
          state
          createdAt
        }
      }
    }
    leadsCount(teamId: $teamId)
  }
`;

type DataType = 'leads' | 'campaigns' | 'messages' | 'properties';

export default function DataBrowserPage() {
  const { team, teamId, isTeamReady } = useCurrentTeam();
  const [activeTab, setActiveTab] = useState<DataType>('leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [afterCursor, setAfterCursor] = useState<string | null>(null);
  const [cursors, setCursors] = useState<string[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{success: boolean; message: string} | null>(null);
  const pageSize = 50;

  const { data, loading, error, refetch } = useQuery(LEADS_DATA_QUERY, {
    variables: {
      teamId,
      first: pageSize,
      after: afterCursor,
      searchQuery: searchQuery || undefined,
    },
    skip: !isTeamReady || activeTab !== 'leads',
    fetchPolicy: "cache-and-network",
  });

  // Extract leads from edges
  const leads = data?.leads?.edges?.map((edge: any) => edge.node) || [];
  const totalCount = data?.leadsCount || 0;
  const pageInfo = data?.leads?.pageInfo;
  const currentPage = cursors.length + 1;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setAfterCursor(null);
    setCursors([]);
  };

  const handleNextPage = () => {
    if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
      setCursors([...cursors, afterCursor || '']);
      setAfterCursor(pageInfo.endCursor);
    }
  };

  const handlePrevPage = () => {
    if (cursors.length > 0) {
      const newCursors = [...cursors];
      const prevCursor = newCursors.pop();
      setCursors(newCursors);
      setAfterCursor(prevCursor || null);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    const exportData = leads.map((lead: any) => ({
      firstName: lead.firstName,
      lastName: lead.lastName,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      status: lead.status,
      score: lead.score,
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

  // Toggle single lead selection
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  // Toggle all visible leads
  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((l: any) => l.id)));
    }
  };

  // Enrich selected leads
  const handleEnrich = async (provider: 'tracerfy' | 'trestle') => {
    if (selectedLeads.size === 0) {
      setEnrichResult({ success: false, message: 'Select leads first' });
      return;
    }

    setEnriching(true);
    setEnrichResult(null);

    try {
      const response = await fetch('/api/leads/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: Array.from(selectedLeads),
          provider,
          teamId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setEnrichResult({
          success: true,
          message: `Enriched ${result.stats.successful} leads ($${result.stats.cost})`,
        });
        setSelectedLeads(new Set());
        refetch(); // Refresh data
      } else {
        setEnrichResult({
          success: false,
          message: result.error || 'Enrichment failed',
        });
      }
    } catch (error) {
      setEnrichResult({
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setEnriching(false);
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
              disabled={leads.length === 0}
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
              className="flex items-center space-x-2"
              disabled={leads.length === 0}
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Leads Data Lake - Window Shop</CardTitle>
                    <CardDescription>Browse {totalCount.toLocaleString()} raw records - Enrich on demand</CardDescription>
                  </div>
                  {selectedLeads.size > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{selectedLeads.size} selected</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEnrich('tracerfy')}
                        disabled={enriching}
                        className="flex items-center gap-1"
                      >
                        <Zap className="h-4 w-4" />
                        {enriching ? 'Enriching...' : `Tracerfy ($${(selectedLeads.size * 0.02).toFixed(2)})`}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEnrich('trestle')}
                        disabled={enriching}
                        className="flex items-center gap-1"
                      >
                        <Phone className="h-4 w-4" />
                        {enriching ? 'Verifying...' : `Trestle ($${(selectedLeads.size * 0.015).toFixed(2)})`}
                      </Button>
                    </div>
                  )}
                </div>
                {enrichResult && (
                  <div className={`mt-2 p-2 rounded text-sm ${enrichResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {enrichResult.success && <CheckCircle className="h-4 w-4 inline mr-1" />}
                    {enrichResult.message}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="text-center py-4 text-red-500 bg-red-50 rounded-md mb-4">
                    Error loading leads: {error.message}
                  </div>
                )}
                {loading && leads.length === 0 ? (
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
                            <TableHead className="w-10">
                              <Checkbox
                                checked={selectedLeads.size === leads.length && leads.length > 0}
                                onCheckedChange={toggleSelectAll}
                              />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Pipeline</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leads.map((lead: any) => (
                            <TableRow
                              key={lead.id}
                              className={selectedLeads.has(lead.id) ? 'bg-blue-50' : ''}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedLeads.has(lead.id)}
                                  onCheckedChange={() => toggleLeadSelection(lead.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || '-'}
                              </TableCell>
                              <TableCell className="text-sm">{lead.email || <span className="text-muted-foreground">No email</span>}</TableCell>
                              <TableCell className="text-sm">
                                {lead.phone ? (
                                  <span className="text-green-600">{lead.phone}</span>
                                ) : (
                                  <span className="text-orange-500">No phone</span>
                                )}
                              </TableCell>
                              <TableCell>{lead.company || '-'}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {[lead.city, lead.state].filter(Boolean).join(', ') || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={lead.score >= 70 ? "default" : lead.score >= 50 ? "secondary" : "outline"}>
                                  {lead.score || 0}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    lead.pipelineStatus === 'verified' ? 'default' :
                                    lead.pipelineStatus === 'traced' ? 'secondary' : 'outline'
                                  }
                                >
                                  {lead.pipelineStatus || 'raw'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages || 1}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrevPage}
                          disabled={cursors.length === 0}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={!pageInfo?.hasNextPage}
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
