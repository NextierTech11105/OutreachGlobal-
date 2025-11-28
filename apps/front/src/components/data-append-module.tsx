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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { InfoIcon as InfoCircle, PlusCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

export function DataAppendModule() {
  const [provider, setProvider] = useState("attom");
  const [isProcessing, setIsProcessing] = useState(false);
  const [dataFields, setDataFields] = useState({
    propertyCharacteristics: true,
    ownerInfo: true,
    taxAssessment: true,
    mortgageInfo: true,
    foreclosureStatus: true,
    marketValue: true,
    demographicData: false,
    schoolInfo: false,
    floodZone: false,
    crimeData: false,
    salesHistory: true,
    permitHistory: false,
  });

  const handleToggleField = (field: string) => {
    setDataFields((prev) => ({
      ...prev,
      [field]: !prev[field as keyof typeof dataFields],
    }));
  };

  const handleAppendData = () => {
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
              <h3 className="text-lg font-medium">Append Property Data</h3>
              <p className="text-sm text-muted-foreground">
                Enrich your property records with additional data from premium
                sources
              </p>
            </div>
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
            >
              API Credits: 5,000 remaining
            </Badge>
          </div>

          <Tabs defaultValue="file">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="file">Upload File</TabsTrigger>
              <TabsTrigger value="existing">Existing Lists</TabsTrigger>
              <TabsTrigger value="verified">Recently Verified</TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="mt-6 space-y-4">
              <FileUploader />
              <div className="text-sm text-muted-foreground">
                <p>Supported file formats: CSV, Excel (.xlsx, .xls)</p>
                <p>
                  Required fields: Property Address or APN (Assessor's Parcel
                  Number)
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
            <TabsContent value="verified" className="mt-6">
              <div className="space-y-4">
                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        Recently Verified Addresses
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        98 records verified on May 11, 2025
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700"
                    >
                      Ready for Enrichment
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <Progress value={100} className="h-2" />
                  </div>
                </div>
                <Button className="w-full" variant="outline">
                  Use Recently Verified Data
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="provider">Data Provider</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Different providers specialize in different types of
                        property data. ATTOM Data and CoreLogic offer the most
                        comprehensive property datasets.
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
                  <SelectItem value="attom">ATTOM Data (Premium)</SelectItem>
                  <SelectItem value="corelogic">CoreLogic</SelectItem>
                  <SelectItem value="blackknight">Black Knight</SelectItem>
                  <SelectItem value="firstam">First American</SelectItem>
                  <SelectItem value="zillow">Zillow API</SelectItem>
                  <SelectItem value="redfin">Redfin API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Fields to Append</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md border p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="propertyCharacteristics"
                    checked={dataFields.propertyCharacteristics}
                    onCheckedChange={() =>
                      handleToggleField("propertyCharacteristics")
                    }
                  />
                  <Label htmlFor="propertyCharacteristics" className="text-sm">
                    Property Characteristics
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ownerInfo"
                    checked={dataFields.ownerInfo}
                    onCheckedChange={() => handleToggleField("ownerInfo")}
                  />
                  <Label htmlFor="ownerInfo" className="text-sm">
                    Owner Information
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="taxAssessment"
                    checked={dataFields.taxAssessment}
                    onCheckedChange={() => handleToggleField("taxAssessment")}
                  />
                  <Label htmlFor="taxAssessment" className="text-sm">
                    Tax Assessment
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mortgageInfo"
                    checked={dataFields.mortgageInfo}
                    onCheckedChange={() => handleToggleField("mortgageInfo")}
                  />
                  <Label htmlFor="mortgageInfo" className="text-sm">
                    Mortgage Information
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="foreclosureStatus"
                    checked={dataFields.foreclosureStatus}
                    onCheckedChange={() =>
                      handleToggleField("foreclosureStatus")
                    }
                  />
                  <Label htmlFor="foreclosureStatus" className="text-sm">
                    Foreclosure Status
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="marketValue"
                    checked={dataFields.marketValue}
                    onCheckedChange={() => handleToggleField("marketValue")}
                  />
                  <Label htmlFor="marketValue" className="text-sm">
                    Market Value
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="demographicData"
                    checked={dataFields.demographicData}
                    onCheckedChange={() => handleToggleField("demographicData")}
                  />
                  <Label htmlFor="demographicData" className="text-sm">
                    Demographic Data
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="schoolInfo"
                    checked={dataFields.schoolInfo}
                    onCheckedChange={() => handleToggleField("schoolInfo")}
                  />
                  <Label htmlFor="schoolInfo" className="text-sm">
                    School Information
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="floodZone"
                    checked={dataFields.floodZone}
                    onCheckedChange={() => handleToggleField("floodZone")}
                  />
                  <Label htmlFor="floodZone" className="text-sm">
                    Flood Zone
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="crimeData"
                    checked={dataFields.crimeData}
                    onCheckedChange={() => handleToggleField("crimeData")}
                  />
                  <Label htmlFor="crimeData" className="text-sm">
                    Crime Data
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="salesHistory"
                    checked={dataFields.salesHistory}
                    onCheckedChange={() => handleToggleField("salesHistory")}
                  />
                  <Label htmlFor="salesHistory" className="text-sm">
                    Sales History
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="permitHistory"
                    checked={dataFields.permitHistory}
                    onCheckedChange={() => handleToggleField("permitHistory")}
                  />
                  <Label htmlFor="permitHistory" className="text-sm">
                    Permit History
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
                  <p className="font-medium">$0.08 - $0.25 per record</p>
                  <p className="text-sm text-muted-foreground">
                    ~$10.00 - $31.25 total for 125 records
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleAppendData} disabled={isProcessing}>
          {isProcessing ? "Processing..." : "Append Data"}
          {!isProcessing && <PlusCircle className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
}
