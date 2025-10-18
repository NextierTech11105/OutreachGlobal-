import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";

export const CARD_CONTENT_CLASS = "px-4 lg:px-6 py-3 lg:py-4";

export const cardContentVariants = cva(undefined, {
  variants: {
    variant: {
      sm: "px-3 sm:px-4 py-2",
      default: "px-4 lg:px-6 py-3 lg:py-4",
      table: "px-3 py-2",
      "table-checkbox": "pl-2 pr-3 py-2 h-10",
      none: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground rounded-xl border shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(CARD_CONTENT_CLASS, className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export type CardContentProps = React.ComponentProps<"div"> &
  VariantProps<typeof cardContentVariants>;

function CardContent({
  className,
  variant = "default",
  ...props
}: CardContentProps) {
  return (
    <div
      data-slot="card-content"
      className={cn(cardContentVariants({ variant }), className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(CARD_CONTENT_CLASS, className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
