import { cn } from "@/lib/utils";
import { CFC } from "@/types/element.type";

interface Props {
  className?: string;
}

export const FormGrid: CFC<Props> = ({ className, children }) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 lg:grid-cols-3 gap-4 items-start",
        className,
      )}
    >
      {children}
    </div>
  );
};
