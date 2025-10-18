import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LeadNotFound() {
  return (
    <div className="container mx-auto py-12 flex flex-col items-center justify-center space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Lead Not Found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-[600px] mx-auto">
          The lead you're looking for doesn't exist or has been removed.
        </p>
      </div>
      <Button asChild>
        <Link href="/leads">Return to Leads</Link>
      </Button>
    </div>
  );
}
