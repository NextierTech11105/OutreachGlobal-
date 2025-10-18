"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";

interface ScheduleSettings {
  type: "immediate" | "scheduled" | "recurring";
  startDate?: Date;
  startTime?: string;
  endDate?: Date;
  endTime?: string;
  daysOfWeek?: string[];
  callsPerDay?: number;
  callWindow?: {
    start: string;
    end: string;
  };
  timezone?: string;
  maxAttempts?: number;
  retryInterval?: number;
  retryUnit?: "minutes" | "hours" | "days";
}

interface CampaignSchedulerAdvancedProps {
  onScheduleChange: (settings: ScheduleSettings) => void;
  initialSettings?: ScheduleSettings;
  contactCount?: number;
}

export function CampaignSchedulerAdvanced({
  onScheduleChange,
  initialSettings,
  contactCount = 0,
}: CampaignSchedulerAdvancedProps) {
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>(
    initialSettings || {
      type: "immediate",
      callsPerDay: 100,
      callWindow: {
        start: "09:00",
        end: "17:00",
      },
      timezone: "America/New_York",
      maxAttempts: 3,
      retryInterval: 1,
      retryUnit: "days",
      daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },
  );

  const handleSettingChange = <K extends keyof ScheduleSettings>(
    key: K,
    value: ScheduleSettings[K],
  ) => {
    const newSettings = { ...scheduleSettings, [key]: value };
    setScheduleSettings(newSettings);
    onScheduleChange(newSettings);
  };

  const handleCallWindowChange = (key: "start" | "end", value: string) => {
    const newCallWindow = { ...scheduleSettings.callWindow, [key]: value };
    handleSettingChange("callWindow", newCallWindow);
  };

  const toggleDayOfWeek = (day: string) => {
    const currentDays = scheduleSettings.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];
    handleSettingChange("daysOfWeek", newDays);
  };

  const isDaySelected = (day: string) => {
    return (scheduleSettings.daysOfWeek || []).includes(day);
  };

  const calculateCampaignDuration = () => {
    if (!contactCount || contactCount === 0) return "N/A";

    const callsPerDay = scheduleSettings.callsPerDay || 100;
    const daysNeeded = Math.ceil(contactCount / callsPerDay);

    if (scheduleSettings.type === "immediate") {
      return `Approximately ${daysNeeded} day${daysNeeded !== 1 ? "s" : ""}`;
    } else if (scheduleSettings.type === "scheduled") {
      return `1 day (one-time batch)`;
    } else if (scheduleSettings.type === "recurring") {
      const activeDaysPerWeek = (scheduleSettings.daysOfWeek || []).length;
      if (activeDaysPerWeek === 0) return "N/A (no active days selected)";

      const weeksNeeded = Math.ceil(daysNeeded / activeDaysPerWeek);
      return `Approximately ${weeksNeeded} week${weeksNeeded !== 1 ? "s" : ""}`;
    }

    return "N/A";
  };

  const calculateDailyCallRate = () => {
    if (!scheduleSettings.callWindow) return "N/A";

    const startHour = Number.parseInt(
      scheduleSettings.callWindow.start.split(":")[0],
    );
    const startMinute = Number.parseInt(
      scheduleSettings.callWindow.start.split(":")[1],
    );
    const endHour = Number.parseInt(
      scheduleSettings.callWindow.end.split(":")[0],
    );
    const endMinute = Number.parseInt(
      scheduleSettings.callWindow.end.split(":")[1],
    );

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const totalMinutes = endMinutes - startMinutes;

    if (totalMinutes <= 0) return "Invalid time window";

    const callsPerDay = scheduleSettings.callsPerDay || 100;
    const callsPerHour = Math.round((callsPerDay / totalMinutes) * 60);
    const callsPerMinute = callsPerDay / totalMinutes;

    if (callsPerMinute < 1) {
      return `${callsPerHour} calls per hour`;
    } else {
      return `${Math.round(callsPerMinute * 10) / 10} calls per minute`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Schedule</CardTitle>
        <CardDescription>
          Define when and how your campaign will run
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue={scheduleSettings.type}
          value={scheduleSettings.type}
          onValueChange={(value) =>
            handleSettingChange("type", value as ScheduleSettings["type"])
          }
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="immediate">Immediate</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="recurring">Recurring</TabsTrigger>
          </TabsList>

          <TabsContent value="immediate" className="mt-4 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Campaign will start immediately after creation and continue
                until all contacts are processed.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="scheduled" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      id="startDate"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduleSettings.startDate ? (
                        format(scheduleSettings.startDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={scheduleSettings.startDate}
                      onSelect={(date) =>
                        handleSettingChange("startDate", date)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startTime"
                    type="time"
                    value={scheduleSettings.startTime || "09:00"}
                    onChange={(e) =>
                      handleSettingChange("startTime", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recurring" className="mt-4 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Active Days</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((day) => (
                    <Button
                      key={day}
                      type="button"
                      variant={isDaySelected(day) ? "default" : "outline-solid"}
                      className="text-xs h-8"
                      onClick={() => toggleDayOfWeek(day)}
                    >
                      {day.substring(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        id="startDate"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduleSettings.startDate ? (
                          format(scheduleSettings.startDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={scheduleSettings.startDate}
                        onSelect={(date) =>
                          handleSettingChange("startDate", date)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        id="endDate"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduleSettings.endDate ? (
                          format(scheduleSettings.endDate, "PPP")
                        ) : (
                          <span>No end date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={scheduleSettings.endDate}
                        onSelect={(date) =>
                          handleSettingChange("endDate", date)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Call Window</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="callWindowStart">Start Time</Label>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="callWindowStart"
                    type="time"
                    value={scheduleSettings.callWindow?.start || "09:00"}
                    onChange={(e) =>
                      handleCallWindowChange("start", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="callWindowEnd">End Time</Label>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="callWindowEnd"
                    type="time"
                    value={scheduleSettings.callWindow?.end || "17:00"}
                    onChange={(e) =>
                      handleCallWindowChange("end", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={scheduleSettings.timezone}
                onValueChange={(value) =>
                  handleSettingChange("timezone", value)
                }
              >
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">
                    Eastern Time (ET)
                  </SelectItem>
                  <SelectItem value="America/Chicago">
                    Central Time (CT)
                  </SelectItem>
                  <SelectItem value="America/Denver">
                    Mountain Time (MT)
                  </SelectItem>
                  <SelectItem value="America/Los_Angeles">
                    Pacific Time (PT)
                  </SelectItem>
                  <SelectItem value="America/Anchorage">
                    Alaska Time (AKT)
                  </SelectItem>
                  <SelectItem value="Pacific/Honolulu">
                    Hawaii Time (HT)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Call Volume</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="callsPerDay">
                  Calls Per Day: {scheduleSettings.callsPerDay}
                </Label>
                <span className="text-xs text-muted-foreground">
                  {calculateDailyCallRate()}
                </span>
              </div>
              <Slider
                id="callsPerDay"
                min={10}
                max={2500}
                step={10}
                value={[scheduleSettings.callsPerDay || 100]}
                onValueChange={(value) =>
                  handleSettingChange("callsPerDay", value[0])
                }
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10</span>
                <span>2500</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Retry Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxAttempts">Maximum Attempts</Label>
                <Select
                  value={String(scheduleSettings.maxAttempts)}
                  onValueChange={(value) =>
                    handleSettingChange("maxAttempts", Number.parseInt(value))
                  }
                >
                  <SelectTrigger id="maxAttempts">
                    <SelectValue placeholder="Select max attempts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 attempt</SelectItem>
                    <SelectItem value="2">2 attempts</SelectItem>
                    <SelectItem value="3">3 attempts</SelectItem>
                    <SelectItem value="4">4 attempts</SelectItem>
                    <SelectItem value="5">5 attempts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retryInterval">Retry Interval</Label>
                <div className="flex space-x-2">
                  <Input
                    id="retryInterval"
                    type="number"
                    min={1}
                    value={scheduleSettings.retryInterval}
                    onChange={(e) =>
                      handleSettingChange(
                        "retryInterval",
                        Number.parseInt(e.target.value) || 1,
                      )
                    }
                    className="w-20"
                  />
                  <Select
                    value={scheduleSettings.retryUnit}
                    onValueChange={(value) =>
                      handleSettingChange(
                        "retryUnit",
                        value as ScheduleSettings["retryUnit"],
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-6">
        <div className="w-full space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-muted-foreground">Campaign Type:</div>
            <div className="font-medium capitalize">
              {scheduleSettings.type}
            </div>

            {scheduleSettings.type !== "immediate" &&
              scheduleSettings.startDate && (
                <>
                  <div className="text-muted-foreground">Start Date:</div>
                  <div className="font-medium">
                    {format(scheduleSettings.startDate, "PPP")}
                  </div>
                </>
              )}

            {scheduleSettings.type === "recurring" &&
              scheduleSettings.daysOfWeek && (
                <>
                  <div className="text-muted-foreground">Active Days:</div>
                  <div className="font-medium">
                    {scheduleSettings.daysOfWeek.length > 0
                      ? scheduleSettings.daysOfWeek
                          .map((day) => day.substring(0, 3))
                          .join(", ")
                      : "None selected"}
                  </div>
                </>
              )}

            <div className="text-muted-foreground">Call Window:</div>
            <div className="font-medium">
              {scheduleSettings.callWindow?.start} -{" "}
              {scheduleSettings.callWindow?.end}{" "}
              {scheduleSettings.timezone
                ? `(${scheduleSettings.timezone.split("/")[1].replace("_", " ")})`
                : ""}
            </div>

            <div className="text-muted-foreground">Estimated Duration:</div>
            <div className="font-medium">{calculateCampaignDuration()}</div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
