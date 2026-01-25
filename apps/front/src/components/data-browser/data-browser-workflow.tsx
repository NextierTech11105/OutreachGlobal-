import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Download, Upload, Search, Filter, SortAsc, SortDesc, Play, Pause, RotateCcw, CheckCircle, XCircle, Clock, Zap } from "lucide-react";
import { useAuditLog } from "@/lib/hooks/use-audit-log";
import { useMonitoring } from "@/lib/hooks/use-monitoring";

// Types for the workflow system
type DataType = 'leads' | 'campaigns' | 'messages' | 'properties' | 'csv-upload';
type WorkflowStatus = 'idle' | 'searching' | 'filtering' | 'sorting' | 'exporting' | 'loading' | 'error' | 'success';

interface WorkflowState {
  status: WorkflowStatus;
  progress: number;
  message: string;
  operationId?: string;
}

interface DataBrowserWorkflowProps {
  teamId: string;
  initialTab?: DataType;
}

export function DataBrowserWorkflow({ teamId, initialTab = 'leads' }: DataBrowserWorkflowProps) {
  const [activeTab, setActiveTab] = useState<DataType>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    status: 'idle',
    progress: 0,
    message: 'Ready'
  });

  const { logAction } = useAuditLog();
  const { startTracking, endTracking, trackUserAction } = useMonitoring();

  // Workflow state management
  const updateWorkflowState = useCallback((updates: Partial<WorkflowState>) => {
    setWorkflowState(prev => ({ ...prev, ...updates }));
  }, []);

  const startWorkflowOperation = useCallback((operation: string, message: string) => {
    const operationId = `${operation}_${Date.now()}`;
    startTracking(operationId);
    updateWorkflowState({
      status: operation as WorkflowStatus,
      progress: 0,
      message,
      operationId
    });
    logAction({
      action: `workflow_${operation}_start`,
      category: 'data_browser',
      details: { tab: activeTab, searchQuery, filters }
    });
  }, [activeTab, searchQuery, filters, startTracking, updateWorkflowState, logAction]);

  const completeWorkflowOperation = useCallback((success: boolean = true, finalMessage?: string) => {
    const { operationId } = workflowState;
    if (operationId) {
      endTracking(operationId, { success, tab: activeTab });
    }

    updateWorkflowState({
      status: success ? 'success' : 'error',
      progress: 100,
      message: finalMessage || (success ? 'Operation completed' : 'Operation failed')
    });

    // Reset to idle after a delay
    setTimeout(() => {
      updateWorkflowState({
        status: 'idle',
        progress: 0,
        message: 'Ready'
      });
    }, 3000);
  }, [workflowState.operationId, activeTab, endTracking, updateWorkflowState]);

  // Tab change handler with workflow tracking
  const handleTabChange = useCallback((value: string) => {
    const newTab = value as DataType;
    startWorkflowOperation('tab_change', `Switching to ${newTab} view`);

    setActiveTab(newTab);
    setCurrentPage(1);
    setSearchQuery('');
    setFilters({});

    trackUserAction('tab_changed', { from: activeTab, to: newTab });
    logAction({
      action: 'tab_changed',
      category: 'navigation',
      details: { from: activeTab, to: newTab }
    });

    completeWorkflowOperation(true, `Switched to ${newTab} view`);
  }, [activeTab, startWorkflowOperation, trackUserAction, logAction, completeWorkflowOperation]);

  // Search handler with workflow tracking
  const handleSearch = useCallback((query: string) => {
    startWorkflowOperation('search', `Searching for "${query}"`);

    setSearchQuery(query);
    setCurrentPage(1);

    trackUserAction('search_performed', { query, tab: activeTab });
    logAction({
      action: 'search_performed',
      category: 'data_operations',
      details: { query, tab: activeTab }
    });

    // Simulate search progress
    setTimeout(() => {
      updateWorkflowState({ progress: 50, message: 'Processing search results...' });
      setTimeout(() => {
        completeWorkflowOperation(true, `Found results for "${query}"`);
      }, 500);
    }, 300);
  }, [activeTab, startWorkflowOperation, trackUserAction, logAction, updateWorkflowState, completeWorkflowOperation]);

  // Export handler with workflow tracking
  const handleExport = useCallback(async (format: 'csv' | 'json') => {
    startWorkflowOperation('export', `Exporting data as ${format.toUpperCase()}`);

    try {
      updateWorkflowState({ progress: 25, message: 'Preparing data...' });

      // Simulate export process
      setTimeout(() => updateWorkflowState({ progress: 50, message: 'Generating file...' }), 500);
      setTimeout(() => updateWorkflowState({ progress: 75, message: 'Downloading...' }), 1000);
      setTimeout(() => {
        trackUserAction('data_exported', { format, tab: activeTab, filters, searchQuery });
        logAction({
          action: 'data_exported',
          category: 'data_operations',
          details: { format, tab: activeTab, recordCount: 150 } // Mock count
        });
        completeWorkflowOperation(true, `Exported 150 records as ${format.toUpperCase()}`);
      }, 1500);
    } catch (error) {
      completeWorkflowOperation(false, 'Export failed');
    }
  }, [activeTab, filters, searchQuery, startWorkflowOperation, updateWorkflowState, trackUserAction, logAction, completeWorkflowOperation]);

  // Filter change handler
  const handleFilterChange = useCallback((field: string, value: any) => {
    startWorkflowOperation('filter', `Applying filter: ${field}`);

    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);

    trackUserAction('filter_applied', { field, value, tab: activeTab });
    logAction({
      action: 'filter_applied',
      category: 'data_operations',
      details: { field, value, tab: activeTab }
    });

    completeWorkflowOperation(true, `Filter applied: ${field} = ${value}`);
  }, [activeTab, startWorkflowOperation, trackUserAction, logAction, completeWorkflowOperation]);

  // Sort handler
  const handleSort = useCallback((field: string) => {
    const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    startWorkflowOperation('sort', `Sorting by ${field} ${newOrder}`);

    setSortField(field);
    setSortOrder(newOrder);

    trackUserAction('data_sorted', { field, order: newOrder, tab: activeTab });
    logAction({
      action: 'data_sorted',
      category: 'data_operations',
      details: { field, order: newOrder, tab: activeTab }
    });

    completeWorkflowOperation(true, `Sorted by ${field} ${newOrder}`);
  }, [sortField, sortOrder, activeTab, startWorkflowOperation, trackUserAction, logAction, completeWorkflowOperation]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Browser Workflow</h1>
          <p className="text-gray-600 mt-1">Intelligent data exploration with real-time insights</p>
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

      {/* Workflow Status Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {workflowState.status === 'idle' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {workflowState.status === 'loading' && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />}
                {workflowState.status === 'searching' && <Search className="h-5 w-5 text-blue-500" />}
                {workflowState.status === 'filtering' && <Filter className="h-5 w-5 text-purple-500" />}
                {workflowState.status === 'exporting' && <Download className="h-5 w-5 text-orange-500" />}
                {workflowState.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {workflowState.status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                <span className="font-medium capitalize">{workflowState.status}</span>
              </div>
              <span className="text-gray-600">{workflowState.message}</span>
            </div>
            {workflowState.progress > 0 && workflowState.progress < 100 && (
              <div className="w-32">
                <Progress value={workflowState.progress} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="leads" className="flex items-center space-x-2">
            <span>Leads</span>
            <Badge variant="secondary" className="ml-2">AI-Powered</Badge>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center space-x-2">
            <span>Campaigns</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center space-x-2">
            <span>Messages</span>
          </TabsTrigger>
          <TabsTrigger value="properties" className="flex items-center space-x-2">
            <span>Properties</span>
          </TabsTrigger>
          <TabsTrigger value="csv-upload" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>CSV Upload</span>
          </TabsTrigger>
        </TabsList>

        {/* Search and Filters Bar */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex-1">
                <Label htmlFor="search" className="sr-only">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder={`Search ${activeTab}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button onClick={() => handleSearch(searchQuery)} className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>Search</span>
              </Button>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Filters active:</span>
                <Badge variant="outline">{Object.keys(filters).length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Contents with Workflow Integration */}
        <TabsContent value="leads" className="mt-6">
          <LeadsWorkflowTable
            teamId={teamId}
            searchQuery={searchQuery}
            filters={filters}
            sortField={sortField}
            sortOrder={sortOrder}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onSort={handleSort}
            onFilterChange={handleFilterChange}
            workflowState={workflowState}
            onWorkflowUpdate={updateWorkflowState}
          />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <CampaignsWorkflowTable
            teamId={teamId}
            searchQuery={searchQuery}
            filters={filters}
            sortField={sortField}
            sortOrder={sortOrder}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onSort={handleSort}
            onFilterChange={handleFilterChange}
            workflowState={workflowState}
            onWorkflowUpdate={updateWorkflowState}
          />
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          <MessagesWorkflowTable
            teamId={teamId}
            searchQuery={searchQuery}
            filters={filters}
            sortField={sortField}
            sortOrder={sortOrder}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onSort={handleSort}
            onFilterChange={handleFilterChange}
            workflowState={workflowState}
            onWorkflowUpdate={updateWorkflowState}
          />
        </TabsContent>

        <TabsContent value="properties" className="mt-6">
          <PropertiesWorkflowTable
            teamId={teamId}
            searchQuery={searchQuery}
            filters={filters}
            sortField={sortField}
            sortOrder={sortOrder}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onSort={handleSort}
            onFilterChange={handleFilterChange}
            workflowState={workflowState}
            onWorkflowUpdate={updateWorkflowState}
          />
        </TabsContent>

        <TabsContent value="csv-upload" className="mt-6">
          <CSVUploadWorkflowSection
            workflowState={workflowState}
            onWorkflowUpdate={updateWorkflowState}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Workflow-enabled table components
function LeadsWorkflowTable({ teamId, searchQuery, filters, sortField, sortOrder, currentPage, pageSize, onPageChange, onSort, onFilterChange, workflowState, onWorkflowUpdate }: any) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: pageSize.toString(),
          sortBy: sortField,
          sortOrder,
        });
        if (searchQuery) params.append('search', searchQuery);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.source) params.append('source', filters.source);
        if (filters?.priority) params.append('priority', filters.priority);

        const response = await fetch(`/api/leads?${params}`);
        if (!response.ok) throw new Error('Failed to fetch leads');
        const data = await response.json();
        setLeads(data.results || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [teamId, searchQuery, filters, sortField, sortOrder, currentPage, pageSize]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading leads...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-600">Error loading leads: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Leads Data</span>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Zap className="h-3 w-3" />
            <span>AI Scored</span>
          </Badge>
        </CardTitle>
        <CardDescription>AI-powered lead management with intelligent scoring</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => onSort('name')} className="cursor-pointer hover:bg-gray-50">
                Name {sortField === 'name' && (sortOrder === 'asc' ? <SortAsc className="inline h-4 w-4" /> : <SortDesc className="inline h-4 w-4" />)}
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead onClick={() => onSort('score')} className="cursor-pointer hover:bg-gray-50">
                AI Score {sortField === 'score' && (sortOrder === 'asc' ? <SortAsc className="inline h-4 w-4" /> : <SortDesc className="inline h-4 w-4" />)}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{`${lead.firstName} ${lead.lastName || ''}`.trim()}</TableCell>
                <TableCell>{lead.email}</TableCell>
                <TableCell>
                  <Badge variant={lead.status === 'qualified' ? 'default' : 'secondary'}>
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span>{lead.score}</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${lead.score}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CampaignsWorkflowTable({ teamId, searchQuery, currentPage, pageSize, onSort }: any) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: currentPage.toString(), limit: pageSize.toString() });
        if (searchQuery) params.append("search", searchQuery);
        const response = await fetch(`/api/campaigns?${params}`);
        const data = await response.json();
        setCampaigns(data.campaigns || data.results || []);
      } catch (err) {
        console.error("Failed to fetch campaigns:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, [teamId, searchQuery, currentPage, pageSize]);

  if (loading) {
    return <Card><CardContent className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /><p className="mt-2">Loading...</p></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader><CardTitle>Campaigns</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Sent</TableHead></TableRow></TableHeader>
          <TableBody>
            {campaigns.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8">No campaigns</TableCell></TableRow> : campaigns.map((c: any) => (
              <TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell><Badge>{c.status}</Badge></TableCell><TableCell>{c.sentCount || 0}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function MessagesWorkflowTable({ teamId, searchQuery, currentPage, pageSize }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ teamId, limit: pageSize.toString() });
        const response = await fetch(`/api/sms/conversations?${params}`);
        const data = await response.json();
        setMessages(data.conversations || []);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [teamId, searchQuery, currentPage, pageSize]);

  if (loading) {
    return <Card><CardContent className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /><p className="mt-2">Loading...</p></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader><CardTitle>Messages</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Lead</TableHead><TableHead>Last Message</TableHead><TableHead>Direction</TableHead></TableRow></TableHeader>
          <TableBody>
            {messages.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8">No messages</TableCell></TableRow> : messages.map((m: any) => (
              <TableRow key={m.leadId}><TableCell>{m.leadName}</TableCell><TableCell className="truncate max-w-[200px]">{m.lastMessage}</TableCell><TableCell><Badge>{m.lastDirection}</Badge></TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PropertiesWorkflowTable({ teamId, searchQuery, currentPage, pageSize }: any) {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: currentPage.toString(), limit: pageSize.toString() });
        const response = await fetch(`/api/properties?${params}`);
        const data = await response.json();
        setProperties(data.properties || data.results || []);
      } catch (err) {
        console.error("Failed to fetch properties:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [teamId, searchQuery, currentPage, pageSize]);

  if (loading) {
    return <Card><CardContent className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /><p className="mt-2">Loading...</p></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader><CardTitle>Properties</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Address</TableHead><TableHead>City</TableHead><TableHead>State</TableHead></TableRow></TableHeader>
          <TableBody>
            {properties.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8">No properties</TableCell></TableRow> : properties.map((p: any) => (
              <TableRow key={p.id}><TableCell>{p.address}</TableCell><TableCell>{p.city}</TableCell><TableCell>{p.state}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CSVUploadWorkflowSection({ workflowState, onWorkflowUpdate }: any) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    onWorkflowUpdate({
      status: 'loading',
      progress: 0,
      message: 'Reading file...'
    });

    try {
      // Read CSV file
      const text = await file.text();
      onWorkflowUpdate({ progress: 20, message: 'Parsing CSV...' });

      // Parse CSV to lead objects
      const lines = text.split("\n").filter((l: string) => l.trim());
      if (lines.length < 2) {
        throw new Error("CSV must have headers and at least one row");
      }

      const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase().replace(/"/g, "").replace(/\s+/g, "_"));

      const columnMap: Record<string, string> = {
        first_name: "firstName", firstname: "firstName", first: "firstName",
        last_name: "lastName", lastname: "lastName", last: "lastName",
        phone: "phone", phone_number: "phone", mobile: "phone", cell: "phone",
        company: "company", company_name: "company", business_name: "company",
        email: "email", email_address: "email",
        city: "city", state: "state", address: "address", zip: "zip",
      };

      const leadData = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v: string) => v.trim().replace(/"/g, ""));
        const lead: Record<string, string> = {};

        headers.forEach((header: string, idx: number) => {
          const mappedField = columnMap[header];
          if (mappedField && values[idx]) {
            lead[mappedField] = values[idx];
          }
        });

        if (lead.firstName || lead.phone || lead.company) {
          leadData.push(lead);
        }
      }

      onWorkflowUpdate({ progress: 50, message: `Importing ${leadData.length} leads...` });

      // Call the real import API
      const response = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: leadData,
          source: "csv_import",
          industryId: "general",
          campaign: "B2B",
          bucketName: file.name.replace(".csv", ""),
        }),
      });

      const result = await response.json();
      onWorkflowUpdate({ progress: 90, message: 'Finalizing...' });

      if (result.success || result.imported > 0) {
        onWorkflowUpdate({
          status: 'success',
          progress: 100,
          message: `Imported ${result.imported || leadData.length} leads`
        });
      } else {
        throw new Error(result.error || "Import failed");
      }

      setTimeout(() => onWorkflowUpdate({ status: 'idle', progress: 0, message: 'Ready' }), 3000);
    } catch (error) {
      onWorkflowUpdate({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Upload failed'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>CSV Data Upload</CardTitle>
        <CardDescription>Upload and analyze CSV files with workflow tracking</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="csv-upload" className="block text-sm font-medium mb-2">
              Select CSV File
            </Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </div>
          {workflowState.status !== 'idle' && (
            <Alert>
              <AlertDescription>
                {workflowState.message}
                {workflowState.progress > 0 && workflowState.progress < 100 && (
                  <Progress value={workflowState.progress} className="mt-2" />
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}