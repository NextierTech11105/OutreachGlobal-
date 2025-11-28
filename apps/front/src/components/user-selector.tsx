"use client";

import type React from "react";

import { useState } from "react";
import { Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock user data - in a real application, this would come from an API
const teamMembers = [
  {
    id: "user-1",
    name: "Sarah Johnson",
    email: "sarah.johnson@outreachglobal.com",
    role: "Senior SDR",
    department: "sales",
    avatar: "/stylized-letters-sj.png",
    activeLeads: 42,
    activeCampaigns: 3,
    successRate: "87%",
    specialties: [
      "Commercial Real Estate",
      "High-Value Properties",
      "Investment Properties",
    ],
    availability: "high",
  },
  {
    id: "user-2",
    name: "Michael Garcia",
    email: "michael.garcia@outreachglobal.com",
    role: "SDR Team Lead",
    department: "sales",
    avatar: "/abstract-geometric-mg.png",
    activeLeads: 28,
    activeCampaigns: 2,
    successRate: "92%",
    specialties: [
      "Residential Properties",
      "First-Time Buyers",
      "Relocation Services",
    ],
    availability: "medium",
  },
  {
    id: "user-3",
    name: "David Lee",
    email: "david.lee@outreachglobal.com",
    role: "SDR",
    department: "sales",
    avatar: "/abstract-dl.png",
    activeLeads: 35,
    activeCampaigns: 1,
    successRate: "78%",
    specialties: [
      "Foreclosure Properties",
      "Short Sales",
      "Distressed Properties",
    ],
    availability: "high",
  },
  {
    id: "user-4",
    name: "Rachel Jones",
    email: "rachel.jones@outreachglobal.com",
    role: "Senior SDR",
    department: "sales",
    avatar: "/abstract-rj.png",
    activeLeads: 51,
    activeCampaigns: 4,
    successRate: "85%",
    specialties: [
      "Luxury Properties",
      "Waterfront Properties",
      "Investment Properties",
    ],
    availability: "low",
  },
  {
    id: "user-5",
    name: "William Lopez",
    email: "william.lopez@outreachglobal.com",
    role: "SDR",
    department: "sales",
    avatar: "/abstract-geometric-WL.png",
    activeLeads: 22,
    activeCampaigns: 2,
    successRate: "81%",
    specialties: ["Commercial Properties", "Office Spaces", "Retail Locations"],
    availability: "medium",
  },
  {
    id: "user-6",
    name: "Olivia Brown",
    email: "olivia.brown@outreachglobal.com",
    role: "SDR",
    department: "sales",
    avatar: "/abstract-geometric-ob.png",
    activeLeads: 18,
    activeCampaigns: 1,
    successRate: "76%",
    specialties: [
      "Residential Properties",
      "First-Time Buyers",
      "Suburban Properties",
    ],
    availability: "high",
  },
  {
    id: "user-7",
    name: "Daniel Rodriguez",
    email: "daniel.rodriguez@outreachglobal.com",
    role: "Senior SDR",
    department: "sales",
    avatar: "/abstract-geometric-DR.png",
    activeLeads: 38,
    activeCampaigns: 3,
    successRate: "89%",
    specialties: [
      "Investment Properties",
      "Multi-Family Units",
      "Property Management",
    ],
    availability: "medium",
  },
  {
    id: "user-8",
    name: "Sophia Wilson",
    email: "sophia.wilson@outreachglobal.com",
    role: "SDR Team Lead",
    department: "sales",
    avatar: "/stylized-sw.png",
    activeLeads: 31,
    activeCampaigns: 2,
    successRate: "94%",
    specialties: [
      "Luxury Properties",
      "High-Net-Worth Clients",
      "International Buyers",
    ],
    availability: "low",
  },
];

interface UserSelectorProps {
  selectedUserId: string | null;
  onSelectUser: (id: string) => void;
}

export function UserSelector({
  selectedUserId,
  onSelectUser,
}: UserSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<
    (typeof teamMembers)[0] | null
  >(null);

  const filteredUsers = teamMembers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.specialties.some((specialty) =>
        specialty.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesDepartment =
      departmentFilter === "all" || user.department === departmentFilter;
    const matchesAvailability =
      availabilityFilter === "all" || user.availability === availabilityFilter;

    return matchesSearch && matchesDepartment && matchesAvailability;
  });

  const handleViewDetails = (
    user: (typeof teamMembers)[0],
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setSelectedUser(user);
    setDetailsOpen(true);
  };

  const handleSelectUser = (id: string) => {
    onSelectUser(id);
    setDetailsOpen(false);
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case "high":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getAvailabilityLabel = (availability: string) => {
    switch (availability) {
      case "high":
        return "High Availability";
      case "medium":
        return "Medium Availability";
      case "low":
        return "Low Availability";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Select Team Member</h3>
        <div className="flex items-center space-x-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex space-x-4">
        <Tabs
          defaultValue="all"
          value={departmentFilter}
          onValueChange={setDepartmentFilter}
          className="w-1/2"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Departments</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs
          defaultValue="all"
          value={availabilityFilter}
          onValueChange={setAvailabilityFilter}
          className="w-1/2"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="high">High</TabsTrigger>
            <TabsTrigger value="medium">Medium</TabsTrigger>
            <TabsTrigger value="low">Low</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredUsers.map((user) => (
          <Card
            key={user.id}
            className={`cursor-pointer transition-all hover:border-primary ${selectedUserId === user.id ? "border-2 border-primary" : ""}`}
            onClick={() => handleSelectUser(user.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarImage
                    src={user.avatar || "/placeholder.svg"}
                    alt={user.name}
                  />
                  <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm font-medium">
                    {user.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {user.role}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <div
                    className={`h-2 w-2 rounded-full mr-1 ${getAvailabilityColor(user.availability)}`}
                  ></div>
                  <span className="text-xs">
                    {getAvailabilityLabel(user.availability)}
                  </span>
                </div>
                {selectedUserId === user.id && (
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary"
                  >
                    Selected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Active Leads:</span>{" "}
                  {user.activeLeads}
                </div>
                <div>
                  <span className="text-muted-foreground">Campaigns:</span>{" "}
                  {user.activeCampaigns}
                </div>
                <div>
                  <span className="text-muted-foreground">Success Rate:</span>{" "}
                  {user.successRate}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {user.specialties.slice(0, 2).map((specialty) => (
                  <Badge
                    key={specialty}
                    variant="secondary"
                    className="text-xs"
                  >
                    {specialty}
                  </Badge>
                ))}
                {user.specialties.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{user.specialties.length - 2}
                  </Badge>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => handleViewDetails(user, e)}
              >
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        {selectedUser && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={selectedUser.avatar || "/placeholder.svg"}
                    alt={selectedUser.name}
                  />
                  <AvatarFallback>
                    {selectedUser.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                {selectedUser.name} - {selectedUser.role}
              </DialogTitle>
              <DialogDescription>{selectedUser.email}</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="profile">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="workload">Workload</TabsTrigger>
                <TabsTrigger value="specialties">Specialties</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Department</h4>
                    <p className="text-sm text-muted-foreground capitalize">
                      {selectedUser.department}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Availability</h4>
                    <div className="flex items-center mt-1">
                      <div
                        className={`h-3 w-3 rounded-full mr-2 ${getAvailabilityColor(selectedUser.availability)}`}
                      ></div>
                      <p className="text-sm text-muted-foreground">
                        {getAvailabilityLabel(selectedUser.availability)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium">Success Rate</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.successRate}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="workload" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Active Leads</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.activeLeads}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Active Campaigns</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.activeCampaigns}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="specialties" className="space-y-4">
                <div>
                  <h4 className="font-medium">Specialties</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedUser.specialties.map((specialty) => (
                      <Badge key={specialty} variant="secondary">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleSelectUser(selectedUser.id)}>
                Select Team Member
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
