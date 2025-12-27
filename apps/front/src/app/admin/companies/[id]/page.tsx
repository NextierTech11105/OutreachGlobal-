"use client";

import { useState, useEffect, use } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  ArrowLeft,
  Users,
  Phone,
  Mail,
  Calendar,
  LogIn,
  Settings,
  Trash2,
  Loader2,
  Crown,
  Shield,
  User,
  CheckCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";

interface CompanyDetail {
  id: string;
  name: string;
  slug: string;
  owner: {
    id: string;
    name: string;
    email: string;
  } | null;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    status: string;
    user: {
      id: string;
      name: string;
      email: string;
    } | null;
    createdAt: string;
  }>;
  settings: {
    twilioPhone?: string;
    signalhousePhone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    const fetchCompany = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/companies/${id}`);
        const data = await response.json();

        if (data.company) {
          setCompany(data.company);
        }
      } catch (error) {
        console.error("Failed to fetch company:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompany();
  }, [id]);

  const handleImpersonate = async () => {
    if (!company?.owner) {
      alert("This company has no owner to impersonate");
      return;
    }

    setIsImpersonating(true);
    try {
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: company.owner.id,
          targetTeamId: company.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = `/t/${company.slug}`;
      } else {
        alert(data.error || "Failed to impersonate");
      }
    } catch (error) {
      console.error("Impersonation failed:", error);
      alert("Failed to impersonate user");
    } finally {
      setIsImpersonating(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Crown className="mr-1 h-3 w-3" />
            Owner
          </Badge>
        );
      case "ADMIN":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Shield className="mr-1 h-3 w-3" />
            Admin
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <User className="mr-1 h-3 w-3" />
            Member
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Active
          </Badge>
        );
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="text-yellow-600 border-yellow-600"
          >
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-zinc-950 text-zinc-100 min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="bg-zinc-950 text-zinc-100 min-h-screen p-8">
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
          <p className="text-zinc-400">Company not found</p>
          <Link href="/admin/companies">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Companies
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen">
      <div className="border-b border-zinc-800 p-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/admin/companies">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-400" />
              {company.name}
            </h1>
            <p className="text-zinc-400 mt-1">/{company.slug}</p>
          </div>
          <Button
            onClick={handleImpersonate}
            disabled={isImpersonating || !company.owner}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isImpersonating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <LogIn className="h-4 w-4 mr-2" />
            )}
            Log in to Business
          </Button>
        </div>
      </div>

      <div className="p-8">
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          {/* Company Info */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg">Company Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-zinc-400">Company Name</p>
                <p className="font-medium">{company.name}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Slug</p>
                <p className="font-medium">/{company.slug}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Created</p>
                <p className="font-medium">
                  {format(new Date(company.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Owner Info */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg">Owner</CardTitle>
            </CardHeader>
            <CardContent>
              {company.owner ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-white font-medium">
                        {company.owner.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{company.owner.name}</p>
                      <p className="text-sm text-zinc-400">
                        {company.owner.email}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-500">No owner assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Phone Numbers */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg">Phone Numbers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {company.settings.twilioPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-zinc-400" />
                  <span>{company.settings.twilioPhone}</span>
                  <Badge variant="outline" className="text-xs">
                    Twilio
                  </Badge>
                </div>
              )}
              {company.settings.signalhousePhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-zinc-400" />
                  <span>{company.settings.signalhousePhone}</span>
                  <Badge variant="outline" className="text-xs">
                    SignalHouse
                  </Badge>
                </div>
              )}
              {!company.settings.twilioPhone &&
                !company.settings.signalhousePhone && (
                  <p className="text-zinc-500">No phone numbers configured</p>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Team Members */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                {company.members.length} member
                {company.members.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <Link href={`/admin/companies/${company.id}/users`}>
              <Button variant="outline" size="sm">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {company.members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-400">No team members</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">User</TableHead>
                    <TableHead className="text-zinc-400">Role</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.members.map((member) => (
                    <TableRow key={member.id} className="border-zinc-800">
                      <TableCell>
                        {member.user ? (
                          <div>
                            <p className="font-medium">{member.user.name}</p>
                            <p className="text-sm text-zinc-500">
                              {member.user.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-zinc-500">Unknown user</span>
                        )}
                      </TableCell>
                      <TableCell>{getRoleBadge(member.role)}</TableCell>
                      <TableCell>{getStatusBadge(member.status)}</TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {formatDistanceToNow(new Date(member.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
