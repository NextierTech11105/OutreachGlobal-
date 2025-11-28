"use client";
/** used for programmatic modal like alert */
import { Dispatch, createContext } from "react";
import type { ModalReducerState, ModalReducer } from "./modal.type";

export const modalReducerInitialState: ModalReducerState = {
  title: "",
  description: "",
  open: false,
  confirmText: "Confirm",
  cancelText: "Cancel",
};

export const ModalContext = createContext<
  [ModalReducerState, Dispatch<Partial<ModalReducerState>>]
>([modalReducerInitialState, () => {}]);

export const modalReducer: ModalReducer = (state, action) => {
  return {
    ...state,
    ...action,
  };
};
