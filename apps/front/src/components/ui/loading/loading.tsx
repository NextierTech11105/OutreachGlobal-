import { cn } from "@/lib/utils";
import { LoaderCircleIcon } from "lucide-react";

interface Props {
  className?: string;
}

export const Loading: React.FC<Props> = ({ className }) => {
  return <LoaderCircleIcon className={cn("animate-spin", className)} />;
};
