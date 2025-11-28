import { LeadDetailSkeleton } from "@/components/lead-detail-skeleton";

export default function LeadDetailLoading() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <LeadDetailSkeleton />
    </div>
  );
}
