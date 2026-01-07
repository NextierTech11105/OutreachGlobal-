"use client";

import { useState } from "react";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  Eye,
  Lock,
  Settings,
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
import { Switch } from "@/components/ui/switch";

interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
  isSystem: boolean;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export default function AccessControlPage() {
  const [roles] = useState<Role[]>([
    {
      id: "owner",
      name: "Owner",
      description: "Full access to all features and settings",
      userCount: 1,
      permissions: ["all"],
      isSystem: true,
    },
    {
      id: "admin",
      name: "Admin",
      description: "Manage team, settings, and integrations",
      userCount: 2,
      permissions: [
        "manage_users",
        "manage_settings",
        "manage_integrations",
        "view_analytics",
      ],
      isSystem: true,
    },
    {
      id: "member",
      name: "Member",
      description: "Access to daily workflows and data",
      userCount: 8,
      permissions: [
        "view_leads",
        "edit_leads",
        "send_messages",
        "view_analytics",
      ],
      isSystem: true,
    },
    {
      id: "viewer",
      name: "Viewer",
      description: "Read-only access to data",
      userCount: 3,
      permissions: ["view_leads", "view_analytics"],
      isSystem: true,
    },
  ]);

  const permissionCategories = [
    {
      name: "Leads & Pipeline",
      permissions: [
        { id: "view_leads", name: "View Leads", enabled: true },
        { id: "edit_leads", name: "Edit Leads", enabled: true },
        { id: "delete_leads", name: "Delete Leads", enabled: false },
        { id: "export_leads", name: "Export Leads", enabled: true },
      ],
    },
    {
      name: "Outreach",
      permissions: [
        { id: "send_sms", name: "Send SMS", enabled: true },
        { id: "send_email", name: "Send Email", enabled: true },
        { id: "make_calls", name: "Make Calls", enabled: true },
        { id: "manage_campaigns", name: "Manage Campaigns", enabled: false },
      ],
    },
    {
      name: "Analytics",
      permissions: [
        { id: "view_analytics", name: "View Analytics", enabled: true },
        { id: "export_reports", name: "Export Reports", enabled: false },
      ],
    },
    {
      name: "Administration",
      permissions: [
        { id: "manage_users", name: "Manage Users", enabled: false },
        { id: "manage_settings", name: "Manage Settings", enabled: false },
        { id: "manage_billing", name: "Manage Billing", enabled: false },
      ],
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Access Control</h1>
          <p className="text-muted-foreground">Manage roles and permissions</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>

      {/* Roles */}
      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {role.name}
                      {role.isSystem && (
                        <Badge variant="secondary">System</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </div>
                </div>
                {!role.isSystem && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{role.userCount} users</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {role.permissions.length === 1 &&
                    role.permissions[0] === "all"
                      ? "All permissions"
                      : `${role.permissions.length} permissions`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>
            Configure granular permissions for the "Member" role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {permissionCategories.map((category) => (
              <div key={category.name}>
                <h4 className="font-medium mb-3">{category.name}</h4>
                <div className="grid gap-3">
                  {category.permissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {permission.enabled ? (
                          <Eye className="h-4 w-4 text-green-500" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{permission.name}</span>
                      </div>
                      <Switch checked={permission.enabled} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
