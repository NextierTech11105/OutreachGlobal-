"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowRight, RefreshCw, Save, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

// Sample Zoho modules and fields
const zohoModules = [
  {
    name: "Leads",
    fields: [
      { id: "1", name: "First_Name", label: "First Name", type: "text" },
      { id: "2", name: "Last_Name", label: "Last Name", type: "text" },
      { id: "3", name: "Email", label: "Email", type: "email" },
      { id: "4", name: "Phone", label: "Phone", type: "phone" },
      { id: "5", name: "Company", label: "Company", type: "text" },
      { id: "6", name: "Lead_Status", label: "Lead Status", type: "picklist" },
      { id: "7", name: "Lead_Source", label: "Lead Source", type: "picklist" },
    ],
  },
  {
    name: "Contacts",
    fields: [
      { id: "1", name: "First_Name", label: "First Name", type: "text" },
      { id: "2", name: "Last_Name", label: "Last Name", type: "text" },
      { id: "3", name: "Email", label: "Email", type: "email" },
      { id: "4", name: "Phone", label: "Phone", type: "phone" },
      { id: "5", name: "Account_Name", label: "Account Name", type: "lookup" },
      { id: "6", name: "Title", label: "Title", type: "text" },
    ],
  },
  {
    name: "Accounts",
    fields: [
      { id: "1", name: "Account_Name", label: "Account Name", type: "text" },
      { id: "2", name: "Website", label: "Website", type: "url" },
      { id: "3", name: "Phone", label: "Phone", type: "phone" },
      { id: "4", name: "Industry", label: "Industry", type: "picklist" },
      { id: "5", name: "Employees", label: "Employees", type: "integer" },
    ],
  },
  {
    name: "Deals",
    fields: [
      { id: "1", name: "Deal_Name", label: "Deal Name", type: "text" },
      { id: "2", name: "Account_Name", label: "Account Name", type: "lookup" },
      { id: "3", name: "Stage", label: "Stage", type: "picklist" },
      { id: "4", name: "Amount", label: "Amount", type: "currency" },
      { id: "5", name: "Closing_Date", label: "Closing Date", type: "date" },
    ],
  },
];

// Sample local entities and fields
const localEntities = [
  {
    name: "leads",
    label: "Leads",
    fields: [
      { id: "1", name: "firstName", label: "First Name", type: "string" },
      { id: "2", name: "lastName", label: "Last Name", type: "string" },
      { id: "3", name: "email", label: "Email", type: "email" },
      { id: "4", name: "phone", label: "Phone", type: "phone" },
      { id: "5", name: "status", label: "Status", type: "enum" },
      { id: "6", name: "source", label: "Source", type: "enum" },
      { id: "7", name: "address", label: "Address", type: "address" },
    ],
  },
  {
    name: "contacts",
    label: "Contacts",
    fields: [
      { id: "1", name: "firstName", label: "First Name", type: "string" },
      { id: "2", name: "lastName", label: "Last Name", type: "string" },
      { id: "3", name: "email", label: "Email", type: "email" },
      { id: "4", name: "phone", label: "Phone", type: "phone" },
      { id: "5", name: "company", label: "Company", type: "reference" },
      { id: "6", name: "jobTitle", label: "Job Title", type: "string" },
    ],
  },
  {
    name: "companies",
    label: "Companies",
    fields: [
      { id: "1", name: "name", label: "Company Name", type: "string" },
      { id: "2", name: "website", label: "Website", type: "url" },
      { id: "3", name: "industry", label: "Industry", type: "enum" },
      { id: "4", name: "size", label: "Company Size", type: "enum" },
      { id: "5", name: "address", label: "Address", type: "address" },
    ],
  },
];

export function ZohoSchemaMapper() {
  const [selectedZohoModule, setSelectedZohoModule] = useState("");
  const [selectedLocalEntity, setSelectedLocalEntity] = useState("");
  const [mappings, setMappings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncDirection, setSyncDirection] = useState("bidirectional");

  // Get fields for selected module and entity
  const zohoFields =
    zohoModules.find((m) => m.name === selectedZohoModule)?.fields || [];
  const localFields =
    localEntities.find((e) => e.name === selectedLocalEntity)?.fields || [];

  // Load mappings from Zoho
  const loadMappingsFromZoho = () => {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      // Auto-generate mappings based on similar field names
      const autoMappings = [];

      zohoFields.forEach((zohoField) => {
        const normalizedZohoName = zohoField.name
          .toLowerCase()
          .replace(/_/g, "");

        // Find matching local field
        const matchingLocalField = localFields.find((localField) => {
          const normalizedLocalName = localField.name.toLowerCase();
          return (
            normalizedZohoName === normalizedLocalName ||
            normalizedZohoName.includes(normalizedLocalName) ||
            normalizedLocalName.includes(normalizedZohoName)
          );
        });

        if (matchingLocalField) {
          autoMappings.push({
            zohoField: zohoField,
            localField: matchingLocalField,
            enabled: true,
          });
        }
      });

      setMappings(autoMappings);
      setIsLoading(false);
    }, 1500);
  };

  // Add a new mapping
  const addMapping = (zohoField, localField) => {
    // Check if mapping already exists
    const existingMapping = mappings.find(
      (m) =>
        m.zohoField.id === zohoField.id && m.localField.id === localField.id,
    );

    if (!existingMapping) {
      setMappings([
        ...mappings,
        {
          zohoField,
          localField,
          enabled: true,
        },
      ]);
    }
  };

  // Remove a mapping
  const removeMapping = (index) => {
    const newMappings = [...mappings];
    newMappings.splice(index, 1);
    setMappings(newMappings);
  };

  // Toggle mapping enabled state
  const toggleMappingEnabled = (index) => {
    const newMappings = [...mappings];
    newMappings[index].enabled = !newMappings[index].enabled;
    setMappings(newMappings);
  };

  // Save mappings
  const saveMappings = () => {
    // In a real implementation, this would save to your database
    console.log("Saving mappings:", {
      zohoModule: selectedZohoModule,
      localEntity: selectedLocalEntity,
      mappings,
      autoSync: autoSyncEnabled,
      syncDirection,
    });

    alert("Mappings saved successfully!");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Zoho CRM Schema Mapper</CardTitle>
        <CardDescription>
          Map fields between Zoho CRM and your local schema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="zohoModule">Zoho CRM Module</Label>
            <Select
              value={selectedZohoModule}
              onValueChange={setSelectedZohoModule}
            >
              <SelectTrigger id="zohoModule">
                <SelectValue placeholder="Select Zoho module" />
              </SelectTrigger>
              <SelectContent>
                {zohoModules.map((module) => (
                  <SelectItem key={module.name} value={module.name}>
                    {module.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="localEntity">Local Entity</Label>
            <Select
              value={selectedLocalEntity}
              onValueChange={setSelectedLocalEntity}
            >
              <SelectTrigger id="localEntity">
                <SelectValue placeholder="Select local entity" />
              </SelectTrigger>
              <SelectContent>
                {localEntities.map((entity) => (
                  <SelectItem key={entity.name} value={entity.name}>
                    {entity.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <Button
            onClick={loadMappingsFromZoho}
            disabled={!selectedZohoModule || !selectedLocalEntity || isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Auto-Map Fields
              </>
            )}
          </Button>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="autoSync"
                checked={autoSyncEnabled}
                onCheckedChange={setAutoSyncEnabled}
              />
              <Label htmlFor="autoSync">Auto-Sync</Label>
            </div>

            <div className="space-y-2">
              <Select
                value={syncDirection}
                onValueChange={setSyncDirection}
                disabled={!autoSyncEnabled}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sync Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bidirectional">Bidirectional</SelectItem>
                  <SelectItem value="to_zoho">To Zoho Only</SelectItem>
                  <SelectItem value="from_zoho">From Zoho Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {mappings.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zoho Field</TableHead>
                <TableHead></TableHead>
                <TableHead>Local Field</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="font-medium">{mapping.zohoField.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {mapping.zohoField.name}
                    </div>
                    <Badge variant="outline">{mapping.zohoField.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="mx-auto h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {mapping.localField.label}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {mapping.localField.name}
                    </div>
                    <Badge variant="outline">{mapping.localField.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={mapping.enabled}
                      onCheckedChange={() => toggleMappingEnabled(index)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMapping(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {selectedZohoModule &&
          selectedLocalEntity &&
          mappings.length === 0 &&
          !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              No field mappings defined. Click "Auto-Map Fields" to generate
              mappings automatically.
            </div>
          )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          {mappings.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {mappings.filter((m) => m.enabled).length} of {mappings.length}{" "}
              mappings enabled
            </div>
          )}
        </div>
        <Button onClick={saveMappings} disabled={mappings.length === 0}>
          <Save className="mr-2 h-4 w-4" />
          Save Mappings
        </Button>
      </CardFooter>
    </Card>
  );
}
