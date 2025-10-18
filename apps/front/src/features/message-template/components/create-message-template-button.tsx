"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { MessageTemplateModal } from "./message-template-modal";
import { MessageTemplateType } from "@/graphql/types";

interface Props {
  type: MessageTemplateType;
}

export const CreateMessageTemplateButton = ({ type }: Props) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2"
      >
        <PlusIcon className="size-4" />
        New Template
      </Button>

      <AnimatePresence>
        {modalOpen && (
          <MessageTemplateModal
            type={type}
            open={modalOpen}
            onOpenChange={setModalOpen}
          />
        )}
      </AnimatePresence>
    </>
  );
};
