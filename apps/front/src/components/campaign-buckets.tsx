"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  RotateCcw,
  Sparkles,
  BookOpen,
  Calendar,
  Bell,
  Briefcase,
  Users,
} from "lucide-react";

// Worker color mapping
const WORKER_COLORS = {
  gianna: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-300",
    progress: "bg-purple-500",
  },
  cathy: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-300",
    progress: "bg-orange-500",
  },
  sabrina: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-300",
    progress: "bg-green-500",
  },
  appointment_bot: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-300",
    progress: "bg-blue-500",
  },
} as const;

// Bucket icon mapping
const BUCKET_ICONS = {
  "Initial Message": MessageSquare,
  Retarget: RotateCcw,
  Nudger: Sparkles,
  "Content Nurture": BookOpen,
  "Book Appt": Calendar,
  "Appt Reminder": Bell,
  "Deal Module": Briefcase,
} as const;

// Bucket type
interface CampaignBucket {
  id: string;
  name: string;
  worker: keyof typeof WORKER_COLORS;
  currentCount: number;
  targetCapacity: number;
  description?: string;
}

// Default campaign buckets matching the doctrine
const DEFAULT_BUCKETS: CampaignBucket[] = [
  {
    id: "1",
    name: "Initial Message",
    worker: "gianna",
    currentCount: 0,
    targetCapacity: 2000,
    description: "First outreach to new leads",
  },
  {
    id: "2",
    name: "Retarget",
    worker: "gianna",
    currentCount: 0,
    targetCapacity: 2000,
    description: "No response after 72h",
  },
  {
    id: "3",
    name: "Nudger",
    worker: "cathy",
    currentCount: 0,
    targetCapacity: 2000,
    description: "Humor-based follow-ups",
  },
  {
    id: "4",
    name: "Content Nurture",
    worker: "gianna",
    currentCount: 0,
    targetCapacity: 2000,
    description: "Value-add content delivery",
  },
  {
    id: "5",
    name: "Book Appt",
    worker: "sabrina",
    currentCount: 0,
    targetCapacity: 2000,
    description: "Ready to schedule call",
  },
  {
    id: "6",
    name: "Appt Reminder",
    worker: "appointment_bot",
    currentCount: 0,
    targetCapacity: 2000,
    description: "Scheduled appointments",
  },
  {
    id: "7",
    name: "Deal Module",
    worker: "sabrina",
    currentCount: 0,
    targetCapacity: 2000,
    description: "Active deal pipeline",
  },
];

interface CampaignBucketCardProps {
  bucket: CampaignBucket;
  onClick?: () => void;
}

function CampaignBucketCard({ bucket, onClick }: CampaignBucketCardProps) {
  const colors = WORKER_COLORS[bucket.worker];
  const Icon = BUCKET_ICONS[bucket.name as keyof typeof BUCKET_ICONS] || Users;
  const progress = (bucket.currentCount / bucket.targetCapacity) * 100;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        colors.border,
        "border-2"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge className={cn("text-xs font-medium", colors.bg, colors.text)}>
            {bucket.worker.toUpperCase()}
          </Badge>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <CardTitle className="text-sm font-semibold mt-2">
          {bucket.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress
          value={progress}
          className="h-2"
          // Custom progress color based on worker
          style={
            {
              "--progress-foreground": `var(--${bucket.worker})`,
            } as React.CSSProperties
          }
        />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {bucket.currentCount.toLocaleString()} /{" "}
            {bucket.targetCapacity.toLocaleString()}
          </span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        {bucket.description && (
          <p className="text-xs text-muted-foreground">{bucket.description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface CampaignBucketsProps {
  buckets?: CampaignBucket[];
  onBucketClick?: (bucket: CampaignBucket) => void;
  className?: string;
}

export function CampaignBuckets({
  buckets = DEFAULT_BUCKETS,
  onBucketClick,
  className,
}: CampaignBucketsProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Campaign Buckets</h2>
        <Badge variant="outline" className="text-xs">
          {buckets.reduce((acc, b) => acc + b.currentCount, 0).toLocaleString()}{" "}
          total leads
        </Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {buckets.map((bucket) => (
          <CampaignBucketCard
            key={bucket.id}
            bucket={bucket}
            onClick={() => onBucketClick?.(bucket)}
          />
        ))}
      </div>
    </div>
  );
}

// Dashboard metrics row component
interface DashboardMetric {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ReactNode;
}

interface DashboardMetricsProps {
  metrics: DashboardMetric[];
  className?: string;
}

export function DashboardMetrics({ metrics, className }: DashboardMetricsProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {metrics.map((metric, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
            {metric.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {typeof metric.value === "number"
                ? metric.value.toLocaleString()
                : metric.value}
            </div>
            {metric.sublabel && (
              <p className="text-xs text-muted-foreground">{metric.sublabel}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default CampaignBuckets;
