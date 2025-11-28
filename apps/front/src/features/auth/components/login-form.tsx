"use client";

import { Button } from "@/components/ui/button";
import { FormItem } from "@/components/ui/form/form-item";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/input/password-input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { LoginDto, loginSchema } from "@nextier/dto";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { FieldErrors } from "@/components/errors/field-errors";
import { useMutation } from "@apollo/client";
import { LOGIN_MUTATION } from "@/features/user/mutations/user.mutations";
import { $cookie } from "@/lib/cookie/client-cookie";
import { addMonths } from "date-fns";
import { useApiError } from "@/hooks/use-api-error";

export const LoginForm: React.FC = () => {
  const { handleSubmit, register, registerError } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [login] = useMutation(LOGIN_MUTATION);
  const { showError } = useApiError();

  const handleLogin = async (input: LoginDto) => {
    setLoading(true);
    try {
      const { data } = await login({ variables: { input } });
      if (!data?.login?.token) {
        throw new Error("Failed to login");
      }

      $cookie.set("session", data.login.token, {
        expires: addMonths(new Date(), 10),
      });
      location.href = "/";
    } catch (error) {
      showError(error, { gql: true });
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(handleLogin)}>
      <FormItem>
        <Label htmlFor="email">Email</Label>
        <Input
          {...register("email")}
          id="email"
          type="email"
          placeholder="steve@apple.com"
        />
        <FieldErrors {...registerError("email")} />
      </FormItem>

      <FormItem>
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          {...register("password")}
          id="password"
          placeholder="••••••••"
        />
        <FieldErrors {...registerError("password")} />
      </FormItem>

      {/* <div className="flex items-center justify-between">
        <Link
          href="/auth/forgot-password"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          Forgot your password?
        </Link>
      </div> */}

      <Button type="submit" className="w-full" loading={loading}>
        Sign In
      </Button>
    </form>
  );
};
