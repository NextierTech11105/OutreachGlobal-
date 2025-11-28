import { XIcon } from "lucide-react";
import { ModalClose } from "./modal";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: number;
}

export const ModalCloseX: React.FC<Props> = ({ className, size = 20 }) => {
  return (
    <ModalClose className={cn(className)} type="button">
      <XIcon size={size} />
    </ModalClose>
  );
};
