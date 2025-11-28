"use client";

import {
  Modal,
  ModalBody,
  ModalCloseX,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalProps,
  ModalTitle,
} from "@/components/ui/modal";
import { type MessageTemplate, MessageTemplateType } from "@/graphql/types";
import { EmailMessageTemplateForm } from "../form/email-message-template-form";
import { SmsMessageTemplateForm } from "../form/sms-message-template-form";
import { VoiceMessageTemplateForm } from "../form/voice-message-template-form";

interface Props extends ModalProps {
  type: MessageTemplateType;
  template?: Pick<MessageTemplate, "name" | "data" | "id">;
}

export const MessageTemplateModal: React.FC<Props> = ({
  onOpenChange,
  type,
  template,
  ...props
}) => {
  return (
    <Modal {...props} onOpenChange={onOpenChange}>
      <ModalContent className="sm:max-w-screen-sm">
        <ModalHeader>
          <div className="flex flex-col gap-1">
            <ModalTitle>
              {!template ? "Create New" : "Edit"} Template
            </ModalTitle>
            <ModalDescription>
              Fill in the details to create a new message template
            </ModalDescription>
          </div>

          <ModalCloseX />
        </ModalHeader>
        <ModalBody>
          {type === MessageTemplateType.EMAIL && (
            <EmailMessageTemplateForm
              onOpenChange={onOpenChange}
              template={template}
            />
          )}
          {type === MessageTemplateType.SMS && (
            <SmsMessageTemplateForm
              onOpenChange={onOpenChange}
              template={template}
            />
          )}
          {type === MessageTemplateType.VOICE && (
            <VoiceMessageTemplateForm
              onOpenChange={onOpenChange}
              template={template}
            />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
