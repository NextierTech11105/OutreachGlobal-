"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploader } from "@/components/file-uploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { InfoIcon as InfoCircle, Search, Download, CheckCircle, XCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface SkipTraceResult {
  id: string;
  propertyId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  ownerName: string;
  phones: string[];
  emails: string[];
  success: boolean;
  error?: string;
}

interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
}

export function SkipTraceModule() {
  const [provider, setProvider] = useState("realestateapi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [results, setResults] = useState<SkipTraceResult[]>([]);
  const [manualEntry, setManualEntry] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });
  const [dataFields, setDataFields] = useState({
    name: true,
    phone: true,
    email: true,
    address: true,
    relatives: false,
    associates: false,
    bankruptcy: false,
    liensJudgments: false,
    criminalRecords: false,
    propertyRecords: false,
    businessRecords: false,
  });

  // Fetch usage on mount
  useEffect(() => {
    fetch("/api/skip-trace")
      .then((r) => r.json())
      .then((data) => {
        setUsage({
          used: data.used || 0,
          limit: data.limit || 5000,
          remaining: data.remaining || 5000,
        });
      })
      .catch(() => {
        setUsage({ used: 0, limit: 5000, remaining: 5000 });
      });
  }, []);

  const handleToggleField = (field: string) => {
    setDataFields((prev) => ({
      ...prev,
      [field]: !prev[field as keyof typeof dataFields],
    }));
  };

  const downloadResults = () => {
    if (results.length === 0) return;
    const csv = [
      ["ID", "Address", "City", "State", "ZIP", "Owner", "Phones", "Emails", "Success"].join(","),
      ...results.map((r) =>
        [
          r.id,
          `"${r.address}"`,
          r.city,
          r.state,
          r.zip,
          `"${r.ownerName}"`,
          `"${r.phones.join("; ")}"`,
          `"${r.emails.join("; ")}"`,
          r.success ? "Yes" : "No",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skip-trace-results-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Skip Trace Records</h3>
              <p className="text-sm text-muted-foreground">
                Find and append contact information for property owners and
                leads
              </p>
            </div>
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            >
              {usage ? `${usage.remaining.toLocaleString()} / ${usage.limit.toLocaleString()} remaining` : "Loading..."}
            </Badge>
          </div>

          <Tabs defaultValue="file">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="file">Upload File</TabsTrigger>
              <TabsTrigger value="existing">Existing Lists</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="mt-6 space-y-4">
              <FileUploader />
              <div className="text-sm text-muted-foreground">
                <p>Supported file formats: CSV, Excel (.xlsx, .xls)</p>
                <p>
                  Required fields: First Name, Last Name, and at least one of:
                  Address, Phone, or Email
                </p>
              </div>
            </TabsContent>
            <TabsContent value="existing" className="mt-6">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-md">
                  <p className="font-medium mb-2">Connect to Sectors</p>
                  <p>Go to <a href="/t/thomas-borrusos-team-f43716/sectors" className="text-blue-500 underline">Sectors</a> to select records for skip tracing.</p>
                  <p className="mt-2">Each sector shows a "Skip Trace" button to enrich selected records with owner contact info.</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="manual" className="mt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={manualEntry.firstName}
                      onChange={(e) => setManualEntry({ ...manualEntry, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Smith"
                      value={manualEntry.lastName}
                      onChange={(e) => setManualEntry({ ...manualEntry, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St"
                    value={manualEntry.address}
                    onChange={(e) => setManualEntry({ ...manualEntry, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="New York"
                      value={manualEntry.city}
                      onChange={(e) => setManualEntry({ ...manualEntry, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="NY"
                      value={manualEntry.state}
                      onChange={(e) => setManualEntry({ ...manualEntry, state: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP</Label>
                    <Input
                      id="zip"
                      placeholder="10001"
                      value={manualEntry.zip}
                      onChange={(e) => setManualEntry({ ...manualEntry, zip: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="provider">Skip Trace Provider</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Different providers offer varying data quality,
                        coverage, and pricing. TLO and LexisNexis typically
                        offer the most comprehensive data but at higher costs.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realestateapi">RealEstateAPI (Configured)</SelectItem>
                  <SelectItem value="tlo" disabled>TLO (Not configured)</SelectItem>
                  <SelectItem value="lexisnexis" disabled>LexisNexis (Not configured)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Fields to Retrieve</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md border p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="name"
                    checked={dataFields.name}
                    onCheckedChange={() => handleToggleField("name")}
                  />
                  <Label htmlFor="name" className="text-sm">
                    Name Verification
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="phone"
                    checked={dataFields.phone}
                    onCheckedChange={() => handleToggleField("phone")}
                  />
                  <Label htmlFor="phone" className="text-sm">
                    Phone Numbers
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email"
                    checked={dataFields.email}
                    onCheckedChange={() => handleToggleField("email")}
                  />
                  <Label htmlFor="email" className="text-sm">
                    Email Addresses
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="address"
                    checked={dataFields.address}
                    onCheckedChange={() => handleToggleField("address")}
                  />
                  <Label htmlFor="address" className="text-sm">
                    Current Address
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="relatives"
                    checked={dataFields.relatives}
                    onCheckedChange={() => handleToggleField("relatives")}
                  />
                  <Label htmlFor="relatives" className="text-sm">
                    Relatives
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="associates"
                    checked={dataFields.associates}
                    onCheckedChange={() => handleToggleField("associates")}
                  />
                  <Label htmlFor="associates" className="text-sm">
                    Associates
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bankruptcy"
                    checked={dataFields.bankruptcy}
                    onCheckedChange={() => handleToggleField("bankruptcy")}
                  />
                  <Label htmlFor="bankruptcy" className="text-sm">
                    Bankruptcy Records
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="liensJudgments"
                    checked={dataFields.liensJudgments}
                    onCheckedChange={() => handleToggleField("liensJudgments")}
                  />
                  <Label htmlFor="liensJudgments" className="text-sm">
                    Liens & Judgments
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="criminalRecords"
                    checked={dataFields.criminalRecords}
                    onCheckedChange={() => handleToggleField("criminalRecords")}
                  />
                  <Label htmlFor="criminalRecords" className="text-sm">
                    Criminal Records
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="propertyRecords"
                    checked={dataFields.propertyRecords}
                    onCheckedChange={() => handleToggleField("propertyRecords")}
                  />
                  <Label htmlFor="propertyRecords" className="text-sm">
                    Property Records
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="businessRecords"
                    checked={dataFields.businessRecords}
                    onCheckedChange={() => handleToggleField("businessRecords")}
                  />
                  <Label htmlFor="businessRecords" className="text-sm">
                    Business Records
                  </Label>
                </div>
              </div>
            </div>

            <div className="rounded-md bg-muted p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Estimated Cost</p>
                  <p className="text-sm text-muted-foreground">
                    Based on selected provider and data fields
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$0.12 - $0.45 per record</p>
                  <p className="text-sm text-muted-foreground">
                    ~$15.00 - $56.25 total for 125 records
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      {results.length > 0 && (
        <CardContent className="border-t pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Results ({results.length} records)</h3>
              <Button variant="outline" size="sm" onClick={downloadResults}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </div>
            <div className="max-h-64 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Address</th>
                    <th className="p-2 text-left">Owner</th>
                    <th className="p-2 text-left">Phones</th>
                    <th className="p-2 text-left">Emails</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, 50).map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2">{r.address}, {r.city} {r.state}</td>
                      <td className="p-2">{r.ownerName}</td>
                      <td className="p-2">{r.phones.join(", ") || "-"}</td>
                      <td className="p-2">{r.emails.join(", ") || "-"}</td>
                      <td className="p-2 text-center">
                        {r.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500 inline" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      )}
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setResults([])}>
          {results.length > 0 ? "Clear Results" : "Cancel"}
        </Button>
        <Button
          onClick={async () => {
            if (!manualEntry.firstName && !manualEntry.lastName && !manualEntry.address) {
              toast.error("Enter at least name or address to skip trace");
              return;
            }
            setIsProcessing(true);
            try {
              const response = await fetch("/api/skip-trace", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  firstName: manualEntry.firstName,
                  lastName: manualEntry.lastName,
                  address: manualEntry.address,
                  city: manualEntry.city,
                  state: manualEntry.state,
                  zip: manualEntry.zip,
                }),
              });
              const data = await response.json();
              if (!response.ok) {
                toast.error(data.error || "Skip trace failed");
                return;
              }
              if (data.success) {
                setResults([{
                  id: "manual-1",
                  propertyId: "",
                  address: manualEntry.address,
                  city: manualEntry.city,
                  state: manualEntry.state,
                  zip: manualEntry.zip,
                  ownerName: data.ownerName || `${manualEntry.firstName} ${manualEntry.lastName}`,
                  phones: data.phones?.map((p: { number: string }) => p.number) || [],
                  emails: data.emails?.map((e: { email: string }) => e.email) || [],
                  success: true,
                }]);
                setUsage(data.usage);
                toast.success(`Found ${data.phones?.length || 0} phones, ${data.emails?.length || 0} emails`);
              } else {
                toast.error(data.error || "No results found");
              }
            } catch (error: unknown) {
              toast.error(error instanceof Error ? error.message : "Skip trace failed");
            } finally {
              setIsProcessing(false);
            }
          }}
          disabled={isProcessing}
        >
          {isProcessing ? "Processing..." : "Run Skip Trace"}
          {!isProcessing && <Search className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
}
