"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { useCurrentTeam } from "@/features/team/team.context";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Automation {
  id: string;
  name: string;
  status: "active" | "inactive" | "draft";
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE - Clean table like legacy
// ═══════════════════════════════════════════════════════════════════════════

export default function AutomationsPage() {
  const { teamId, isTeamReady } = useCurrentTeam();
  const router = useRouter();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isTeamReady) {
      loadAutomations();
    }
  }, [isTeamReady, teamId]);

  const loadAutomations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/t/${teamId}/workflows`);
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setAutomations(
            data.data.map((wf: any) => ({
              id: wf.id,
              name: wf.name,
              status: wf.status || "draft",
              createdAt: wf.createdAt,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Failed to load automations:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/t/${teamId}/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setAutomations((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
        );
        toast.success(`Automation ${newStatus === "active" ? "activated" : "paused"}`);
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const deleteAutomation = async (id: string) => {
    try {
      const res = await fetch(`/api/t/${teamId}/workflows/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAutomations((prev) => prev.filter((a) => a.id !== id));
        toast.success("Automation deleted");
      }
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <TeamSection>
      <TeamHeader />
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Automations</h1>
          <Button
            variant="outline"
            onClick={() => router.push(`/t/${teamId}/automations/setup`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Automation
          </Button>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="text-left p-4 font-medium">Title</th>
                <th className="text-left p-4 font-medium">Date Created</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="p-4 w-24"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : automations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    No automations yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                automations.map((automation) => (
                  <tr key={automation.id} className="border-t hover:bg-muted/50">
                    <td className="p-4">{automation.name}</td>
                    <td className="p-4 text-muted-foreground">
                      {formatDate(automation.createdAt)}
                    </td>
                    <td className="p-4">
                      <Badge
                        className={
                          automation.status === "active"
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-amber-500 hover:bg-amber-600"
                        }
                      >
                        {automation.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(`/t/${teamId}/automations/${automation.id}`)
                          }
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAutomation(automation.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </TeamSection>
  );
}
