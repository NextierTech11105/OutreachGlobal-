import type React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import {
  ArrowRight,
  FileUp,
  Filter,
  PieChart,
  Search,
  Send,
} from "lucide-react";
import { PLATFORM_NAME } from "@/config/branding";

interface ModuleNavigationProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ModuleNavigation({
  className,
  ...props
}: ModuleNavigationProps) {
  const modules = [
    {
      title: "Upload & Verify",
      description: "Upload CSV, import from Zoho, verify addresses",
      icon: <FileUp className="h-5 w-5" />,
      href: "/verify-enrich",
    },
    {
      title: "Query Builder",
      description: "Build compound searches with filters",
      icon: <Filter className="h-5 w-5" />,
      href: "/search",
    },
    {
      title: "Enrichment",
      description: "Enrich property data with details",
      icon: <Search className="h-5 w-5" />,
      href: "/enrich",
    },
    {
      title: "Campaigns",
      description: "Manage and route leads to campaigns",
      icon: <Send className="h-5 w-5" />,
      href: "/campaigns",
    },
    {
      title: "Analytics",
      description: "Track performance and ROI",
      icon: <PieChart className="h-5 w-5" />,
      href: "/analytics",
    },
  ];

  return (
    <Card className={cn("col-span-3", className)} {...props}>
      <CardHeader>
        <CardTitle>Data Engine Modules</CardTitle>
        <CardDescription>
          Access the core modules of the {PLATFORM_NAME}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {modules.map((module, i) => (
          <div key={i} className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-4">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                {module.icon}
              </div>
              <div>
                <p className="text-sm font-medium leading-none">
                  {module.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {module.description}
                </p>
              </div>
            </div>
            <Link href={module.href}>
              <Button variant="ghost" size="icon">
                <ArrowRight className="h-4 w-4" />
                <span className="sr-only">Go to {module.title}</span>
              </Button>
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
