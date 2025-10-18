"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Calendar,
  CheckCircle,
  FileUp,
  Filter,
  Search,
  Send,
  User,
  XCircle,
} from "lucide-react";

export function UserActivity() {
  const activities = [
    {
      id: 1,
      action: "Created Campaign",
      details: "High Equity AI",
      timestamp: "Today, 10:30 AM",
      type: "campaign",
      status: "success",
    },
    {
      id: 2,
      action: "Uploaded Addresses",
      details: "100 addresses processed",
      timestamp: "Today, 9:15 AM",
      type: "upload",
      status: "success",
    },
    {
      id: 3,
      action: "Ran Search Query",
      details: "Queens County, NY - High Equity",
      timestamp: "Yesterday, 4:45 PM",
      type: "search",
      status: "success",
    },
    {
      id: 4,
      action: "API Key Created",
      details: "New API key for RealEstateAPI integration",
      timestamp: "Yesterday, 2:30 PM",
      type: "security",
      status: "success",
    },
    {
      id: 5,
      action: "Campaign Ended",
      details: "Pre-Foreclosure AI",
      timestamp: "May 6, 2025",
      type: "campaign",
      status: "success",
    },
    {
      id: 6,
      action: "CRM Sync Failed",
      details: "Failed to sync with Zoho CRM",
      timestamp: "May 5, 2025",
      type: "integration",
      status: "error",
    },
    {
      id: 7,
      action: "Property Enrichment",
      details: "250 properties enriched",
      timestamp: "May 5, 2025",
      type: "data",
      status: "success",
    },
    {
      id: 8,
      action: "Login from New Device",
      details: "iPhone 13 - New York, USA",
      timestamp: "May 4, 2025",
      type: "security",
      status: "warning",
    },
    {
      id: 9,
      action: "Campaign Started",
      details: "Senior Owner AI",
      timestamp: "May 3, 2025",
      type: "campaign",
      status: "success",
    },
    {
      id: 10,
      action: "Profile Updated",
      details: "Changed email address",
      timestamp: "May 2, 2025",
      type: "profile",
      status: "success",
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case "campaign":
        return <Send className="h-4 w-4 text-primary" />;
      case "upload":
        return <FileUp className="h-4 w-4 text-blue-500" />;
      case "search":
        return <Search className="h-4 w-4 text-amber-500" />;
      case "security":
        return <User className="h-4 w-4 text-purple-500" />;
      case "integration":
        return <Bot className="h-4 w-4 text-green-500" />;
      case "data":
        return <Filter className="h-4 w-4 text-orange-500" />;
      case "profile":
        return <User className="h-4 w-4 text-indigo-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    if (!status) return null;

    switch (status.toLowerCase()) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <CheckCircle className="h-4 w-4 text-amber-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Recent Activity</h3>
        <div className="flex items-center space-x-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="campaign">Campaigns</SelectItem>
              <SelectItem value="upload">Uploads</SelectItem>
              <SelectItem value="search">Searches</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="data">Data</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            Export
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getIcon(activity.type)}
                    <span className="font-medium">{activity.action}</span>
                  </div>
                </TableCell>
                <TableCell>{activity.details}</TableCell>
                <TableCell>{activity.timestamp}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(activity.status)}
                    <span
                      className={
                        activity.status &&
                        activity.status.toLowerCase() === "success"
                          ? "text-green-500"
                          : activity.status &&
                              activity.status.toLowerCase() === "error"
                            ? "text-red-500"
                            : "text-amber-500"
                      }
                    >
                      {activity.status
                        ? activity.status.charAt(0).toUpperCase() +
                          activity.status.slice(1)
                        : "Unknown"}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing 10 of 48 activities
        </p>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
