import type { DialogProps } from "@radix-ui/react-dialog";
import { Reducer } from "react";

export type ModalProps = DialogProps;

export interface ModalReducerState {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  open?: boolean;
  onConfirm?: () => void | Promise<void>;
  onClose?: () => void | Promise<void>;
}

export type ModalReducer = Reducer<
  ModalReducerState,
  Partial<ModalReducerState>
>;
