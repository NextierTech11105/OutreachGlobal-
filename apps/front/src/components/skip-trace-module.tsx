"use client";

import { useState } from "react";
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
import { InfoIcon as InfoCircle, Search } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SkipTraceModule() {
  const [provider, setProvider] = useState("tlo");
  const [isProcessing, setIsProcessing] = useState(false);
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

  const handleToggleField = (field: string) => {
    setDataFields((prev) => ({
      ...prev,
      [field]: !prev[field as keyof typeof dataFields],
    }));
  };

  const handleSkipTrace = () => {
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
    }, 3000);
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
              Credits: 2,450 remaining
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
                <Select defaultValue="recent">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a list" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">
                      Recent Imports (125 records)
                    </SelectItem>
                    <SelectItem value="bronx">
                      Bronx Properties (342 records)
                    </SelectItem>
                    <SelectItem value="queens">
                      Queens Absentee Owners (208 records)
                    </SelectItem>
                    <SelectItem value="brooklyn">
                      Brooklyn Pre-Foreclosures (156 records)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Recent Imports</h4>
                      <p className="text-sm text-muted-foreground">
                        125 records, imported on May 10, 2025
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Preview
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="manual" className="mt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St, New York, NY 10001"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" placeholder="(555) 123-4567" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" placeholder="john.doe@example.com" />
                  </div>
                </div>
                <Button className="w-full">Add Record</Button>
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
                  <SelectItem value="tlo">TLO (Premium)</SelectItem>
                  <SelectItem value="lexisnexis">LexisNexis</SelectItem>
                  <SelectItem value="melissa">Melissa Data</SelectItem>
                  <SelectItem value="idi">IDI</SelectItem>
                  <SelectItem value="tracers">Tracers</SelectItem>
                  <SelectItem value="spokeo">Spokeo (Budget)</SelectItem>
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
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSkipTrace} disabled={isProcessing}>
          {isProcessing ? "Processing..." : "Run Skip Trace"}
          {!isProcessing && <Search className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
}
