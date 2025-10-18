"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCurrentTeam } from "@/features/team/team.context";
import { useApolloClient, useMutation } from "@apollo/client";
import { UPSERT_INTEGRATION_FIELDS_MUTATION } from "../mutations/integration-field.mutations";
import { useApiError } from "@/hooks/use-api-error";
import { toast } from "sonner";
import { Input, inputVariants } from "@/components/ui/input";
import { IntegrationFieldsQuery } from "@/graphql/types";
import { INTEGRATION_FIELDS_EVICT } from "../queries/integration-field.queries";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  integrationId: string;
  module: string;
  fields: { api_name: string; field_label: string }[];
  localFields: IntegrationFieldsQuery["integrationFields"];
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
  subField?: string | null;
}

const requireFields = ["firstName", "lastName"];

export function ZohoFieldMapper({
  module,
  fields,
  integrationId,
  localFields,
}: Props) {
  const { team } = useCurrentTeam();

  const [mappings, setMappings] = useState<FieldMapping[]>([...localFields]);

  const [upsertFields] = useMutation(UPSERT_INTEGRATION_FIELDS_MUTATION);
  const { showError } = useApiError();
  const [loading, setLoading] = useState(false);
  const { cache } = useApolloClient();
  const [fieldOpen, setFieldOpen] = useState(false);
  const [selectedSourceField, setSelectedSourceField] = useState<string | null>(
    null,
  );

  const isMappingValid = useMemo(() => {
    const requiredMappings = mappings.filter((mapping) =>
      requireFields.includes(mapping.sourceField),
    );
    return requiredMappings.every((mapping) => mapping.targetField !== "");
  }, [mappings]);

  const openFieldDialog = (sourceField: string) => {
    setSelectedSourceField(sourceField);
    setFieldOpen(true);
  };

  const handleFieldOpen = (value: boolean) => {
    setFieldOpen(value);
    if (!value) {
      setSelectedSourceField(null);
    }
  };

  const updateFieldMapping = useCallback(
    (sourceField: string, field: keyof FieldMapping, value: any) => {
      setMappings((prev) => {
        return prev.reduce((acc, mapping) => {
          if (mapping.sourceField === sourceField) {
            acc.push({ ...mapping, [field]: value });
          } else {
            acc.push(mapping);
          }
          return acc;
        }, [] as FieldMapping[]);
      });
    },
    [],
  );

  const handleSelectField = (value: string) => {
    if (selectedSourceField) {
      updateFieldMapping(selectedSourceField, "targetField", value);
      handleFieldOpen(false);
    }
  };

  const saveFieldMapping = async () => {
    setLoading(true);
    try {
      await upsertFields({
        variables: {
          teamId: team.id,
          integrationId: integrationId,
          moduleName: module,
          fields: mappings
            .filter((mapping) => mapping.targetField !== "")
            .map((mapping) => ({
              sourceField: mapping.sourceField,
              targetField: mapping.targetField,
              subField: mapping.subField || null,
            })),
        },
      });
      cache.evict(INTEGRATION_FIELDS_EVICT);
      toast.success("Field mapping saved");
    } catch (error) {
      showError(error, { gql: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-md">
        <Table>
          <colgroup>
            <col className="w-1/4" />
            <col className="w-1/3" />
            <col />
            <col className="w-[80px]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Local Field</TableHead>
              <TableHead>Zoho Field</TableHead>
              <TableHead>
                <div className="flex items-center gap-x-2">
                  <span>Zoho Subfield</span>

                  <Tooltip>
                    <TooltipTrigger>
                      <InfoIcon className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>if field is complex for example a lookup data type</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
              <TableHead>Required</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4">
                  No field mappings configured. Click "Add Mapping" to create
                  one.
                </TableCell>
              </TableRow>
            ) : (
              mappings.map((mapping) => (
                <TableRow key={mapping.sourceField}>
                  <TableCell>
                    <Input readOnly value={mapping.sourceField} />
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className={cn(
                        inputVariants(),
                        "items-center justify-between",
                        !mapping.targetField && "text-muted-foreground",
                      )}
                      onClick={() => openFieldDialog(mapping.sourceField)}
                    >
                      {mapping.targetField || "Select Field"}
                      <ChevronDownIcon className="size-4" />
                    </button>
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="input subfield"
                      value={mapping.subField || ""}
                      onChange={(e) =>
                        updateFieldMapping(
                          mapping.sourceField,
                          "subField",
                          e.target.value,
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        requireFields.includes(mapping.sourceField)
                          ? "destructive"
                          : "default"
                      }
                    >
                      {requireFields.includes(mapping.sourceField)
                        ? "Yes"
                        : "No"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isMappingValid && (
        <div className="text-sm text-muted-foreground">
          <div>
            <Badge variant="destructive" className="mr-1">
              Note
            </Badge>
            Please fill all required fields.
          </div>
        </div>
      )}

      <div className="flex justify-end gap-x-3">
        <Button
          disabled={!isMappingValid}
          loading={loading}
          onClick={saveFieldMapping}
        >
          Save Field Mapping
        </Button>
      </div>

      <CommandDialog
        open={fieldOpen}
        onOpenChange={handleFieldOpen}
        title="Type a field or search"
      >
        <CommandInput placeholder="Type a field or search" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            {fields.map((field) => (
              <CommandItem
                key={field.api_name}
                value={field.api_name}
                onSelect={handleSelectField}
                keywords={[field.api_name, field.field_label]}
                className="flex-col items-start gap-y-1"
              >
                <span className="font-medium">{field.field_label}</span>
                <span className="text-sm text-muted-foreground">
                  {field.api_name}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
