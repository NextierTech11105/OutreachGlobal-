import { useContext } from "react";
import { ModalContext } from "./modal.context";
import { ModalReducerState } from "./modal.type";

export function useModalAlert() {
  const [, dispatch] = useContext(ModalContext);
  const showAlert = (options: Omit<ModalReducerState, "open">) => {
    dispatch({
      ...options,
      open: true,
    });
  };

  return { showAlert };
}
