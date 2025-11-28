"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ZohoRecordMatcherProps {
  module: string;
  isConnected: boolean;
}

export function ZohoRecordMatcher({
  module,
  isConnected,
}: ZohoRecordMatcherProps) {
  const [matchStrategy, setMatchStrategy] = useState<string>("exact");
  const [primaryIdentifier, setPrimaryIdentifier] = useState<string>("");
  const [secondaryIdentifiers, setSecondaryIdentifiers] = useState<string[]>(
    [],
  );
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [createIfNotFound, setCreateIfNotFound] = useState<boolean>(true);
  const [updateIfFound, setUpdateIfFound] = useState<boolean>(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(80);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [matchExample, setMatchExample] = useState<any>(null);

  // Load fields and current matching configuration when module changes
  useEffect(() => {
    if (isConnected && module) {
      loadMatchingConfiguration();
    }
  }, [module, isConnected]);

  const loadMatchingConfiguration = async () => {
    setIsLoading(true);
    try {
      // Simulate API call to get fields and matching configuration
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Set available fields based on module
      let fields: string[] = [];
      let defaultPrimaryIdentifier = "";
      let defaultSecondaryIdentifiers: string[] = [];

      if (module === "Leads") {
        fields = [
          "id",
          "Email",
          "Phone",
          "First_Name",
          "Last_Name",
          "Lead_Source",
          "Company",
        ];
        defaultPrimaryIdentifier = "Email";
        defaultSecondaryIdentifiers = ["Phone"];
      } else if (module === "Contacts") {
        fields = [
          "id",
          "Email",
          "Phone",
          "First_Name",
          "Last_Name",
          "Account_Name",
        ];
        defaultPrimaryIdentifier = "Email";
        defaultSecondaryIdentifiers = ["Phone"];
      } else if (module === "Accounts") {
        fields = [
          "id",
          "Account_Name",
          "Website",
          "Phone",
          "Billing_Street",
          "Billing_City",
          "Billing_State",
        ];
        defaultPrimaryIdentifier = "Account_Name";
        defaultSecondaryIdentifiers = ["Website"];
      } else if (module === "Comm_Logs") {
        fields = [
          "id",
          "Zoho_ID",
          "Address",
          "City",
          "State",
          "Zip",
          "Tag_Status",
        ];
        defaultPrimaryIdentifier = "Zoho_ID";
        defaultSecondaryIdentifiers = ["Address", "Zip"];
      } else {
        fields = ["id", "Name", "Email", "Phone"];
        defaultPrimaryIdentifier = "id";
        defaultSecondaryIdentifiers = ["Email"];
      }

      setAvailableFields(fields);
      setPrimaryIdentifier(defaultPrimaryIdentifier);
      setSecondaryIdentifiers(defaultSecondaryIdentifiers);

      // Set example match data
      if (module === "Comm_Logs") {
        setMatchExample({
          local: {
            id: "12345",
            address: "123 Main St",
            city: "Bronx",
            state: "NY",
            zip: "10453",
            status: "Needs API Match",
          },
          zoho: {
            id: "6045534000120041111",
            Zoho_ID: "Z001",
            Address: "123 Main St",
            City: "Bronx",
            State: "NY",
            Zip: "10453",
            Tag_Status: "Needs API Match",
          },
          confidence: 95,
        });
      } else {
        setMatchExample({
          local: {
            id: "12345",
            email: "john.doe@example.com",
            phone: "555-123-4567",
            firstName: "John",
            lastName: "Doe",
          },
          zoho: {
            id: "6045534000000123456",
            Email: "john.doe@example.com",
            Phone: "555-123-4567",
            First_Name: "John",
            Last_Name: "Doe",
          },
          confidence: 95,
        });
      }
    } catch (error) {
      console.error("Error loading matching configuration:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecondaryIdentifierChange = (
    field: string,
    isSelected: boolean,
  ) => {
    if (isSelected) {
      setSecondaryIdentifiers([...secondaryIdentifiers, field]);
    } else {
      setSecondaryIdentifiers(secondaryIdentifiers.filter((f) => f !== field));
    }
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="text-center py-4">
          Loading matching configuration...
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Match Strategy</h3>
                    <RadioGroup
                      value={matchStrategy}
                      onValueChange={setMatchStrategy}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="exact" id="exact" />
                        <Label htmlFor="exact">Exact Match</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fuzzy" id="fuzzy" />
                        <Label htmlFor="fuzzy">Fuzzy Match</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="composite" id="composite" />
                        <Label htmlFor="composite">Composite Match</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      Primary Identifier
                    </h3>
                    <Select
                      value={primaryIdentifier}
                      onValueChange={setPrimaryIdentifier}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFields.map((field) => (
                          <SelectItem key={field} value={field}>
                            {field}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      The primary field used to match records between systems
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      Secondary Identifiers
                    </h3>
                    <div className="space-y-2">
                      {availableFields
                        .filter((field) => field !== primaryIdentifier)
                        .map((field) => (
                          <div
                            key={field}
                            className="flex items-center space-x-2"
                          >
                            <Switch
                              id={`field-${field}`}
                              checked={secondaryIdentifiers.includes(field)}
                              onCheckedChange={(checked) =>
                                handleSecondaryIdentifierChange(field, checked)
                              }
                            />
                            <Label htmlFor={`field-${field}`}>{field}</Label>
                          </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Additional fields used for matching when primary
                      identifier fails
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Match Behavior</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="create-if-not-found"
                          checked={createIfNotFound}
                          onCheckedChange={setCreateIfNotFound}
                        />
                        <Label htmlFor="create-if-not-found">
                          Create if not found
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="update-if-found"
                          checked={updateIfFound}
                          onCheckedChange={setUpdateIfFound}
                        />
                        <Label htmlFor="update-if-found">Update if found</Label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      Fuzzy Match Settings
                    </h3>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <Label htmlFor="confidence-threshold">
                            Confidence Threshold
                          </Label>
                          <Badge variant="outline">
                            {confidenceThreshold}%
                          </Badge>
                        </div>
                        <Input
                          id="confidence-threshold"
                          type="range"
                          min="50"
                          max="100"
                          value={confidenceThreshold}
                          onChange={(e) =>
                            setConfidenceThreshold(
                              Number.parseInt(e.target.value),
                            )
                          }
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Minimum confidence level required for a fuzzy match
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      Conflict Resolution
                    </h3>
                    <Select defaultValue="newer">
                      <SelectTrigger>
                        <SelectValue placeholder="Select strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newer">Newer Wins</SelectItem>
                        <SelectItem value="zoho">Zoho Wins</SelectItem>
                        <SelectItem value="local">Local Wins</SelectItem>
                        <SelectItem value="manual">
                          Manual Resolution
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      How to resolve conflicts when both systems have different
                      values
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {matchExample && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Match Example</h3>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Match Preview</AlertTitle>
                <AlertDescription>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <h4 className="text-xs font-semibold mb-1">
                        Local Record
                      </h4>
                      <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-40">
                        {JSON.stringify(matchExample.local, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold mb-1">
                        Zoho Record
                      </h4>
                      <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-40">
                        {JSON.stringify(matchExample.zoho, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center">
                    <span className="text-sm font-medium mr-2">
                      Match Confidence:
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        matchExample.confidence >= 90
                          ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : matchExample.confidence >= 70
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                      }
                    >
                      {matchExample.confidence}%
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </>
      )}
    </div>
  );
}
