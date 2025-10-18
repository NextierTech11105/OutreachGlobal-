"use client";

import { FieldErrors } from "@/components/errors/field-errors";
import { Button } from "@/components/ui/button";
import { FormItem } from "@/components/ui/form/form-item";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/input/password-input";
import { Label } from "@/components/ui/label";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import { gql, useApolloClient, useMutation } from "@apollo/client";
import { CreateTeamAccountDto, createTeamAccountSchema } from "@nextier/dto";
import { useState } from "react";
import { CREATE_TEAM_ACCOUNT_MUTATION } from "../mutations/team-member.mutations";
import { $cookie } from "@/lib/cookie/client-cookie";
import { addMonths } from "date-fns";
import { useApiError } from "@/hooks/use-api-error";
import { TEAM_INVITATIONS_EVICT } from "../queries/team-member.queries";

interface Props {
  code: string;
  email: string;
}

export const TeamRegistrationForm = ({ code, email }: Props) => {
  const { handleSubmit, register, registerError } = useForm({
    resolver: zodResolver(createTeamAccountSchema),
    defaultValues: {
      name: "",
      password: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [createTeamAccount] = useMutation(CREATE_TEAM_ACCOUNT_MUTATION);
  const { showError } = useApiError();
  const { cache } = useApolloClient();

  const createAccount = async (input: CreateTeamAccountDto) => {
    setLoading(true);
    try {
      const { data } = await createTeamAccount({
        variables: {
          code,
          input,
        },
      });

      if (data?.createTeamAccount) {
        const { token, team } = data.createTeamAccount;
        cache.evict(TEAM_INVITATIONS_EVICT);
        $cookie.set("session", token, {
          expires: addMonths(new Date(), 10),
        });
        location.href = `/t/${team.slug}`;
      }
    } catch (error) {
      showError(error, { gql: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(createAccount)}>
      <FormItem>
        <Label htmlFor="name">Full Name</Label>
        <Input {...register("name")} id="name" />
        <FieldErrors {...registerError("name")} />
      </FormItem>

      <FormItem>
        <Label htmlFor="email">Email</Label>
        <Input type="email" readOnly id="email" value={email} />
      </FormItem>

      <FormItem>
        <Label htmlFor="password">Password</Label>
        <PasswordInput {...register("password")} id="password" />
        <FieldErrors {...registerError("password")} />
      </FormItem>

      <Button type="submit" className="w-full" loading={loading}>
        Create Account
      </Button>
    </form>
  );
};
