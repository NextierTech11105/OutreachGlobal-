"use client";

import {
  Modal,
  ModalContent,
  ModalProps,
  ModalTitle,
} from "@/components/ui/modal";
import { MessageForm, MessageFormProps } from "./message-form";

interface Props
  extends ModalProps,
    Omit<MessageFormProps, "onCancel" | "onSend"> {}

export const MessageModal: React.FC<Props> = ({
  open,
  onOpenChange,
  ...props
}) => {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="sm:max-w-screen-md">
        <ModalTitle className="sr-only">Send Message</ModalTitle>
        <MessageForm
          {...props}
          onCancel={() => onOpenChange?.(false)}
          onSend={() => onOpenChange?.(false)}
        />
      </ModalContent>
    </Modal>
  );
};
