"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { z } from "@nextier/dto";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import { useAuthState, useAuthStore } from "@/hooks/use-auth";
import { FormItem } from "@/components/ui/form/form-item";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FieldErrors } from "@/components/errors/field-errors";
import { useMutation } from "@apollo/client";
import { UPDATE_PROFILE_MUTATION } from "../mutations/user.mutations";
import { toast } from "sonner";

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const user = useAuthState();
  const updateUser = useAuthStore((state) => state.update);

  const { handleSubmit, register, registerError, isDirty } = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: user.name },
  });

  const [updateProfile] = useMutation(UPDATE_PROFILE_MUTATION);

  const update = async (input: ProfileFormValues) => {
    setIsLoading(true);

    await updateProfile({ variables: { input } });
    updateUser({ name: input.name });
    setIsLoading(false);
    toast.success("profile updated");
  };

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(update)} className="space-y-8">
          <FormItem>
            <Label htmlFor="name">Full Name</Label>
            <Input {...register("name")} id="name" defaultValue={user.name} />
            <FieldErrors {...registerError("name")} />
          </FormItem>

          <Button type="submit" disabled={!isDirty || isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
