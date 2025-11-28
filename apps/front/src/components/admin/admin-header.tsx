import { cn } from "@/lib/utils";

interface AdminHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function AdminHeader({
  title,
  description,
  className,
}: AdminHeaderProps) {
  return (
    <div className={cn("px-8 py-6 border-b border-zinc-800", className)}>
      <h1 className="text-2xl font-semibold text-zinc-100">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-zinc-400">{description}</p>
      )}
    </div>
  );
}
