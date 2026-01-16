"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Rocket,
  Settings,
  Users,
  Database,
  MessageSquare,
  Zap,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { useParams } from "next/navigation";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  completed: boolean;
}

interface ProgressData {
  profile: boolean;
  team: boolean;
  data: boolean;
  templates: boolean;
  integrations: boolean;
}

export default function GettingStartedPage() {
  const params = useParams<{ team: string }>();
  const teamSlug = params.team;
  const [isLoading, setIsLoading] = useState(true);
  const [progressData, setProgressData] = useState<ProgressData>({
    profile: false,
    team: false,
    data: false,
    templates: false,
    integrations: false,
  });

  // Fetch real progress from API
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch("/api/onboarding/progress");
        if (res.ok) {
          const data = await res.json();
          setProgressData(data);
        }
      } catch (error) {
        console.error("Failed to fetch progress:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, []);

  const steps: OnboardingStep[] = [
    {
      id: "profile",
      title: "Complete Your Profile",
      description: "Add your business info and branding",
      icon: <Settings className="h-5 w-5" />,
      href: `/t/${teamSlug}/settings`,
      completed: progressData.profile,
    },
    {
      id: "team",
      title: "Invite Team Members",
      description: "Add colleagues to collaborate",
      icon: <Users className="h-5 w-5" />,
      href: `/t/${teamSlug}/users`,
      completed: progressData.team,
    },
    {
      id: "data",
      title: "Import Your Data",
      description: "Upload leads or connect data sources",
      icon: <Database className="h-5 w-5" />,
      href: `/t/${teamSlug}/import`,
      completed: progressData.data,
    },
    {
      id: "templates",
      title: "Setup Message Templates",
      description: "Create reusable outreach messages",
      icon: <MessageSquare className="h-5 w-5" />,
      href: `/t/${teamSlug}/message-templates`,
      completed: progressData.templates,
    },
    {
      id: "integrations",
      title: "Connect Integrations",
      description: "Link your CRM, email, and phone systems",
      icon: <Zap className="h-5 w-5" />,
      href: `/t/${teamSlug}/integrations`,
      completed: progressData.integrations,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Getting Started</h1>
          <p className="text-muted-foreground">
            Complete these steps to get the most out of your platform
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Setup Progress</CardTitle>
              <CardDescription>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking progress...
                  </span>
                ) : (
                  `${completedCount} of ${steps.length} steps completed`
                )}
              </CardDescription>
            </div>
            <span className="text-2xl font-bold">{Math.round(progress)}%</span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {steps.map((step, index) => (
          <Card
            key={step.id}
            className={`transition-all ${step.completed ? "bg-muted/50" : "hover:shadow-md"}`}
          >
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                <span className="text-sm font-medium">{index + 1}</span>
              </div>
              <div
                className={`p-2 rounded-full ${step.completed ? "bg-green-500/20" : "bg-primary/10"}`}
              >
                {step.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
              {step.completed ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <Link href={step.href}>
                  <Button>Start</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
