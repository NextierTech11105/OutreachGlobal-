"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormItem } from "@/components/ui/form/form-item";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UpsertBusinessListSettingsDto,
  upsertBusinessListSettingsSchema,
} from "@nextier/dto";
import { useCurrentTeam } from "../team.context";
import { useSingleQuery } from "@/graphql/hooks/use-single-query";
import {
  BUSINESS_LIST_SETTINGS_EVICT,
  BUSINESS_LIST_SETTINGS_QUERY,
} from "../queries/business-list-settings.query";
import { Loading } from "@/components/ui/loading";
import { FieldErrors } from "@/components/errors/field-errors";
import { useState } from "react";
import { useApiError } from "@/hooks/use-api-error";
import { useApolloClient, useMutation } from "@apollo/client";
import { UPSERT_BUSINESS_LIST_SETTINGS } from "../mutations/business-list-settings.mutations";
import { toast } from "sonner";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import { useForm } from "@/lib/hook-form/hooks/use-form";

interface ComponentFormProps {
  teamId: string;
  defaultValues?: {
    businessListApiToken?: string | null;
  };
}

const ComponentForm = ({ defaultValues, teamId }: ComponentFormProps) => {
  const { handleSubmit, register, registerError } = useForm({
    resolver: zodResolver(upsertBusinessListSettingsSchema),
    defaultValues: {
      businessListApiToken: defaultValues?.businessListApiToken || "",
    },
  });

  const [loading, setLoading] = useState(false);
  const { showError } = useApiError();
  const [upsert] = useMutation(UPSERT_BUSINESS_LIST_SETTINGS);
  const { cache } = useApolloClient();

  const save = async (input: UpsertBusinessListSettingsDto) => {
    setLoading(true);
    try {
      await upsert({
        variables: { teamId, input },
      });
      cache.evict(BUSINESS_LIST_SETTINGS_EVICT);

      toast.success("settings updated");
    } catch (error) {
      showError(error, { gql: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(save)}>
      <Card>
        <CardHeader>
          <CardTitle>Business List Settings</CardTitle>
          <CardDescription>
            Configure your business list settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormItem>
            <Label htmlFor="businessListApiToken">API Token</Label>
            <Input
              {...register("businessListApiToken")}
              id="businessListApiToken"
            />
            <FieldErrors {...registerError("businessListApiToken")} />
          </FormItem>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="submit" loading={loading}>
            Save
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export const BusinessListSettings: React.FC = () => {
  const { team } = useCurrentTeam();
  const [settings, { loading, error }] = useSingleQuery(
    BUSINESS_LIST_SETTINGS_QUERY,
    {
      pick: "businessListSettings",
      variables: { teamId: team.id },
    },
  );

  if (loading || !settings) {
    return error ? <p>Error</p> : <Loading />;
  }

  return <ComponentForm teamId={team.id} defaultValues={settings} />;
};
