"use client";

import { Separator } from "@/components/ui/separator";
import { TeamMemberList } from "./team-member-list";
import { TeamInvitationList } from "./team-invitation-list";
import { Button } from "@/components/ui/button";
import { UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { TeamInvitationModal } from "./team-invitation-modal";

export function TeamSettings() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Team Members</h3>
            <p className="text-sm text-muted-foreground">
              Manage your team members and their access permissions.
            </p>
          </div>

          <Button onClick={() => setOpen(true)}>
            <UserPlusIcon />
            Invite Team Member
          </Button>

          <AnimatePresence>
            {open && <TeamInvitationModal open={open} onOpenChange={setOpen} />}
          </AnimatePresence>
        </div>

        <TeamMemberList />
      </div>

      <Separator />

      <TeamInvitationList />

      <Separator />

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Team Roles</h3>
          <p className="text-sm text-muted-foreground">
            Learn about the different roles and their permissions.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h4 className="text-sm font-medium">Owner</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Full access to all settings and billing. Can add, remove, and
              manage all team members.
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="text-sm font-medium">Admin</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Can manage team members, campaigns, and most settings. Cannot
              access billing or delete the account.
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="text-sm font-medium">Member</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Can create and manage campaigns, leads, and view reports. Cannot
              access team or billing settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
