"use client";

import { useReducer, useState } from "react";
import {
  ModalContext,
  modalReducer,
  modalReducerInitialState,
} from "./modal.context";
import { AnimatePresence } from "motion/react";
import { Modal, ModalClose } from "./modal";
import { ModalContent } from "./modal-content";
import { ModalBody } from "./modal-body";
import { ModalFooter } from "./modal-footer";
import { ModalTitle } from "./modal-title";
import { ModalHeader } from "./modal-header";
import { ModalCloseX } from "./modal-close-x";
import { CFC } from "@/types/element.type";
import { Button } from "../button";

interface Props {
  defaultCancelText?: string;
}

export const ModalProvider: CFC<Props> = ({
  children,
  defaultCancelText = "Cancel",
}) => {
  const [{ onConfirm, ...state }, dispatch] = useReducer(modalReducer, {
    ...modalReducerInitialState,
    cancelText: defaultCancelText,
  });

  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);

    try {
      await onConfirm?.();
      dispatch({
        ...modalReducerInitialState,
        cancelText: defaultCancelText,
      });
    } catch (error) {
      return Promise.reject(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalContext.Provider value={[state, dispatch]}>
      <AnimatePresence>
        {state.open && (
          <Modal
            open={state.open}
            onOpenChange={(val) => dispatch({ open: val })}
          >
            <ModalContent zIndex={101}>
              <ModalHeader className="border-b">
                <ModalTitle>{state.title}</ModalTitle>

                <ModalCloseX size={20} />
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-content-3 font-medium">
                  {state.description}
                </p>
              </ModalBody>
              <ModalFooter className="flex justify-end items-center gap-x-2">
                <ModalClose asChild>
                  <Button variant="outline" size="sm">
                    {state.cancelText}
                  </Button>
                </ModalClose>

                <Button
                  loading={loading}
                  onClick={handleConfirm}
                  size="sm"
                  variant="destructive"
                >
                  {state.confirmText}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}
      </AnimatePresence>
      {children}
    </ModalContext.Provider>
  );
};
