"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Download, Upload, Search, Filter, SortAsc, SortDesc } from "lucide-react";
// Data types available in the browser
type DataType = 'leads' | 'campaigns' | 'messages' | 'properties' | 'csv-upload';

interface DataBrowserProps {
  teamId: string;
}

export default function DataBrowser({ teamId }: DataBrowserProps) {
  const [activeTab, setActiveTab] = useState<DataType>('leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Simple logging functions (TODO: implement proper audit logging)
  const logAction = (action: string, data: any) => {
    console.log('Data Browser Action:', action, data);
  };

  const trackPerformance = (operation: string, duration: number) => {
    console.log('Performance:', operation, `${duration}ms`);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as DataType);
    setCurrentPage(1);
    setSearchQuery('');
    setFilters({});
    logAction('data_browser_tab_changed', { from: activeTab, to: value });
  };

  const handleExport = async (format: 'csv' | 'json') => {
    const startTime = Date.now();
    try {
      // Export logic would go here
      logAction('data_browser_export', { dataType: activeTab, format, filters, searchQuery });
      trackPerformance('data_export', Date.now() - startTime);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    logAction('data_browser_search', { dataType: activeTab, query });
  };

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
    logAction('data_browser_filter', { dataType: activeTab, field, value });
  };

  const handleSort = (field: string) => {
    const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(newOrder);
    logAction('data_browser_sort', { dataType: activeTab, field, order: newOrder });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Browser</h1>
          <p className="text-gray-600 mt-1">Explore and manage your outreach data</p>
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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="leads" className="flex items-center space-x-2">
            <span>Leads</span>
            <Badge variant="secondary" className="ml-2">Primary</Badge>
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
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Filters active:</span>
                <Badge variant="outline">{Object.keys(filters).length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads Tab */}
        <TabsContent value="leads" className="mt-6">
          <LeadsDataTable
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
          />
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="mt-6">
          <CampaignsDataTable
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
          />
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="mt-6">
          <MessagesDataTable
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
          />
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties" className="mt-6">
          <PropertiesDataTable
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
          />
        </TabsContent>

        {/* CSV Upload Tab */}
        <TabsContent value="csv-upload" className="mt-6">
          <CSVUploadSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Placeholder components for each data type
function LeadsDataTable({ teamId, searchQuery, filters, sortField, sortOrder, currentPage, pageSize, onPageChange, onSort, onFilterChange }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads Data</CardTitle>
        <CardDescription>Manage and explore your lead database</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          Leads data table will be implemented with GraphQL integration
        </div>
      </CardContent>
    </Card>
  );
}

function CampaignsDataTable({ teamId, searchQuery, filters, sortField, sortOrder, currentPage, pageSize, onPageChange, onSort, onFilterChange }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaigns Data</CardTitle>
        <CardDescription>Track campaign performance and metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          Campaigns data table will be implemented with GraphQL integration
        </div>
      </CardContent>
    </Card>
  );
}

function MessagesDataTable({ teamId, searchQuery, filters, sortField, sortOrder, currentPage, pageSize, onPageChange, onSort, onFilterChange }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages Data</CardTitle>
        <CardDescription>Review communication history and responses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          Messages data table will be implemented with GraphQL integration
        </div>
      </CardContent>
    </Card>
  );
}

function PropertiesDataTable({ teamId, searchQuery, filters, sortField, sortOrder, currentPage, pageSize, onPageChange, onSort, onFilterChange }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Properties Data</CardTitle>
        <CardDescription>Explore real estate and property data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          Properties data table will be implemented with GraphQL integration
        </div>
      </CardContent>
    </Card>
  );
}

function CSVUploadSection() {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/data-browser", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      // Handle successful upload
      console.log("File uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>CSV Data Upload</CardTitle>
        <CardDescription>Upload and analyze CSV files for data processing</CardDescription>
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
          {isUploading && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Uploading and processing...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}