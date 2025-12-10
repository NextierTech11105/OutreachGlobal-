"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalCloseX,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalProps,
  ModalTitle,
} from "@/components/ui/modal";
import { FieldErrors } from "@/components/errors/field-errors";
import { FormItem } from "@/components/ui/form/form-item";
import { Controller, useWatch } from "react-hook-form";
import { useApolloClient, useMutation } from "@apollo/client";
import { useCurrentTeam } from "@/features/team/team.context";
import { useApiError } from "@/hooks/use-api-error";
import { toast } from "sonner";
import { SaveLeadPresetDto, saveLeadPresetSchema } from "@nextier/dto";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import {
  CREATE_IMPORT_LEAD_PRESET_MUTATION,
  CreateImportLeadPreset,
} from "../mutations/import-lead-preset.mutations";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { NativeCheckbox } from "@/components/ui/native-checkbox";

// Important titles from the Python script
const importantTitles = [
  "DIRECTOR",
  "MARKETING EXECUTIVE",
  "CEO",
  "OWNER",
  "VICE PRESIDENT",
  "CHIEF EXECUTIVE OFFICER",
  "PRESIDENT",
  "EXECUTIVE VICE PRESIDENT",
  "CHIEF FINANCIAL OFFICER",
  "CHIEF OPERATING OFFICER",
  "CIO/CTO",
  "MANAGER",
  "PARTNER",
  "OPERATIONS",
  "BUSINESS DEVELOPMENT",
  "CHAIRMAN",
  "EXECUTIVE OFFICER",
  "HUMAN RESOURCES",
  "INFORMATION TECHNOLOGY",
];

// Common email providers from the Python script
const commonProviders = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "comcast.net",
  "live.com",
  "office365.com",
  "protonmail.com",
  "zoho.com",
];

// Common email prefixes from the Python script
const commonPrefixes = [
  "info@",
  "sales@",
  "support@",
  "webmaster@",
  "contact@",
  "hello@",
  "admin@",
  "marketing@",
  "service@",
  "help@",
];

interface Props extends ModalProps {
  onSaved?: (preset: CreateImportLeadPreset) => void;
}

export const ImportLeadPresetModal: React.FC<Props> = ({
  onSaved,
  ...props
}) => {
  const { handleSubmit, register, registerError, control, setValue } = useForm({
    resolver: zodResolver(saveLeadPresetSchema),
    defaultValues: {
      name: "",
      config: {
        respectTitles: true,
        priorityPrefixes: ["info@", "sales@"],
        onePerTitle: false,
        selectedTitles: [],
        emailsPerDomain: 1,
        strategy: "ONE_PER_DOMAIN",
        excludedDomains: [],
      },
    },
  });

  const [
    respectTitles,
    excludedDomains,
    priorityPrefixes,
    emailsPerDomain,
    strategy,
  ] = useWatch({
    control,
    name: [
      "config.respectTitles",
      "config.excludedDomains",
      "config.priorityPrefixes",
      "config.emailsPerDomain",
      "config.strategy",
    ],
  });
  const { team, teamId, isTeamReady } = useCurrentTeam();

  const [customDomain, setCustomDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [createPreset] = useMutation(CREATE_IMPORT_LEAD_PRESET_MUTATION);
  const { cache } = useApolloClient();
  const { showError } = useApiError();

  if (!isTeamReady) {
    return null;
  }

  // Handle domain exclusion
  const handleDomainExclusion = (domain: string) => {
    setValue(
      "config.excludedDomains",
      excludedDomains?.filter((d) => d !== domain),
    );
  };

  // Add custom domain to excluded list
  const addCustomDomain = () => {
    if (customDomain && !excludedDomains?.includes(customDomain)) {
      setValue("config.excludedDomains", [
        ...(excludedDomains || []),
        customDomain,
      ]);
    }
    setCustomDomain("");
  };

  const savePreset = async (input: SaveLeadPresetDto) => {
    setLoading(true);
    try {
      const { data } = await createPreset({
        variables: {
          teamId,
          input,
        },
      });

      if (data?.createImportLeadPreset.preset) {
        onSaved?.(data.createImportLeadPreset.preset);
      }

      cache.evict({
        id: "ROOT_QUERY",
        fieldName: "importLeadPresets",
      });

      toast.success("Preset saved");
    } catch (error) {
      showError(error, { gql: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal {...props}>
      <ModalContent widthClass="w-full lg:max-w-4xl">
        <ModalHeader className="flex justify-between items-center">
          <ModalTitle>Create Email Deduplication Settings</ModalTitle>
          <ModalCloseX />
        </ModalHeader>
        <form onSubmit={handleSubmit(savePreset)}>
          <ModalBody>
            <FormItem className="mb-4">
              <Label htmlFor="name">Preset Name</Label>
              <Input {...register("name")} id="name" />
              <FieldErrors {...registerError("name")} />
            </FormItem>

            <Tabs defaultValue="titles" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="titles">Job Titles</TabsTrigger>
                <TabsTrigger value="domains">Domains</TabsTrigger>
                <TabsTrigger value="strategy">Skip</TabsTrigger>
              </TabsList>

              {/* Job Titles Tab */}
              <TabsContent value="titles">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Controller
                      control={control}
                      name="config.respectTitles"
                      render={({ field }) => (
                        <Switch
                          id="respect-titles"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="respect-titles">
                      Respect important titles (allow multiple emails per domain
                      for these titles)
                    </Label>
                  </div>

                  <div className="mt-4">
                    <Label className="text-sm font-medium">
                      Select important titles to include:
                    </Label>
                    <ScrollArea className="h-64 border rounded-md mt-2 p-4">
                      <div className="grid grid-cols-2 gap-2">
                        {importantTitles.map((title) => (
                          <div
                            key={title}
                            className="flex items-center space-x-2"
                          >
                            <NativeCheckbox
                              {...register("config.selectedTitles")}
                              value={title}
                              id={`title-${title}`}
                              disabled={!respectTitles}
                            />
                            <Label
                              htmlFor={`title-${title}`}
                              className={
                                !respectTitles ? "text-muted-foreground" : ""
                              }
                            >
                              {title}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="flex items-center space-x-2 mt-4">
                    <Controller
                      control={control}
                      name="config.onePerTitle"
                      render={({ field }) => (
                        <Switch
                          id="one-per-title"
                          checked={field.value}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true)
                          }
                          disabled={!respectTitles}
                        />
                      )}
                    />
                    <Label
                      htmlFor="one-per-title"
                      className={!respectTitles ? "text-muted-foreground" : ""}
                    >
                      Keep only one contact per important title per domain
                    </Label>
                  </div>
                </div>
              </TabsContent>

              {/* Domains Tab */}
              <TabsContent value="domains">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="emails-per-domain">
                      Maximum emails per domain:
                    </Label>
                    <div className="flex items-center space-x-4 mt-2">
                      <Controller
                        control={control}
                        name="config.emailsPerDomain"
                        render={({ field }) => (
                          <Slider
                            id="emails-per-domain"
                            min={1}
                            max={10}
                            step={1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="w-64"
                          />
                        )}
                      />
                      <span className="w-8 text-center">{emailsPerDomain}</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Label className="text-sm font-medium">
                      Exclude common email providers:
                    </Label>
                    <ScrollArea className="h-40 border rounded-md mt-2 p-4">
                      <div className="grid grid-cols-2 gap-2">
                        {commonProviders.map((domain) => (
                          <div
                            key={domain}
                            className="flex items-center space-x-2"
                          >
                            <NativeCheckbox
                              id={`domain-${domain}`}
                              {...register("config.excludedDomains")}
                              value={domain}
                            />
                            <Label htmlFor={`domain-${domain}`}>{domain}</Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="custom-domain">
                      Add custom domain to exclude:
                    </Label>
                    <div className="flex space-x-2 mt-2">
                      <Input
                        id="custom-domain"
                        placeholder="example.com"
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                      />
                      <Button
                        onClick={addCustomDomain}
                        disabled={!customDomain}
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {(excludedDomains?.length || 0) > 0 && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium">
                        Currently excluded domains:
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {excludedDomains?.map((domain) => (
                          <Badge
                            key={domain}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {domain}
                            <button
                              onClick={() => handleDomainExclusion(domain)}
                              className="ml-1 text-xs hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Skip Tab */}
              <TabsContent value="strategy">
                <div className="space-y-6">
                  <div>
                    <Label
                      htmlFor="skip-strategy"
                      className="text-sm font-medium"
                    >
                      Email skip strategy:
                    </Label>
                    <Select
                      value={strategy}
                      onValueChange={(value) =>
                        setValue("config.strategy", value)
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select a skip strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ONE_PER_DOMAIN">
                          Skip multiple emails per business domain
                        </SelectItem>
                        <SelectItem value="PRIORITY_PREFIX">
                          Skip emails with specific prefixes
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-2">
                      {strategy === "ONE_PER_DOMAIN" &&
                        "Skips additional emails from the same business domain, keeping only one. Common providers are kept untouched."}
                      {strategy === "PRIORITY_PREFIX" &&
                        "Skips emails with the selected prefixes. Use this to avoid importing generic emails."}
                    </p>
                  </div>

                  {(strategy === "ONE_PER_DOMAIN" ||
                    strategy === "PRIORITY_PREFIX") && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium">
                        {strategy === "PRIORITY_PREFIX"
                          ? "Select email prefixes to SKIP (these emails will NOT be imported):"
                          : "Select priority prefixes to keep (others will be skipped):"}
                      </Label>
                      <ScrollArea className="h-40 border rounded-md mt-2 p-4">
                        <div className="space-y-2">
                          {commonPrefixes.map((prefix) => (
                            <div
                              key={prefix}
                              className="flex items-center space-x-2"
                            >
                              <NativeCheckbox
                                {...register("config.priorityPrefixes")}
                                id={`prefix-${prefix}`}
                                value={prefix}
                              />
                              <Label htmlFor={`prefix-${prefix}`}>
                                {prefix}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      {!!priorityPrefixes?.length && (
                        <div className="mt-4">
                          <Label className="text-sm font-medium">
                            {strategy === "PRIORITY_PREFIX"
                              ? "Emails with these prefixes will be SKIPPED:"
                              : "Current priority order (will be kept):"}
                          </Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {priorityPrefixes.map((prefix, index) => (
                              <Badge
                                key={prefix}
                                variant={
                                  strategy === "PRIORITY_PREFIX"
                                    ? "destructive"
                                    : "outline"
                                }
                              >
                                {strategy === "PRIORITY_PREFIX"
                                  ? `Skip: ${prefix}`
                                  : `${index + 1}. ${prefix}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </ModalBody>
          <ModalFooter className="flex justify-end gap-x-3">
            <ModalClose asChild>
              <Button variant="outline">Cancel</Button>
            </ModalClose>
            <Button type="submit" loading={loading}>
              Save Preset
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
