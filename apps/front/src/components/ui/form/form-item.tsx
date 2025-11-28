import { cn } from "@/lib/utils";

export const FormItem = ({
  children,
  className,
}: React.ComponentProps<"div">) => {
  return (
    <div className={cn("grid gap-2 items-start", className)}>{children}</div>
  );
};
