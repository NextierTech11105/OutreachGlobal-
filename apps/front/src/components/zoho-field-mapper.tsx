"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trash2,
  Plus,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ZohoFieldMapperProps {
  module: string;
  isConnected: boolean;
}

interface FieldMapping {
  id: string;
  sourceField: string;
  targetField: string;
  direction: "both" | "to_zoho" | "from_zoho";
  isRequired: boolean;
  transform: string;
}

export function ZohoFieldMapper({ module, isConnected }: ZohoFieldMapperProps) {
  const [localFields, setLocalFields] = useState<string[]>([]);
  const [zohoFields, setZohoFields] = useState<string[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMapping, setNewMapping] = useState<Omit<FieldMapping, "id">>({
    sourceField: "",
    targetField: "",
    direction: "both",
    isRequired: false,
    transform: "none",
  });
  const loadFieldsAndMappings = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API call to get fields
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock data for local fields
      setLocalFields([
        "id",
        "firstName",
        "lastName",
        "email",
        "phone",
        "address",
        "city",
        "state",
        "zipCode",
        "source",
        "status",
        "tags",
        "notes",
        "createdAt",
        "updatedAt",
      ]);

      // Mock data for Zoho fields based on module
      if (module === "Leads") {
        setZohoFields([
          "id",
          "First_Name",
          "Last_Name",
          "Email",
          "Phone",
          "Street",
          "City",
          "State",
          "Zip_Code",
          "Lead_Source",
          "Lead_Status",
          "Tag",
          "Description",
          "Created_Time",
          "Modified_Time",
        ]);
      } else if (module === "Contacts") {
        setZohoFields([
          "id",
          "First_Name",
          "Last_Name",
          "Email",
          "Phone",
          "Mailing_Street",
          "Mailing_City",
          "Mailing_State",
          "Mailing_Zip",
          "Contact_Source",
          "Contact_Status",
          "Tag",
          "Description",
          "Created_Time",
          "Modified_Time",
        ]);
      } else if (module === "Comm_Logs") {
        setZohoFields([
          "Zoho_ID",
          "Address",
          "City",
          "State",
          "Zip",
          "Tag_Status",
          "Created_Time",
          "Modified_Time",
        ]);
      } else {
        setZohoFields([
          "id",
          "Name",
          "Email",
          "Phone",
          "Description",
          "Created_Time",
          "Modified_Time",
        ]);
      }

      // Mock data for existing mappings
      let defaultMappings: FieldMapping[] = [];

      if (module === "Comm_Logs") {
        defaultMappings = [
          {
            id: "1",
            sourceField: "id",
            targetField: "Zoho_ID",
            direction: "both",
            isRequired: true,
            transform: "none",
          },
          {
            id: "2",
            sourceField: "address",
            targetField: "Address",
            direction: "both",
            isRequired: true,
            transform: "none",
          },
          {
            id: "3",
            sourceField: "city",
            targetField: "City",
            direction: "both",
            isRequired: false,
            transform: "none",
          },
          {
            id: "4",
            sourceField: "state",
            targetField: "State",
            direction: "both",
            isRequired: false,
            transform: "none",
          },
          {
            id: "5",
            sourceField: "zipCode",
            targetField: "Zip",
            direction: "both",
            isRequired: false,
            transform: "none",
          },
          {
            id: "6",
            sourceField: "status",
            targetField: "Tag_Status",
            direction: "both",
            isRequired: false,
            transform: "none",
          },
          {
            id: "7",
            sourceField: "createdAt",
            targetField: "Created_Time",
            direction: "to_zoho",
            isRequired: false,
            transform: "formatDate",
          },
        ];
      } else if (module === "Leads") {
        defaultMappings = [
          {
            id: "1",
            sourceField: "firstName",
            targetField: "First_Name",
            direction: "both",
            isRequired: true,
            transform: "none",
          },
          {
            id: "2",
            sourceField: "lastName",
            targetField: "Last_Name",
            direction: "both",
            isRequired: true,
            transform: "none",
          },
          {
            id: "3",
            sourceField: "email",
            targetField: "Email",
            direction: "both",
            isRequired: false,
            transform: "none",
          },
          {
            id: "4",
            sourceField: "phone",
            targetField: "Phone",
            direction: "both",
            isRequired: false,
            transform: "none",
          },
          {
            id: "5",
            sourceField: "createdAt",
            targetField: "Created_Time",
            direction: "to_zoho",
            isRequired: false,
            transform: "formatDate",
          },
        ];
      } else if (module === "Contacts") {
        defaultMappings = [
          {
            id: "1",
            sourceField: "firstName",
            targetField: "First_Name",
            direction: "both",
            isRequired: true,
            transform: "none",
          },
          {
            id: "2",
            sourceField: "lastName",
            targetField: "Last_Name",
            direction: "both",
            isRequired: true,
            transform: "none",
          },
          {
            id: "3",
            sourceField: "email",
            targetField: "Email",
            direction: "both",
            isRequired: false,
            transform: "none",
          },
          {
            id: "4",
            sourceField: "phone",
            targetField: "Phone",
            direction: "both",
            isRequired: false,
            transform: "none",
          },
          {
            id: "5",
            sourceField: "createdAt",
            targetField: "Created_Time",
            direction: "to_zoho",
            isRequired: false,
            transform: "formatDate",
          },
        ];
      } else {
        defaultMappings = [
          {
            id: "1",
            sourceField: "name",
            targetField: "Name",
            direction: "both",
            isRequired: true,
            transform: "none",
          },
          {
            id: "2",
            sourceField: "email",
            targetField: "Email",
            direction: "both",
            isRequired: false,
            transform: "none",
          },
          {
            id: "3",
            sourceField: "phone",
            targetField: "Phone",
            direction: "both",
            isRequired: false,
            transform: "none",
          },
          {
            id: "4",
            sourceField: "createdAt",
            targetField: "Created_Time",
            direction: "to_zoho",
            isRequired: false,
            transform: "formatDate",
          },
        ];
      }

      setMappings(defaultMappings);
    } catch (error) {
      console.error("Error loading fields and mappings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [module]);

  // Load fields and mappings when module changes
  useEffect(() => {
    if (isConnected && module) {
      loadFieldsAndMappings();
    }
  }, [module, isConnected, loadFieldsAndMappings]);
  const handleAddMapping = () => {
    setNewMapping({
      sourceField: localFields[0] || "",
      targetField: zohoFields[0] || "",
      direction: "both",
      isRequired: false,
      transform: "none",
    });
    setShowAddDialog(true);
  };

  const handleSaveNewMapping = () => {
    const mappingToAdd: FieldMapping = {
      id: `mapping_${Date.now()}`,
      ...newMapping,
    };

    setMappings([...mappings, mappingToAdd]);
    setShowAddDialog(false);
  };

  const handleRemoveMapping = (id: string) => {
    setMappings(mappings.filter((mapping) => mapping.id !== id));
  };

  const handleUpdateMapping = (
    id: string,
    field: keyof FieldMapping,
    value: any,
  ) => {
    setMappings(
      mappings.map((mapping) =>
        mapping.id === id ? { ...mapping, [field]: value } : mapping,
      ),
    );
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case "both":
        return <ArrowLeftRight className="h-4 w-4" />;
      case "to_zoho":
        return <ArrowRight className="h-4 w-4" />;
      case "from_zoho":
        return <ArrowLeft className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Field Mappings for {module}</h3>
        <Button
          size="sm"
          onClick={handleAddMapping}
          disabled={!isConnected || isLoading}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Mapping
        </Button>
      </div>

      {/* Always show the example data */}
      <div className="mt-4 p-4 bg-muted rounded-md">
        <h4 className="font-medium mb-2">Example Data</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Zoho_ID</th>
                <th className="text-left py-2 px-3">Address</th>
                <th className="text-left py-2 px-3">City</th>
                <th className="text-left py-2 px-3">State</th>
                <th className="text-left py-2 px-3">Zip</th>
                <th className="text-left py-2 px-3">Tag Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-3">Z001</td>
                <td className="py-2 px-3">123 Main St</td>
                <td className="py-2 px-3">Bronx</td>
                <td className="py-2 px-3">NY</td>
                <td className="py-2 px-3">10453</td>
                <td className="py-2 px-3">Needs API Match</td>
              </tr>
              <tr>
                <td className="py-2 px-3">Z002</td>
                <td className="py-2 px-3">456 Broadway</td>
                <td className="py-2 px-3">Brooklyn</td>
                <td className="py-2 px-3">NY</td>
                <td className="py-2 px-3">11211</td>
                <td className="py-2 px-3">Needs API Match</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Local Field</TableHead>
              <TableHead className="w-[100px]">Direction</TableHead>
              <TableHead className="w-[200px]">Zoho Field</TableHead>
              <TableHead className="w-[100px]">Required</TableHead>
              <TableHead className="w-[200px]">Transform</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Loading field mappings...
                </TableCell>
              </TableRow>
            ) : mappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No field mappings configured. Click "Add Mapping" to create
                  one.
                </TableCell>
              </TableRow>
            ) : (
              mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell>
                    <Select
                      value={mapping.sourceField}
                      onValueChange={(value) =>
                        handleUpdateMapping(mapping.id, "sourceField", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {localFields.map((field) => (
                          <SelectItem key={field} value={field}>
                            {field}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping.direction}
                      onValueChange={(value) =>
                        handleUpdateMapping(mapping.id, "direction", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {getDirectionIcon(mapping.direction)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">
                          <div className="flex items-center">
                            <ArrowLeftRight className="h-4 w-4 mr-2" />
                            <span>Both Ways</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="to_zoho">
                          <div className="flex items-center">
                            <ArrowRight className="h-4 w-4 mr-2" />
                            <span>To Zoho</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="from_zoho">
                          <div className="flex items-center">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            <span>From Zoho</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping.targetField}
                      onValueChange={(value) =>
                        handleUpdateMapping(mapping.id, "targetField", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {zohoFields.map((field) => (
                          <SelectItem key={field} value={field}>
                            {field}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Switch
                        checked={mapping.isRequired}
                        onCheckedChange={(checked) =>
                          handleUpdateMapping(mapping.id, "isRequired", checked)
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping.transform}
                      onValueChange={(value) =>
                        handleUpdateMapping(mapping.id, "transform", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="formatDate">Format Date</SelectItem>
                        <SelectItem value="formatPhone">
                          Format Phone
                        </SelectItem>
                        <SelectItem value="uppercase">Uppercase</SelectItem>
                        <SelectItem value="lowercase">Lowercase</SelectItem>
                        <SelectItem value="capitalize">Capitalize</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMapping(mapping.id)}
                      disabled={mapping.isRequired}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        <div>
          <Badge variant="outline" className="mr-1">
            Note
          </Badge>
          Required mappings cannot be removed. They are necessary for proper
          record matching.
        </div>
      </div>

      {/* Add Mapping Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Field Mapping</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sourceField" className="text-right">
                Local Field
              </Label>
              <div className="col-span-3">
                <Select
                  value={newMapping.sourceField}
                  onValueChange={(value) =>
                    setNewMapping({ ...newMapping, sourceField: value })
                  }
                >
                  <SelectTrigger id="sourceField">
                    <SelectValue placeholder="Select local field" />
                  </SelectTrigger>
                  <SelectContent>
                    {localFields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="direction" className="text-right">
                Direction
              </Label>
              <div className="col-span-3">
                <Select
                  value={newMapping.direction}
                  onValueChange={(value) =>
                    setNewMapping({ ...newMapping, direction: value as any })
                  }
                >
                  <SelectTrigger id="direction">
                    <SelectValue>
                      {getDirectionIcon(newMapping.direction)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">
                      <div className="flex items-center">
                        <ArrowLeftRight className="h-4 w-4 mr-2" />
                        <span>Both Ways</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="to_zoho">
                      <div className="flex items-center">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        <span>To Zoho</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="from_zoho">
                      <div className="flex items-center">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        <span>From Zoho</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="targetField" className="text-right">
                Zoho Field
              </Label>
              <div className="col-span-3">
                <Select
                  value={newMapping.targetField}
                  onValueChange={(value) =>
                    setNewMapping({ ...newMapping, targetField: value })
                  }
                >
                  <SelectTrigger id="targetField">
                    <SelectValue placeholder="Select Zoho field" />
                  </SelectTrigger>
                  <SelectContent>
                    {zohoFields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isRequired" className="text-right">
                Required
              </Label>
              <div className="col-span-3">
                <Switch
                  id="isRequired"
                  checked={newMapping.isRequired}
                  onCheckedChange={(checked) =>
                    setNewMapping({ ...newMapping, isRequired: checked })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transform" className="text-right">
                Transform
              </Label>
              <div className="col-span-3">
                <Select
                  value={newMapping.transform}
                  onValueChange={(value) =>
                    setNewMapping({ ...newMapping, transform: value })
                  }
                >
                  <SelectTrigger id="transform">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="formatDate">Format Date</SelectItem>
                    <SelectItem value="formatPhone">Format Phone</SelectItem>
                    <SelectItem value="uppercase">Uppercase</SelectItem>
                    <SelectItem value="lowercase">Lowercase</SelectItem>
                    <SelectItem value="capitalize">Capitalize</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewMapping}>Add Mapping</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
