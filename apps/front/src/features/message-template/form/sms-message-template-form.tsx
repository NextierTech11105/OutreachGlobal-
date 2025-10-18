"use client";

import { FieldErrors } from "@/components/errors/field-errors";
import { Button } from "@/components/ui/button";
import { FormGrid } from "@/components/ui/form/form-grid";
import { FormItem } from "@/components/ui/form/form-item";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalClose } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import { CreateSmsTemplateDto, createSmsTemplateSchema } from "@nextier/dto";
import { useCurrentTeam } from "@/features/team/team.context";
import { MessageTemplateType } from "@/graphql/types";
import { MessageTemplateVariables } from "./message-template-variables";
import { MessageTemplateFormProps } from "../types/message-template-form-props.type";
import { useWatch } from "react-hook-form";
import { useTemplateMutation } from "../hooks/use-template-mutation";
import { GenerateMessageField } from "./generate-message-field";

export const SmsMessageTemplateForm: React.FC<MessageTemplateFormProps> = ({
  onOpenChange,
  template,
}) => {
  const { handleSubmit, register, registerError, setValue, control } = useForm({
    resolver: zodResolver(createSmsTemplateSchema),
  });
  const { team } = useCurrentTeam();
  const smsText = useWatch({ control, name: "data.text" });

  const [saveTemplate, { loading }] = useTemplateMutation(
    MessageTemplateType.SMS,
  );
  const handleInsertVariable = (variable: string) => {
    setValue("data.text", smsText + variable);
  };

  const handleGenerated = (content: string) => {
    setValue("data.text", content);
  };

  const save = async (input: CreateSmsTemplateDto) => {
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
        <Label htmlFor="text">Message Text</Label>
        <Textarea
          {...register("data.text")}
          id="text"
          className="field-sizing-content max-h-48"
        />
        <FieldErrors {...registerError("data.text")} />
      </FormItem>

      <GenerateMessageField
        type={MessageTemplateType.SMS}
        onGenerate={handleGenerated}
      />

      <FormItem>
        <Label>Variables</Label>
        <MessageTemplateVariables onInsert={handleInsertVariable} />
      </FormItem>

      <div className="flex justify-end gap-2">
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
