import { cn } from "@/lib/utils";

export const TeamDescription = ({
  className,
  ...props
}: React.ComponentProps<"p">) => {
  return (
    <p className={cn("text-muted-foreground mt-1", className)} {...props} />
  );
};
