"use client";

import { FieldErrors } from "@/components/errors/field-errors";
import { Button } from "@/components/ui/button";
import { FormItem } from "@/components/ui/form/form-item";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalClose } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import {
  CreateEmailTemplateDto,
  createEmailTemplateSchema,
} from "@nextier/dto";
import { useCurrentTeam } from "@/features/team/team.context";
import { MessageTemplateType } from "@/graphql/types";
import { MessageTemplateVariables } from "./message-template-variables";
import { MessageTemplateFormProps } from "../types/message-template-form-props.type";
import { useWatch } from "react-hook-form";
import { useTemplateMutation } from "../hooks/use-template-mutation";
import { GenerateMessageField } from "./generate-message-field";

export const EmailMessageTemplateForm: React.FC<MessageTemplateFormProps> = ({
  onOpenChange,
  template,
}) => {
  const { handleSubmit, register, registerError, setValue, control } = useForm({
    resolver: zodResolver(createEmailTemplateSchema),
    defaultValues: {
      name: template?.name || "",
      data: !template?.data ? undefined : template.data,
    },
  });
  const { team } = useCurrentTeam();
  const emailBody = useWatch({ control, name: "data.body" });

  const [saveTemplate, { loading }] = useTemplateMutation(
    MessageTemplateType.EMAIL,
  );

  const handleInsertVariable = (variable: string) => {
    setValue("data.body", emailBody + variable);
  };

  const handleGenerated = (content: string) => {
    setValue("data.body", content);
  };

  const save = async (input: CreateEmailTemplateDto) => {
    try {
      await saveTemplate({ input, teamId: team.id, id: template?.id });
      onOpenChange?.(false);
    } catch (error) {
      //
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(save)}>
      <FormItem>
        <Label htmlFor="name">Name</Label>
        <Input {...register("name")} id="name" />
        <FieldErrors {...registerError("name")} />
      </FormItem>

      <FormItem>
        <Label htmlFor="subject">Subject</Label>
        <Input {...register("data.subject")} id="subject" />
        <FieldErrors {...registerError("data.subject")} />
      </FormItem>

      <GenerateMessageField
        type={MessageTemplateType.EMAIL}
        onGenerate={handleGenerated}
      />

      <FormItem>
        <Label htmlFor="body">Body</Label>
        <Textarea
          {...register("data.body")}
          id="body"
          className="field-sizing-content max-h-48"
        />
        <FieldErrors {...registerError("data.body")} />
      </FormItem>

      <FormItem className="lg:col-span-2">
        <Label>Variables</Label>
        <MessageTemplateVariables onInsert={handleInsertVariable} />
      </FormItem>

      <div className="flex justify-end gap-2">
        {/* This later might need to changebut right now this form are embedded via modal */}
        <ModalClose asChild>
          <Button variant="outline">Cancel</Button>
        </ModalClose>

        <Button type="submit" loading={loading}>
          Save
        </Button>
      </div>
    </form>
  );
};
