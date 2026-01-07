"use client";

import { useState } from "react";
import {
  Phone,
  Play,
  Pause,
  PhoneCall,
  PhoneOff,
  Clock,
  Users,
  BarChart3,
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
import { Progress } from "@/components/ui/progress";

interface DialerSession {
  id: string;
  name: string;
  status: "idle" | "active" | "paused" | "completed";
  listSize: number;
  called: number;
  connected: number;
  avgCallDuration: string;
}

export default function PowerDialerPage() {
  const [sessions] = useState<DialerSession[]>([
    {
      id: "1",
      name: "Morning Call Block",
      status: "active",
      listSize: 50,
      called: 23,
      connected: 12,
      avgCallDuration: "3:45",
    },
    {
      id: "2",
      name: "Follow-Up Calls",
      status: "idle",
      listSize: 35,
      called: 0,
      connected: 0,
      avgCallDuration: "--",
    },
    {
      id: "3",
      name: "Yesterday's Callbacks",
      status: "completed",
      listSize: 28,
      called: 28,
      connected: 18,
      avgCallDuration: "4:12",
    },
  ]);

  const getStatusColor = (status: DialerSession["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      case "completed":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const totalCalled = sessions.reduce((sum, s) => sum + s.called, 0);
  const totalConnected = sessions.reduce((sum, s) => sum + s.connected, 0);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Power Dialer</h1>
          <p className="text-muted-foreground">
            High-volume outbound calling with auto-dial
          </p>
        </div>
        <Button>
          <Phone className="mr-2 h-4 w-4" />
          New Session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Today</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalled}</div>
            <p className="text-xs text-muted-foreground">
              {totalConnected} connected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connect Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCalled > 0
                ? Math.round((totalConnected / totalCalled) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">answer rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3:58</div>
            <p className="text-xs text-muted-foreground">per connected call</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Sessions
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter((s) => s.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">currently running</p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions */}
      <div className="grid gap-4">
        {sessions.map((session) => (
          <Card key={session.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${getStatusColor(session.status)} bg-opacity-20`}
                  >
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {session.name}
                      <Badge
                        className={
                          getStatusColor(session.status) + " text-white"
                        }
                      >
                        {session.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {session.listSize} contacts in list
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  {session.status === "active" ? (
                    <Button variant="outline" size="sm">
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </Button>
                  ) : session.status === "idle" ? (
                    <Button size="sm">
                      <Play className="mr-2 h-4 w-4" />
                      Start
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm">
                      View Report
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span>
                    {session.called} / {session.listSize} called
                  </span>
                </div>
                <Progress value={(session.called / session.listSize) * 100} />
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-green-500" />
                    <div>
                      <span className="text-muted-foreground">Connected</span>
                      <p className="font-medium">{session.connected}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneOff className="h-4 w-4 text-red-500" />
                    <div>
                      <span className="text-muted-foreground">No Answer</span>
                      <p className="font-medium">
                        {session.called - session.connected}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">
                        Avg Duration
                      </span>
                      <p className="font-medium">{session.avgCallDuration}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
