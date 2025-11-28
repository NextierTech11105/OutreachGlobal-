"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Phone,
  RefreshCw,
  Database,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

interface DataIngestionStatusProps {
  leadId: string;
  onComplete?: () => void;
}

export function DataIngestionStatus({
  leadId,
  onComplete,
}: DataIngestionStatusProps) {
  const [status, setStatus] = useState<
    "idle" | "processing" | "completed" | "error"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState([
    { id: "fetch", name: "Fetching Data", status: "pending", icon: Database },
    {
      id: "phone",
      name: "Verifying Phone Numbers",
      status: "pending",
      icon: Phone,
    },
    {
      id: "transform",
      name: "Transforming Data",
      status: "pending",
      icon: FileCheck,
    },
    {
      id: "complete",
      name: "Data Ingestion Complete",
      status: "pending",
      icon: CheckCircle,
    },
  ]);

  const startIngestion = () => {
    setStatus("processing");
    setProgress(0);

    // Reset steps
    setSteps(steps.map((step) => ({ ...step, status: "pending" })));

    // Simulate the ingestion process
    setTimeout(() => {
      // Step 1: Fetching Data
      setSteps((prev) =>
        prev.map((step) =>
          step.id === "fetch" ? { ...step, status: "processing" } : step,
        ),
      );
      setProgress(10);

      setTimeout(() => {
        // Step 1 Complete
        setSteps((prev) =>
          prev.map((step) =>
            step.id === "fetch" ? { ...step, status: "completed" } : step,
          ),
        );
        setProgress(25);

        // Step 2: Verifying Phone Numbers with Twilio
        setTimeout(() => {
          setSteps((prev) =>
            prev.map((step) =>
              step.id === "phone" ? { ...step, status: "processing" } : step,
            ),
          );
          setProgress(30);

          // Simulate Twilio API calls taking some time
          setTimeout(() => {
            // Step 2 Complete
            setSteps((prev) =>
              prev.map((step) =>
                step.id === "phone" ? { ...step, status: "completed" } : step,
              ),
            );
            setProgress(60);

            // Step 3: Transforming Data
            setTimeout(() => {
              setSteps((prev) =>
                prev.map((step) =>
                  step.id === "transform"
                    ? { ...step, status: "processing" }
                    : step,
                ),
              );
              setProgress(70);

              setTimeout(() => {
                // Step 3 Complete
                setSteps((prev) =>
                  prev.map((step) =>
                    step.id === "transform"
                      ? { ...step, status: "completed" }
                      : step,
                  ),
                );
                setProgress(90);

                // Step 4: Complete
                setTimeout(() => {
                  setSteps((prev) =>
                    prev.map((step) =>
                      step.id === "complete"
                        ? { ...step, status: "completed" }
                        : step,
                    ),
                  );
                  setProgress(100);
                  setStatus("completed");

                  toast({
                    title: "Data Ingestion Complete",
                    description:
                      "Lead data has been successfully processed with Twilio Line Type Intelligence",
                  });

                  if (onComplete) {
                    onComplete();
                  }
                }, 500);
              }, 800);
            }, 500);
          }, 1500);
        }, 500);
      }, 1000);
    }, 500);
  };

  const getStepIcon = (step: (typeof steps)[0]) => {
    const Icon = step.icon;

    if (step.status === "completed") {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }

    if (step.status === "processing") {
      return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    }

    return <Icon className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>RealEstateAPI Data Ingestion</span>
          <Badge
            variant={
              status === "completed"
                ? "default"
                : status === "processing"
                  ? "secondary"
                  : "outline-solid"
            }
          >
            {status === "idle"
              ? "Ready"
              : status === "processing"
                ? "Processing"
                : status === "completed"
                  ? "Completed"
                  : "Error"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Data is processed through Twilio Line Type Intelligence during
          ingestion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2" />

        <div className="space-y-3 mt-4">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStepIcon(step)}
                <span
                  className={
                    step.status === "completed"
                      ? "text-green-600 font-medium"
                      : step.status === "processing"
                        ? "text-blue-600 font-medium"
                        : "text-muted-foreground"
                  }
                >
                  {step.name}
                </span>
              </div>
              {step.status === "completed" && (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  Complete
                </Badge>
              )}
              {step.status === "processing" && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  Processing
                </Badge>
              )}
            </div>
          ))}
        </div>

        {(step) =>
          step.id === "phone" &&
          step.status === "completed" && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Phone Line Types Detected
                  </p>
                  <p className="text-xs text-green-700">
                    Successfully verified 3 phone numbers with Twilio Line Type
                    Intelligence
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-800"
                    >
                      1 Mobile
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-blue-100 text-blue-800"
                    >
                      1 Landline
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-purple-100 text-purple-800"
                    >
                      1 VoIP
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </CardContent>
      <CardFooter>
        <Button
          onClick={startIngestion}
          disabled={status === "processing"}
          className="w-full"
        >
          {status === "processing" ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : status === "completed" ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Start Data Ingestion
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
