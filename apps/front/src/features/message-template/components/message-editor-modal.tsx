"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, MessageSquare, Phone, Sparkles } from "lucide-react";
import { AiMessageGenerator } from "./ai-message-generator";
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
import { z } from "@nextier/dto";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import { FieldErrors } from "@/components/errors/field-errors";
import { useWatch } from "react-hook-form";
import { useCurrentTeam } from "@/features/team/team.context";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { MESSAGE_TEMPLATES_QUERY } from "../queries/message-template.queries";
import { MessageTemplateType } from "@/graphql/types";
import { FormItem } from "@/components/ui/form/form-item";
import {
  MessageEditorDto,
  messageEditorSchema,
} from "../dto/message-editor.dto";
import { GenerateMessageField } from "../form/generate-message-field";

interface Props extends ModalProps {
  onSaved?: (input: MessageEditorDto) => void | Promise<void>;
}

export function MessageEditorModal({ open, onOpenChange, onSaved }: Props) {
  const { handleSubmit, register, registerError, control, setValue } = useForm({
    resolver: zodResolver(messageEditorSchema),
    defaultValues: {
      name: "",
      type: "EMAIL",
      content: "",
      subject: "",
    },
  });

  const type = useWatch({ control, name: "type" });
  const { team } = useCurrentTeam();
  const [templates] = useConnectionQuery(MESSAGE_TEMPLATES_QUERY, {
    pick: "messageTemplates",
    variables: { teamId: team.id, types: [type as MessageTemplateType] },
  });

  const handleTypeChange = (value: "EMAIL" | "SMS" | "VOICE") => () => {
    setValue("type", value);
  };

  const handleTemplateChange = (value: string) => {
    const template = templates?.find((template) => template.id === value);
    if (template) {
      setValue("name", template.name);
      if (template.type === MessageTemplateType.EMAIL) {
        setValue("subject", template.data.subject);
        setValue("content", template.data.body);
      } else {
        setValue("content", template.data.text);
        setValue("subject", undefined);
      }
    }
  };

  const save = async (input: MessageEditorDto) => {
    await onSaved?.(input);
    onOpenChange?.(false);
  };

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Message Editor</ModalTitle>
            <ModalCloseX />
          </ModalHeader>

          <form onSubmit={handleSubmit(save)}>
            <ModalBody className="space-y-5">
              <FormItem>
                <Label htmlFor="message-name">Message Name</Label>
                <Input
                  id="message-name"
                  {...register("name")}
                  placeholder="e.g. Initial Outreach, Follow-up #1"
                />
                <FieldErrors {...registerError("name")} />
              </FormItem>

              <FormItem>
                <Label>Message Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={type === "EMAIL" ? "default" : "outline"}
                    className="w-full justify-center"
                    onClick={handleTypeChange("EMAIL")}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    <span>Email</span>
                  </Button>
                  <Button
                    type="button"
                    variant={type === "SMS" ? "default" : "outline"}
                    className="w-full justify-center"
                    onClick={handleTypeChange("SMS")}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    <span>SMS</span>
                  </Button>
                  <Button
                    type="button"
                    variant={type === "VOICE" ? "default" : "outline"}
                    className="w-full justify-center"
                    onClick={handleTypeChange("VOICE")}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    <span>Voice</span>
                  </Button>
                </div>
              </FormItem>

              <GenerateMessageField
                type={type as MessageTemplateType}
                onGenerate={(content) => setValue("content", content)}
              />

              {/* Template Selector */}
              <FormItem>
                <Label htmlFor="template-selector">Select Template</Label>
                <Select onValueChange={handleTemplateChange}>
                  <SelectTrigger id="template-selector">
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                    {!templates?.length && (
                      <SelectItem value="none" disabled>
                        No templates found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a pre-made template or create your own message below
                </p>
              </FormItem>

              {type === "EMAIL" && (
                <FormItem>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    {...register("subject")}
                    placeholder="Enter subject"
                    required
                  />
                  <FieldErrors {...registerError("subject")} />
                </FormItem>
              )}

              <FormItem>
                <Label htmlFor="data-text">Message Text</Label>
                <Textarea
                  id="data-text"
                  {...register("content")}
                  placeholder="Enter message text"
                  rows={4}
                />
                <FieldErrors {...registerError("content")} />
              </FormItem>
            </ModalBody>

            <ModalFooter className="flex justify-end gap-x-3">
              <ModalClose asChild>
                <Button variant="outline">Cancel</Button>
              </ModalClose>
              <Button type="submit">Save Message</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* <AiMessageGenerator
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        messageType={messageData.type}
        onGenerate={handleAiGenerated}
      /> */}
    </>
  );
}
