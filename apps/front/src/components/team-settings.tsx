"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, UserPlus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const inviteFormSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  role: z.string({
    required_error: "Please select a role.",
  }),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

const teamMembers = [
  {
    id: "user_1",
    name: "John Doe",
    email: "john.doe@example.com",
    role: "Owner",
    status: "active",
    lastActive: "2025-04-16T14:30:00",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "user_2",
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    role: "Admin",
    status: "active",
    lastActive: "2025-04-16T10:15:00",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "user_3",
    name: "Michael Brown",
    email: "michael.brown@example.com",
    role: "Member",
    status: "active",
    lastActive: "2025-04-15T16:45:00",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "user_4",
    name: "Emily Davis",
    email: "emily.davis@example.com",
    role: "Member",
    status: "invited",
    lastActive: null,
    avatar: "/placeholder.svg?height=40&width=40",
  },
];

const pendingInvites = [
  {
    id: "invite_1",
    email: "david.wilson@example.com",
    role: "Member",
    invitedBy: "John Doe",
    invitedAt: "2025-04-15T09:30:00",
  },
  {
    id: "invite_2",
    email: "jennifer.lee@example.com",
    role: "Admin",
    invitedBy: "John Doe",
    invitedAt: "2025-04-14T14:20:00",
  },
];

export function TeamSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });

  function onSubmit(data: InviteFormValues) {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      console.log(data);
      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${data.email}.`,
      });
      setIsLoading(false);
      setIsInviteDialogOpen(false);
      form.reset();
    }, 1000);
  }

  function handleResendInvite(email: string) {
    toast({
      title: "Invitation resent",
      description: `The invitation to ${email} has been resent.`,
    });
  }

  function handleCancelInvite(id: string) {
    toast({
      title: "Invitation cancelled",
      description: "The invitation has been cancelled.",
    });
  }

  function handleRemoveMember(id: string) {
    toast({
      title: "Member removed",
      description: "The team member has been removed.",
    });
  }

  function handleChangeRole(id: string, role: string) {
    toast({
      title: "Role updated",
      description: `The team member's role has been updated to ${role}.`,
    });
  }

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
          <Dialog
            open={isInviteDialogOpen}
            onOpenChange={setIsInviteDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Team Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your team.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="readonly">Read-only</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          This determines what permissions the user will have.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsInviteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Sending..." : "Send Invitation"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={member.avatar || "/placeholder.svg"}
                          alt={member.name}
                        />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member.status === "active" ? "default" : "outline-solid"
                      }
                    >
                      {member.status === "active" ? "Active" : "Invited"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.lastActive
                      ? new Date(member.lastActive).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleChangeRole(member.id, "Admin")}
                          disabled={member.role === "Owner"}
                        >
                          Change to Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleChangeRole(member.id, "Member")}
                          disabled={
                            member.role === "Owner" || member.role === "Member"
                          }
                        >
                          Change to Member
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleChangeRole(member.id, "Read-only")
                          }
                          disabled={member.role === "Owner"}
                        >
                          Change to Read-only
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {member.status === "invited" ? (
                          <DropdownMenuItem
                            onClick={() => handleResendInvite(member.email)}
                          >
                            Resend Invitation
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={member.role === "Owner"}
                          className="text-destructive focus:text-destructive"
                        >
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Separator />

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Pending Invitations</h3>
          <p className="text-sm text-muted-foreground">
            Manage invitations that have been sent but not yet accepted.
          </p>
        </div>

        {pendingInvites.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Invited At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>{invite.role}</TableCell>
                    <TableCell>{invite.invitedBy}</TableCell>
                    <TableCell>
                      {new Date(invite.invitedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResendInvite(invite.email)}
                      >
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvite(invite.id)}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex h-[100px] items-center justify-center rounded-md border border-dashed">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                No pending invitations
              </p>
            </div>
          </div>
        )}
      </div>

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

          <div className="rounded-lg border p-4">
            <h4 className="text-sm font-medium">Read-only</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Can view campaigns, leads, and reports. Cannot make any changes or
              access settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
