"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Rocket,
  Settings,
  Users,
  Database,
  MessageSquare,
  Zap,
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

export default function GettingStartedPage() {
  const params = useParams<{ team: string }>();
  const teamSlug = params.team;

  const [steps] = useState<OnboardingStep[]>([
    {
      id: "profile",
      title: "Complete Your Profile",
      description: "Add your business info and branding",
      icon: <Settings className="h-5 w-5" />,
      href: `/t/${teamSlug}/settings`,
      completed: true,
    },
    {
      id: "team",
      title: "Invite Team Members",
      description: "Add colleagues to collaborate",
      icon: <Users className="h-5 w-5" />,
      href: `/t/${teamSlug}/users`,
      completed: false,
    },
    {
      id: "data",
      title: "Import Your Data",
      description: "Upload leads or connect data sources",
      icon: <Database className="h-5 w-5" />,
      href: `/t/${teamSlug}/import`,
      completed: false,
    },
    {
      id: "templates",
      title: "Setup Message Templates",
      description: "Create reusable outreach messages",
      icon: <MessageSquare className="h-5 w-5" />,
      href: `/t/${teamSlug}/message-templates`,
      completed: false,
    },
    {
      id: "integrations",
      title: "Connect Integrations",
      description: "Link your CRM, email, and phone systems",
      icon: <Zap className="h-5 w-5" />,
      href: `/t/${teamSlug}/integrations`,
      completed: false,
    },
  ]);

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
                {completedCount} of {steps.length} steps completed
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
