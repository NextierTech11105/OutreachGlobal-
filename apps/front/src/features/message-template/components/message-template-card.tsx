"use client";

import { MessageTemplateType } from "@/graphql/types";
import {
  MESSAGE_TEMPLATES_EVICT,
  MessageTemplateNode,
} from "../queries/message-template.queries";
import {
  CopyIcon,
  MailIcon,
  MessageSquareIcon,
  PencilIcon,
  PhoneIcon,
  Trash2Icon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "date-fns";
import { useModalAlert } from "@/components/ui/modal";
import { useApiError } from "@/hooks/use-api-error";
import { useCurrentTeam } from "@/features/team/team.context";
import { useApolloClient, useMutation } from "@apollo/client";
import { DELETE_MESSAGE_TEMPLATE_MUTATION } from "../mutations/message-template.mutations";
import { toast } from "sonner";
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { MessageTemplateModal } from "./message-template-modal";

interface Props {
  template: MessageTemplateNode;
}

const getTemplateIcon = (type: string) => {
  switch (type) {
    case MessageTemplateType.EMAIL:
      return <MailIcon className="size-4" />;
    case MessageTemplateType.SMS:
      return <MessageSquareIcon className="size-4" />;
    case MessageTemplateType.VOICE:
      return <PhoneIcon className="size-4" />;
    default:
      return null;
  }
};

const getTemplatePreview = (template: MessageTemplateNode) => {
  if (template.type === MessageTemplateType.EMAIL) {
    return template.data.body.substring(0, 100) + "...";
  } else {
    return template.data.text.substring(0, 100) + "...";
  }
};

export function MessageTemplateCard({ template }: Props) {
  const { showAlert } = useModalAlert();
  const { showError } = useApiError();
  const { team } = useCurrentTeam();
  const [deleteTemplate] = useMutation(DELETE_MESSAGE_TEMPLATE_MUTATION);
  const { cache } = useApolloClient();
  const [editOpen, setEditOpen] = useState(false);

  const confirmDelete = () => {
    showAlert({
      title: `Delete ${template.name}`,
      description: "Are you sure you want to delete this message template?",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await deleteTemplate({
            variables: { teamId: team.id, id: template.id },
          });

          toast.success("Message template deleted");
          cache.evict(MESSAGE_TEMPLATES_EVICT);
        } catch (error) {
          showError(error, { gql: true });
        }
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-base">{template.name}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              {getTemplateIcon(template.type)}
              <span className="capitalize">{template.type}</span>
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditOpen(true)}
            >
              <PencilIcon className="size-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={confirmDelete}
              className="text-destructive hover:text-destructive/80"
            >
              <Trash2Icon className="size-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {template.type === MessageTemplateType.EMAIL &&
          template.data.subject && (
            <p className="text-sm font-medium mb-1">
              Subject: {template.data.subject}
            </p>
          )}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {getTemplatePreview(template)}
        </p>
      </CardContent>
      <CardFooter className="pt-1">
        <p className="text-xs text-muted-foreground">
          Updated {formatDate(template.updatedAt || template.createdAt, "PP")}
        </p>
      </CardFooter>

      <AnimatePresence>
        {editOpen && (
          <MessageTemplateModal
            open={editOpen}
            onOpenChange={setEditOpen}
            type={template.type}
            template={template}
          />
        )}
      </AnimatePresence>
    </Card>
  );
}
