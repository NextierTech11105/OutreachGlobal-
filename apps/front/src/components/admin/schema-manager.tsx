"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Save, Trash2, ArrowDownUp, FileJson } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Field type options
const fieldTypes = [
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
  { value: "enum", label: "Dropdown" },
  { value: "array", label: "Array" },
  { value: "object", label: "Object" },
  { value: "reference", label: "Reference" },
  { value: "phone", label: "Phone Number" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "address", label: "Address" },
  { value: "currency", label: "Currency" },
  { value: "percentage", label: "Percentage" },
  { value: "richtext", label: "Rich Text" },
  { value: "file", label: "File" },
  { value: "image", label: "Image" },
  { value: "json", label: "JSON" },
];

// Type definitions
interface SchemaField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  searchable: boolean;
  defaultValue: string;
  options: string[];
  reference?: string;
}

interface SchemaEntity {
  name: string;
  description: string;
  fields: SchemaField[];
}

type SchemaData = Record<string, SchemaEntity>;

// Sample initial schema data
const initialSchemaData: SchemaData = {
  leads: {
    name: "Leads",
    description: "Lead information schema",
    fields: [
      {
        id: "1",
        name: "firstName",
        label: "First Name",
        type: "string",
        required: true,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "2",
        name: "lastName",
        label: "Last Name",
        type: "string",
        required: true,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "3",
        name: "email",
        label: "Email",
        type: "email",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "4",
        name: "phone",
        label: "Phone",
        type: "phone",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "5",
        name: "status",
        label: "Status",
        type: "enum",
        required: true,
        searchable: true,
        defaultValue: "new",
        options: ["new", "contacted", "qualified", "proposal", "closed"],
      },
      {
        id: "6",
        name: "source",
        label: "Source",
        type: "enum",
        required: false,
        searchable: true,
        defaultValue: "",
        options: ["website", "referral", "cold call", "social media"],
      },
      {
        id: "7",
        name: "address",
        label: "Address",
        type: "address",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "8",
        name: "notes",
        label: "Notes",
        type: "richtext",
        required: false,
        searchable: false,
        defaultValue: "",
        options: [],
      },
      {
        id: "9",
        name: "assignedTo",
        label: "Assigned To",
        type: "reference",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
        reference: "users",
      },
      {
        id: "10",
        name: "createdAt",
        label: "Created At",
        type: "date",
        required: true,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "11",
        name: "updatedAt",
        label: "Updated At",
        type: "date",
        required: true,
        searchable: true,
        defaultValue: "",
        options: [],
      },
    ],
  },
  contacts: {
    name: "Contacts",
    description: "Contact information schema",
    fields: [
      {
        id: "1",
        name: "firstName",
        label: "First Name",
        type: "string",
        required: true,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "2",
        name: "lastName",
        label: "Last Name",
        type: "string",
        required: true,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "3",
        name: "email",
        label: "Email",
        type: "email",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "4",
        name: "phone",
        label: "Phone",
        type: "phone",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "5",
        name: "company",
        label: "Company",
        type: "reference",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
        reference: "companies",
      },
      {
        id: "6",
        name: "jobTitle",
        label: "Job Title",
        type: "string",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
    ],
  },
  companies: {
    name: "Companies",
    description: "Company information schema",
    fields: [
      {
        id: "1",
        name: "name",
        label: "Company Name",
        type: "string",
        required: true,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "2",
        name: "website",
        label: "Website",
        type: "url",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "3",
        name: "industry",
        label: "Industry",
        type: "enum",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [
          "technology",
          "healthcare",
          "finance",
          "education",
          "retail",
          "manufacturing",
          "other",
        ],
      },
      {
        id: "4",
        name: "size",
        label: "Company Size",
        type: "enum",
        required: false,
        searchable: true,
        defaultValue: "",
        options: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
      },
      {
        id: "5",
        name: "address",
        label: "Address",
        type: "address",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
    ],
  },
  campaigns: {
    name: "Campaigns",
    description: "Campaign information schema",
    fields: [
      {
        id: "1",
        name: "name",
        label: "Campaign Name",
        type: "string",
        required: true,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "2",
        name: "description",
        label: "Description",
        type: "richtext",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "3",
        name: "type",
        label: "Campaign Type",
        type: "enum",
        required: true,
        searchable: true,
        defaultValue: "email",
        options: ["email", "sms", "call", "social", "multi-channel"],
      },
      {
        id: "4",
        name: "status",
        label: "Status",
        type: "enum",
        required: true,
        searchable: true,
        defaultValue: "draft",
        options: ["draft", "active", "paused", "completed", "archived"],
      },
      {
        id: "5",
        name: "startDate",
        label: "Start Date",
        type: "date",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "6",
        name: "endDate",
        label: "End Date",
        type: "date",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "7",
        name: "budget",
        label: "Budget",
        type: "currency",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "8",
        name: "targetAudience",
        label: "Target Audience",
        type: "reference",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
        reference: "segments",
      },
      {
        id: "9",
        name: "owner",
        label: "Campaign Owner",
        type: "reference",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
        reference: "users",
      },
      {
        id: "10",
        name: "metrics",
        label: "Metrics",
        type: "json",
        required: false,
        searchable: false,
        defaultValue: "",
        options: [],
      },
    ],
  },
  realEstateProperties: {
    name: "Real Estate Properties",
    description: "Property information schema for real estate API integration",
    fields: [
      {
        id: "1",
        name: "propertyId",
        label: "Property ID",
        type: "string",
        required: true,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "2",
        name: "address",
        label: "Address",
        type: "address",
        required: true,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "3",
        name: "propertyType",
        label: "Property Type",
        type: "enum",
        required: true,
        searchable: true,
        defaultValue: "residential",
        options: [
          "residential",
          "commercial",
          "industrial",
          "land",
          "multi-family",
        ],
      },
      {
        id: "4",
        name: "bedrooms",
        label: "Bedrooms",
        type: "number",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "5",
        name: "bathrooms",
        label: "Bathrooms",
        type: "number",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "6",
        name: "squareFeet",
        label: "Square Feet",
        type: "number",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "7",
        name: "lotSize",
        label: "Lot Size",
        type: "number",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "8",
        name: "yearBuilt",
        label: "Year Built",
        type: "number",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "9",
        name: "listingPrice",
        label: "Listing Price",
        type: "currency",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "10",
        name: "listingStatus",
        label: "Listing Status",
        type: "enum",
        required: false,
        searchable: true,
        defaultValue: "active",
        options: ["active", "pending", "sold", "off-market"],
      },
      {
        id: "11",
        name: "features",
        label: "Features",
        type: "array",
        required: false,
        searchable: false,
        defaultValue: "",
        options: [],
      },
      {
        id: "12",
        name: "images",
        label: "Images",
        type: "array",
        required: false,
        searchable: false,
        defaultValue: "",
        options: [],
      },
      {
        id: "13",
        name: "owner",
        label: "Owner",
        type: "reference",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
        reference: "contacts",
      },
      {
        id: "14",
        name: "agent",
        label: "Agent",
        type: "reference",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
        reference: "users",
      },
      {
        id: "15",
        name: "lastUpdated",
        label: "Last Updated",
        type: "date",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
    ],
  },
  zohoCRM: {
    name: "Zoho CRM",
    description: "Zoho CRM integration schema",
    fields: [
      {
        id: "1",
        name: "zohoId",
        label: "Zoho ID",
        type: "string",
        required: true,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "2",
        name: "module",
        label: "Zoho Module",
        type: "enum",
        required: true,
        searchable: true,
        defaultValue: "Leads",
        options: [
          "Leads",
          "Contacts",
          "Accounts",
          "Deals",
          "Tasks",
          "Campaigns",
        ],
      },
      {
        id: "3",
        name: "mappedFields",
        label: "Mapped Fields",
        type: "json",
        required: false,
        searchable: false,
        defaultValue: "",
        options: [],
      },
      {
        id: "4",
        name: "syncStatus",
        label: "Sync Status",
        type: "enum",
        required: false,
        searchable: true,
        defaultValue: "pending",
        options: ["pending", "synced", "failed", "skipped"],
      },
      {
        id: "5",
        name: "lastSyncDate",
        label: "Last Sync Date",
        type: "date",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "6",
        name: "syncDirection",
        label: "Sync Direction",
        type: "enum",
        required: false,
        searchable: true,
        defaultValue: "bidirectional",
        options: ["bidirectional", "to_zoho", "from_zoho"],
      },
      {
        id: "7",
        name: "localEntityId",
        label: "Local Entity ID",
        type: "string",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "8",
        name: "localEntityType",
        label: "Local Entity Type",
        type: "enum",
        required: false,
        searchable: true,
        defaultValue: "lead",
        options: ["lead", "contact", "company", "campaign"],
      },
      {
        id: "9",
        name: "customFields",
        label: "Custom Fields",
        type: "json",
        required: false,
        searchable: false,
        defaultValue: "",
        options: [],
      },
    ],
  },
  segments: {
    name: "Segments",
    description: "Audience segments for targeting",
    fields: [
      {
        id: "1",
        name: "name",
        label: "Segment Name",
        type: "string",
        required: true,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "2",
        name: "description",
        label: "Description",
        type: "string",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "3",
        name: "criteria",
        label: "Filter Criteria",
        type: "json",
        required: false,
        searchable: false,
        defaultValue: "",
        options: [],
      },
      {
        id: "4",
        name: "memberCount",
        label: "Member Count",
        type: "number",
        required: false,
        searchable: true,
        defaultValue: "0",
        options: [],
      },
      {
        id: "5",
        name: "createdBy",
        label: "Created By",
        type: "reference",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
        reference: "users",
      },
      {
        id: "6",
        name: "createdAt",
        label: "Created At",
        type: "date",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "7",
        name: "updatedAt",
        label: "Updated At",
        type: "date",
        required: false,
        searchable: true,
        defaultValue: "",
        options: [],
      },
      {
        id: "8",
        name: "isStatic",
        label: "Is Static",
        type: "boolean",
        required: false,
        searchable: true,
        defaultValue: "false",
        options: [],
      },
    ],
  },
};

export function SchemaManager() {
  const [activeTab, setActiveTab] = useState("leads");
  const [schemaData, setSchemaData] = useState(initialSchemaData);
  const [isAddFieldDialogOpen, setIsAddFieldDialogOpen] = useState(false);
  const [newField, setNewField] = useState<SchemaField>({
    id: "",
    name: "",
    label: "",
    type: "string",
    required: false,
    searchable: true,
    defaultValue: "",
    options: [] as string[],
    reference: "",
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [optionInput, setOptionInput] = useState("");
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonEditorContent, setJsonEditorContent] = useState("");

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Add a new field
  const handleAddField = () => {
    setIsEditMode(false);
    setNewField({
      id: Date.now().toString(),
      name: "",
      label: "",
      type: "string",
      required: false,
      searchable: true,
      defaultValue: "",
      options: [],
      reference: "",
    });
    setOptionInput("");
    setIsAddFieldDialogOpen(true);
  };

  // Edit an existing field
  const handleEditField = (field: SchemaField) => {
    setIsEditMode(true);
    setEditingFieldId(field.id);
    setNewField({ ...field });
    setOptionInput("");
    setIsAddFieldDialogOpen(true);
  };

  // Delete a field
  const handleDeleteField = (fieldId: string) => {
    const updatedFields = schemaData[activeTab].fields.filter(
      (field: SchemaField) => field.id !== fieldId,
    );
    setSchemaData({
      ...schemaData,
      [activeTab]: {
        ...schemaData[activeTab],
        fields: updatedFields,
      },
    });
  };

  // Save a field (add or update)
  const handleSaveField = () => {
    if (isEditMode) {
      // Update existing field
      const updatedFields = schemaData[activeTab].fields.map(
        (field: SchemaField) =>
          field.id === editingFieldId ? newField : field,
      );
      setSchemaData({
        ...schemaData,
        [activeTab]: {
          ...schemaData[activeTab],
          fields: updatedFields,
        },
      });
    } else {
      // Add new field
      setSchemaData({
        ...schemaData,
        [activeTab]: {
          ...schemaData[activeTab],
          fields: [...schemaData[activeTab].fields, newField],
        },
      });
    }
    setIsAddFieldDialogOpen(false);
  };

  // Add option to enum type
  const handleAddOption = () => {
    if (optionInput.trim()) {
      setNewField({
        ...newField,
        options: [...newField.options, optionInput.trim()],
      });
      setOptionInput("");
    }
  };

  // Remove option from enum type
  const handleRemoveOption = (option: string) => {
    setNewField({
      ...newField,
      options: newField.options.filter((opt: string) => opt !== option),
    });
  };

  // Handle field type change
  const handleFieldTypeChange = (type: string) => {
    setNewField({
      ...newField,
      type,
      options: type === "enum" ? newField.options : [],
      reference: type === "reference" ? newField.reference : "",
    });
  };

  // Export schema as JSON
  const handleExportSchema = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(schemaData, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "schema_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Import schema from JSON
  const handleImportSchema = () => {
    setShowJsonEditor(true);
    setJsonEditorContent(JSON.stringify(schemaData, null, 2));
  };

  // Apply imported JSON schema
  const handleApplyJsonSchema = () => {
    try {
      const parsedSchema = JSON.parse(jsonEditorContent);
      setSchemaData(parsedSchema);
      setShowJsonEditor(false);
    } catch (error) {
      alert("Invalid JSON format. Please check your input.");
    }
  };

  // Save schema to database (mock function)
  const handleSaveSchema = () => {
    // In a real implementation, this would save to your database
    console.log("Saving schema to database:", schemaData);
    alert("Schema saved successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Data Schema Manager
          </h2>
          <p className="text-muted-foreground">
            Define and manage your application's data structure
          </p>
        </div>
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleExportSchema}>
                  <FileJson className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export schema as JSON</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleImportSchema}>
                  <ArrowDownUp className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Import schema from JSON</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button onClick={handleSaveSchema}>
            <Save className="h-4 w-4 mr-2" />
            Save Schema
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid grid-cols-7">
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="realEstateProperties">Real Estate</TabsTrigger>
          <TabsTrigger value="zohoCRM">Zoho CRM</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
        </TabsList>

        {Object.keys(schemaData).map((entityKey) => (
          <TabsContent key={entityKey} value={entityKey} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{schemaData[entityKey].name}</CardTitle>
                    <CardDescription>
                      {schemaData[entityKey].description}
                    </CardDescription>
                  </div>
                  <Button onClick={handleAddField}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-2">
                    {schemaData[entityKey].fields.map((field) => (
                      <Card key={field.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{field.label}</h4>
                              <Badge variant="outline">{field.name}</Badge>
                              <Badge>
                                {fieldTypes.find((t) => t.value === field.type)
                                  ?.label || field.type}
                              </Badge>
                              {field.required && (
                                <Badge variant="secondary">Required</Badge>
                              )}
                              {field.searchable && (
                                <Badge variant="outline">Searchable</Badge>
                              )}
                            </div>

                            {field.type === "enum" &&
                              field.options.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {field.options.map((option) => (
                                    <Badge
                                      key={option}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {option}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                            {field.type === "reference" && field.reference && (
                              <div className="mt-1">
                                <Badge variant="outline" className="text-xs">
                                  References: {field.reference}
                                </Badge>
                              </div>
                            )}

                            {field.defaultValue && (
                              <div className="mt-1 text-sm text-muted-foreground">
                                Default: {field.defaultValue}
                              </div>
                            )}
                          </div>

                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditField(field)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDeleteField(field.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add/Edit Field Dialog */}
      <Dialog
        open={isAddFieldDialogOpen}
        onOpenChange={setIsAddFieldDialogOpen}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Field" : "Add New Field"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the properties of this field"
                : "Define a new field for your schema"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fieldName">Field Name (API)</Label>
                <Input
                  id="fieldName"
                  value={newField.name}
                  onChange={(e) =>
                    setNewField({ ...newField, name: e.target.value })
                  }
                  placeholder="e.g. firstName"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fieldLabel">Field Label (UI)</Label>
                <Input
                  id="fieldLabel"
                  value={newField.label}
                  onChange={(e) =>
                    setNewField({ ...newField, label: e.target.value })
                  }
                  placeholder="e.g. First Name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fieldType">Field Type</Label>
                <Select
                  value={newField.type}
                  onValueChange={handleFieldTypeChange}
                >
                  <SelectTrigger id="fieldType">
                    <SelectValue placeholder="Select field type" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultValue">Default Value</Label>
                <Input
                  id="defaultValue"
                  value={newField.defaultValue}
                  onChange={(e) =>
                    setNewField({ ...newField, defaultValue: e.target.value })
                  }
                  placeholder="Default value (optional)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="required"
                  checked={newField.required}
                  onCheckedChange={(checked) =>
                    setNewField({ ...newField, required: checked })
                  }
                />
                <Label htmlFor="required">Required Field</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="searchable"
                  checked={newField.searchable}
                  onCheckedChange={(checked) =>
                    setNewField({ ...newField, searchable: checked })
                  }
                />
                <Label htmlFor="searchable">Searchable</Label>
              </div>
            </div>

            {newField.type === "enum" && (
              <div className="space-y-4">
                <Label>Options</Label>
                <div className="flex space-x-2">
                  <Input
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    placeholder="Add option value"
                  />
                  <Button type="button" onClick={handleAddOption}>
                    Add
                  </Button>
                </div>

                {newField.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newField.options.map((option) => (
                      <Badge
                        key={option}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {option}
                        <button
                          onClick={() => handleRemoveOption(option)}
                          className="ml-1 rounded-full hover:bg-destructive/20"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {newField.type === "reference" && (
              <div className="space-y-2">
                <Label htmlFor="reference">Reference Entity</Label>
                <Select
                  value={newField.reference}
                  onValueChange={(value) =>
                    setNewField({ ...newField, reference: value })
                  }
                >
                  <SelectTrigger id="reference">
                    <SelectValue placeholder="Select referenced entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(schemaData).map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {schemaData[entity].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddFieldDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveField}>
              {isEditMode ? "Update Field" : "Add Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* JSON Editor Dialog */}
      <Dialog open={showJsonEditor} onOpenChange={setShowJsonEditor}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Import Schema from JSON</DialogTitle>
            <DialogDescription>Paste your schema JSON below</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <textarea
              className="w-full h-[400px] p-4 font-mono text-sm border rounded-md"
              value={jsonEditorContent}
              onChange={(e) => setJsonEditorContent(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJsonEditor(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyJsonSchema}>Apply Schema</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
