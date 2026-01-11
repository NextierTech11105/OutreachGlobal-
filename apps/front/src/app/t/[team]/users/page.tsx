"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  Mail,
  MoreHorizontal,
  Loader2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCurrentTeam } from "@/features/team/team.context";
import { gql, useQuery, useMutation } from "@apollo/client";

const TEAM_MEMBERS_QUERY = gql`
  query TeamMembers($teamId: ID!, $first: Int) {
    teamMembers(teamId: $teamId, first: $first) {
      edges {
        node {
          id
          role
          status
          createdAt
          user {
            id
            email
            name
            avatar
          }
        }
      }
    }
  }
`;

const INVITE_MEMBER_MUTATION = gql`
  mutation InviteTeamMember($teamId: ID!, $email: String!, $role: String!) {
    inviteTeamMember(teamId: $teamId, email: $email, role: $role) {
      success
      message
    }
  }
`;

const REMOVE_MEMBER_MUTATION = gql`
  mutation RemoveTeamMember($teamId: ID!, $memberId: ID!) {
    removeTeamMember(teamId: $teamId, memberId: $memberId)
  }
`;

interface TeamMember {
  id: string;
  role: string;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  };
}

export default function UsersPage() {
  const { teamId, isTeamReady } = useCurrentTeam();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  const { data, loading, refetch } = useQuery(TEAM_MEMBERS_QUERY, {
    variables: { teamId, first: 50 },
    skip: !isTeamReady,
  });

  const [inviteMember] = useMutation(INVITE_MEMBER_MUTATION);
  const [removeMember] = useMutation(REMOVE_MEMBER_MUTATION);

  const members: TeamMember[] =
    data?.teamMembers?.edges?.map((e: { node: TeamMember }) => e.node) || [];

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setInviting(true);
    try {
      const result = await inviteMember({
        variables: {
          teamId,
          email: inviteEmail.trim(),
          role: inviteRole,
        },
      });

      if (result.data?.inviteTeamMember?.success) {
        toast.success(`Invitation sent to ${inviteEmail}`);
        setInviteOpen(false);
        setInviteEmail("");
        setInviteRole("member");
        refetch();
      } else {
        toast.error(result.data?.inviteTeamMember?.message || "Failed to send invite");
      }
    } catch (error) {
      console.error("Invite error:", error);
      toast.error("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (member: TeamMember) => {
    const name = member.user?.name || member.user?.email || "this member";
    if (!confirm(`Remove ${name} from the team?`)) return;

    try {
      await removeMember({
        variables: {
          teamId,
          memberId: member.id,
        },
      });
      toast.success(`${name} removed from team`);
      refetch();
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove member");
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-500";
      case "admin":
        return "bg-blue-500";
      case "member":
        return "bg-green-500";
      case "viewer":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "inactive":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "?";
  };

  const formatLastActive = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeCount = members.filter((m) => m.status === "active").length;
  const pendingCount = members.filter((m) => m.status === "pending").length;
  const adminCount = members.filter(
    (m) => m.role === "admin" || m.role === "owner"
  ).length;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">Manage users and permissions</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Users</span>
            </div>
            <div className="text-2xl font-bold mt-2">{members.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <div className="text-2xl font-bold mt-2">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <div className="text-2xl font-bold mt-2">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Admins</span>
            </div>
            <div className="text-2xl font-bold mt-2">{adminCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      {members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No team members yet</h3>
            <p className="text-muted-foreground text-center mt-1 max-w-md">
              Invite your first team member to get started
            </p>
            <Button className="mt-4" onClick={() => setInviteOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.user?.avatar} />
                          <AvatarFallback>
                            {getInitials(member.user?.name, member.user?.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {member.user?.name || "Invited User"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {member.user?.email || "Pending invitation"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(member.role) + " text-white"}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 w-fit"
                      >
                        <div
                          className={`h-2 w-2 rounded-full ${getStatusColor(member.status)}`}
                        />
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatLastActive(member.createdAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Role
                          </DropdownMenuItem>
                          {member.status === "pending" && (
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Resend Invite
                            </DropdownMenuItem>
                          )}
                          {member.role !== "owner" && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleRemove(member)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new member to your team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full access</SelectItem>
                  <SelectItem value="member">Member - Standard access</SelectItem>
                  <SelectItem value="viewer">Viewer - Read only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
