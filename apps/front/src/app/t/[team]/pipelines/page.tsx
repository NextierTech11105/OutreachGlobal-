"use client";

import { useState } from "react";
import {
  GitBranch,
  Plus,
  Edit,
  Trash2,
  MoveRight,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Stage {
  id: string;
  name: string;
  deals: number;
  value: number;
  probability: number;
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  stages: Stage[];
  totalDeals: number;
  totalValue: number;
}

export default function PipelinesPage() {
  const [pipelines] = useState<Pipeline[]>([
    {
      id: "1",
      name: "Sales Pipeline",
      description: "Main sales process for new business",
      stages: [
        { id: "s1", name: "Lead", deals: 45, value: 225000, probability: 10 },
        {
          id: "s2",
          name: "Qualified",
          deals: 28,
          value: 420000,
          probability: 25,
        },
        {
          id: "s3",
          name: "Proposal",
          deals: 15,
          value: 375000,
          probability: 50,
        },
        {
          id: "s4",
          name: "Negotiation",
          deals: 8,
          value: 320000,
          probability: 75,
        },
        {
          id: "s5",
          name: "Closed Won",
          deals: 12,
          value: 480000,
          probability: 100,
        },
      ],
      totalDeals: 108,
      totalValue: 1820000,
    },
    {
      id: "2",
      name: "Enterprise Pipeline",
      description: "Large account sales cycle",
      stages: [
        {
          id: "s1",
          name: "Discovery",
          deals: 12,
          value: 600000,
          probability: 10,
        },
        { id: "s2", name: "Demo", deals: 8, value: 800000, probability: 30 },
        {
          id: "s3",
          name: "Proposal",
          deals: 5,
          value: 750000,
          probability: 50,
        },
        {
          id: "s4",
          name: "Contract",
          deals: 3,
          value: 450000,
          probability: 80,
        },
        { id: "s5", name: "Closed", deals: 2, value: 400000, probability: 100 },
      ],
      totalDeals: 30,
      totalValue: 3000000,
    },
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipelines</h1>
          <p className="text-muted-foreground">
            Manage your sales stages and deal flow
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Pipeline
        </Button>
      </div>

      <div className="grid gap-6">
        {pipelines.map((pipeline) => (
          <Card key={pipeline.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GitBranch className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>{pipeline.name}</CardTitle>
                    <CardDescription>{pipeline.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      Total Value
                    </div>
                    <div className="text-xl font-bold">
                      {formatCurrency(pipeline.totalValue)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 overflow-x-auto pb-4">
                {pipeline.stages.map((stage, index) => (
                  <div key={stage.id} className="flex items-center">
                    <Card className="min-w-[180px] bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{stage.name}</span>
                          <Badge variant="outline">{stage.probability}%</Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Deals</span>
                            <span className="font-medium">{stage.deals}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Value</span>
                            <span className="font-medium">
                              {formatCurrency(stage.value)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {index < pipeline.stages.length - 1 && (
                      <MoveRight className="h-4 w-4 mx-2 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
