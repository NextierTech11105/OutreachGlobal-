import type { MessageTemplate } from "@/graphql/types";

export interface MessageTemplateFormProps {
  onOpenChange?: (value: boolean) => void;
  template?: Pick<MessageTemplate, "name" | "data" | "id">;
}
