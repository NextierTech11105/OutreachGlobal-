"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Mail,
  MessageSquare,
  Phone,
  User,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  Edit,
  AlertCircle,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface Activity {
  id: string;
  type:
    | "email"
    | "call"
    | "sms"
    | "note"
    | "status"
    | "meeting"
    | "task"
    | "edit";
  title: string;
  description?: string;
  timestamp: string;
  user: {
    name: string;
    initials: string;
  };
}

interface LeadActivityTimelineProps {
  leadId: string;
}

export function LeadActivityTimeline({ leadId }: LeadActivityTimelineProps) {
  // In a real app, you would fetch this data from an API
  const [activities] = useState<Activity[]>([
    {
      id: "act-1",
      type: "status",
      title: "Status changed to Contacted",
      description: "Changed from New to Contacted",
      timestamp: "2025-05-03T15:45:00Z",
      user: {
        name: "Michael Chen",
        initials: "MC",
      },
    },
    {
      id: "act-2",
      type: "call",
      title: "Outbound call",
      description:
        "Discussed property requirements and budget. Client is interested in viewing properties next week.",
      timestamp: "2025-05-03T15:30:00Z",
      user: {
        name: "Michael Chen",
        initials: "MC",
      },
    },
    {
      id: "act-3",
      type: "email",
      title: "Email sent",
      description:
        "Sent introduction email with company information and services.",
      timestamp: "2025-05-02T10:15:00Z",
      user: {
        name: "Sarah Johnson",
        initials: "SJ",
      },
    },
    {
      id: "act-4",
      type: "note",
      title: "Note added",
      description:
        "Lead came through the website contact form. Interested in selling property within 3 months.",
      timestamp: "2025-04-30T14:20:00Z",
      user: {
        name: "Sarah Johnson",
        initials: "SJ",
      },
    },
    {
      id: "act-5",
      type: "status",
      title: "Lead created",
      description: "Status set to New",
      timestamp: "2025-04-28T08:15:00Z",
      user: {
        name: "System",
        initials: "SY",
      },
    },
  ]);

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "call":
        return <Phone className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "note":
        return <FileText className="h-4 w-4" />;
      case "status":
        return <CheckCircle className="h-4 w-4" />;
      case "meeting":
        return <Calendar className="h-4 w-4" />;
      case "task":
        return <Clock className="h-4 w-4" />;
      case "edit":
        return <Edit className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getActivityIconColor = (type: Activity["type"]) => {
    switch (type) {
      case "email":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300";
      case "call":
        return "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300";
      case "sms":
        return "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300";
      case "note":
        return "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300";
      case "status":
        return "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300";
      case "meeting":
        return "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300";
      case "task":
        return "bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300";
      case "edit":
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-8">
      {activities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No activity recorded yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{activity.user.initials}</AvatarFallback>
                </Avatar>
                <div className="w-px grow bg-border mt-2" />
              </div>
              <div className="space-y-1 pt-1 pb-8">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1 rounded-full ${getActivityIconColor(activity.type)}`}
                  >
                    {getActivityIcon(activity.type)}
                  </div>
                  <p className="font-medium">{activity.title}</p>
                </div>
                {activity.description && (
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{activity.user.name}</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-center">
        <Button variant="outline" size="sm">
          Load More
        </Button>
      </div>
    </div>
  );
}
