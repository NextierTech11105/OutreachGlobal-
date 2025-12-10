"use client";

import { Button } from "@/components/ui/button";
import { useMutation } from "@apollo/client";
import { ExternalLinkIcon } from "lucide-react";
import { CONNECT_INTEGRATION_MUTATION } from "../mutations/integration.mutations";
import { useCurrentTeam } from "@/features/team/team.context";
import { toast } from "sonner";
import { useSingleQuery } from "@/graphql/hooks/use-single-query";
import { INTEGRATION_DETAILS_QUERY } from "../queries/integration.queries";
import { MODULE_METADATA_QUERY } from "../queries/module-metadata.queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { ZohoSyncHistoryList } from "./zoho-sync-history-list";
import { Loading } from "@/components/ui/loading";
import { ZohoFieldMapper } from "./zoho-field-mapper";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INTEGRATION_FIELDS_QUERY } from "../queries/integration-field.queries";

const availableModules = ["Leads", "Contacts", "Accounts", "Comm_Logs"];

export const ZohoIntegration = () => {
  const [connect, { loading }] = useMutation(CONNECT_INTEGRATION_MUTATION);
  const { teamId, isTeamReady } = useCurrentTeam();

  const [integration, { loading: integrationLoading }] = useSingleQuery(
    INTEGRATION_DETAILS_QUERY,
    {
      pick: "integration",
      variables: {
        teamId,
        id: "zoho",
      },
      skip: !isTeamReady,
    },
  );

  const [activeTab, setActiveTab] = useState("history");
  const [selectedModule, setSelectedModule] = useState("Comm_Logs");

  const [moduleMetadata, { loading: moduleLoading }] = useSingleQuery(
    MODULE_METADATA_QUERY,
    {
      pick: "moduleMetadata",
      variables: {
        teamId,
        provider: "zoho",
        name: selectedModule,
      },
      skip: !isTeamReady || !integration || integration?.isExpired,
    },
  );

  const [localFields, { loading: localFieldsLoading }] = useSingleQuery(
    INTEGRATION_FIELDS_QUERY,
    {
      pick: "integrationFields",
      variables: {
        teamId,
        integrationId: integration?.id as string,
        moduleName: selectedModule,
      },
      skip: !isTeamReady || !integration?.id,
      fetchPolicy: "cache-and-network",
    },
  );

  const handleConnect = async () => {
    if (!isTeamReady) return;
    const { data } = await connect({
      variables: { teamId, provider: "zoho" },
    });

    if (data?.connectIntegration.uri) {
      location.href = data.connectIntegration.uri;
    } else {
      toast.error("Failed to connect to Zoho");
    }
  };

  if (integrationLoading || !integration) {
    return integrationLoading ? (
      <Loading />
    ) : (
      <div>
        <Button loading={loading} onClick={handleConnect}>
          <ExternalLinkIcon />
          Connect To Zoho
        </Button>
      </div>
    );
  }

  if (integration.isExpired) {
    return (
      <div>
        <div className="mb-4">
          <p className="text-sm text-destructive">
            Your Zoho connection is expired, click Reconnect
          </p>
        </div>

        <Button loading={loading} onClick={handleConnect}>
          <ExternalLinkIcon />
          Reconnect to Zoho
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold">Zoho CRM Integration</h3>
          <p className="text-muted-foreground">
            Configure and manage your Zoho CRM integration
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="history">Sync History</TabsTrigger>
          <TabsTrigger value="field-mapping">Field Mapping</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <ZohoSyncHistoryList integrationId={integration.id} />
        </TabsContent>
        <TabsContent value="field-mapping">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Selected Module</Label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {availableModules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {moduleLoading || localFieldsLoading ? (
              <Loading />
            ) : (
              <ZohoFieldMapper
                module={selectedModule}
                fields={moduleMetadata?.fields || []}
                localFields={localFields || []}
                integrationId={integration.id}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
