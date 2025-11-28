"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Plus, Grid3X3, Trash2 } from "lucide-react";

interface MatrixCell {
  propertyType: string;
  leadSource: string;
  campaignId: string | null;
  campaignName: string | null;
}

const propertyTypes = ["Single Family", "Multi-Family", "Condo", "Land", "Commercial"];
const leadSources = ["Skip Trace", "Direct Mail", "Cold Call", "Referral", "Website"];

const initialMatrix: MatrixCell[] = [
  { propertyType: "Single Family", leadSource: "Skip Trace", campaignId: "c1", campaignName: "SF Skip Trace Outreach" },
  { propertyType: "Single Family", leadSource: "Direct Mail", campaignId: "c2", campaignName: "SF Mail Follow-up" },
  { propertyType: "Multi-Family", leadSource: "Skip Trace", campaignId: "c3", campaignName: "MF Investor Outreach" },
  { propertyType: "Single Family", leadSource: "Website", campaignId: "c4", campaignName: "Inbound Lead Nurture" },
];

export default function CampaignMatrixPage() {
  const [matrix, setMatrix] = useState<MatrixCell[]>(initialMatrix);
  const [selectedCell, setSelectedCell] = useState<{row: string, col: string} | null>(null);

  const getCampaign = (propertyType: string, leadSource: string) => {
    return matrix.find(m => m.propertyType === propertyType && m.leadSource === leadSource);
  };

  const assignCampaign = (propertyType: string, leadSource: string, campaignName: string) => {
    const existing = matrix.find(m => m.propertyType === propertyType && m.leadSource === leadSource);
    if (existing) {
      setMatrix(matrix.map(m =>
        m.propertyType === propertyType && m.leadSource === leadSource
          ? { ...m, campaignName, campaignId: `c${Date.now()}` }
          : m
      ));
    } else {
      setMatrix([...matrix, { propertyType, leadSource, campaignId: `c${Date.now()}`, campaignName }]);
    }
    setSelectedCell(null);
  };

  const removeCampaign = (propertyType: string, leadSource: string) => {
    setMatrix(matrix.filter(m => !(m.propertyType === propertyType && m.leadSource === leadSource)));
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Grid3X3 className="h-8 w-8" />
            Campaign Matrix
          </h1>
          <p className="text-muted-foreground mt-1">
            Map campaigns to property types and lead sources
          </p>
        </div>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Matrix
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Assignment Matrix</CardTitle>
          <CardDescription>
            Click a cell to assign or change the campaign for that combination
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-border p-3 bg-muted text-left font-medium">
                    Property Type / Lead Source
                  </th>
                  {leadSources.map(source => (
                    <th key={source} className="border border-border p-3 bg-muted text-center font-medium min-w-[150px]">
                      {source}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {propertyTypes.map(propType => (
                  <tr key={propType}>
                    <td className="border border-border p-3 bg-muted font-medium">
                      {propType}
                    </td>
                    {leadSources.map(source => {
                      const campaign = getCampaign(propType, source);
                      const isSelected = selectedCell?.row === propType && selectedCell?.col === source;

                      return (
                        <td
                          key={source}
                          className={`border border-border p-2 text-center cursor-pointer transition-colors hover:bg-muted/50 ${isSelected ? 'bg-primary/10 ring-2 ring-primary' : ''}`}
                          onClick={() => setSelectedCell({ row: propType, col: source })}
                        >
                          {campaign ? (
                            <div className="space-y-1">
                              <Badge variant="secondary" className="text-xs">
                                {campaign.campaignName}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCampaign(propType, source);
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              <Plus className="h-4 w-4 mx-auto" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedCell && (
        <Card>
          <CardHeader>
            <CardTitle>
              Assign Campaign: {selectedCell.row} + {selectedCell.col}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter campaign name..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    assignCampaign(selectedCell.row, selectedCell.col, (e.target as HTMLInputElement).value);
                  }
                }}
              />
              <Button onClick={() => setSelectedCell(null)} variant="outline">
                Cancel
              </Button>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Or select existing campaign:</p>
              <div className="flex flex-wrap gap-2">
                {["High Equity Outreach", "Foreclosure Rescue", "Investor Opportunity", "First-Time Buyer"].map(name => (
                  <Button
                    key={name}
                    variant="outline"
                    size="sm"
                    onClick={() => assignCampaign(selectedCell.row, selectedCell.col, name)}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Matrix Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold">{matrix.length}</div>
              <div className="text-sm text-muted-foreground">Active Mappings</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{propertyTypes.length * leadSources.length - matrix.length}</div>
              <div className="text-sm text-muted-foreground">Unmapped Combinations</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{new Set(matrix.map(m => m.campaignName)).size}</div>
              <div className="text-sm text-muted-foreground">Unique Campaigns</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
