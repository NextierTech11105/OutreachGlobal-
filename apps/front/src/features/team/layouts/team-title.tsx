import { cn } from "@/lib/utils";

export const TeamTitle = ({
  className,
  ...props
}: React.ComponentProps<"h1">) => {
  return (
    <h1
      className={cn("text-3xl font-bold tracking-tight", className)}
      {...props}
    />
  );
};
