"use client";

import { useState, useEffect } from "react";
import { Phone, Plus, Settings, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { useCurrentTeam } from "@/features/team/team.context";
import { toast } from "sonner";

interface PhoneNumber {
  id: string;
  number: string;
  friendlyName?: string;
  assignedWorker?: string;
  status: "active" | "pending" | "inactive";
  capabilities?: {
    sms: boolean;
    mms: boolean;
    voice: boolean;
  };
}

export default function SignalhouseNumbersPage() {
  const { team } = useCurrentTeam();
  const [loading, setLoading] = useState(true);
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);

  useEffect(() => {
    async function fetchNumbers() {
      try {
        const response = await fetch(
          `/api/signalhouse/numbers?teamId=${team.id}`,
        );
        const data = await response.json();
        if (data.success) {
          setNumbers(data.numbers || []);
        }
      } catch (error) {
        console.error("Failed to fetch numbers:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchNumbers();
  }, [team.id]);

  return (
    <TeamSection>
      <TeamHeader>
        <TeamTitle>
          <Phone className="w-6 h-6 mr-2" />
          SignalHouse Numbers
        </TeamTitle>
      </TeamHeader>

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-zinc-400">
            Manage your 10DLC phone numbers for SMS campaigns
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Number
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : numbers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Phone className="w-12 h-12 mx-auto text-zinc-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Numbers Configured
              </h3>
              <p className="text-zinc-400 mb-4">
                Add a 10DLC number from SignalHouse to start sending SMS
                campaigns
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Number
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {numbers.map((num) => (
              <Card key={num.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Phone className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="font-mono text-lg">{num.number}</p>
                      {num.friendlyName && (
                        <p className="text-sm text-zinc-400">
                          {num.friendlyName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {num.assignedWorker && (
                      <Badge variant="outline">{num.assignedWorker}</Badge>
                    )}
                    <Badge
                      variant={
                        num.status === "active" ? "default" : "secondary"
                      }
                    >
                      {num.status}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TeamSection>
  );
}
