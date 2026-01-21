"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CampaignSchedulerProps {
  initialData?: any;
  onChange?: (scheduleData: any) => void;
}

export function CampaignScheduler({
  initialData,
  onChange,
}: CampaignSchedulerProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialData?.startDate ? new Date(initialData.startDate) : new Date(),
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialData?.endDate ? new Date(initialData.endDate) : undefined,
  );
  const [scheduleType, setScheduleType] = useState(
    initialData?.scheduleType || "immediate",
  );

  useEffect(() => {
    if (onChange) {
      onChange({
        startDate,
        endDate,
        scheduleType,
      });
    }
  }, [startDate, endDate, scheduleType, onChange]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Campaign Start</Label>
          <RadioGroup
            defaultValue="immediate"
            value={scheduleType}
            onValueChange={setScheduleType}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 rounded-md border p-4">
                <RadioGroupItem value="immediate" id="immediate" />
                <Label
                  htmlFor="immediate"
                  className="flex cursor-pointer items-center"
                >
                  <span className="text-sm font-medium">Start Immediately</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-md border p-4">
                <RadioGroupItem value="scheduled" id="scheduled" />
                <Label
                  htmlFor="scheduled"
                  className="flex cursor-pointer items-center"
                >
                  <span className="text-sm font-medium">
                    Schedule for Later
                  </span>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {scheduleType === "scheduled" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Select defaultValue="9am">
                <SelectTrigger id="start-time">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9am">9:00 AM</SelectItem>
                  <SelectItem value="10am">10:00 AM</SelectItem>
                  <SelectItem value="11am">11:00 AM</SelectItem>
                  <SelectItem value="12pm">12:00 PM</SelectItem>
                  <SelectItem value="1pm">1:00 PM</SelectItem>
                  <SelectItem value="2pm">2:00 PM</SelectItem>
                  <SelectItem value="3pm">3:00 PM</SelectItem>
                  <SelectItem value="4pm">4:00 PM</SelectItem>
                  <SelectItem value="5pm">5:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="end-date">Campaign End Date</Label>
            <Switch id="has-end-date" />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground",
                )}
                disabled={true}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "No end date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Delivery Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="delivery-days">Delivery Days</Label>
            <Select defaultValue="weekdays">
              <SelectTrigger id="delivery-days">
                <SelectValue placeholder="Select days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                <SelectItem value="weekdays">Weekdays Only</SelectItem>
                <SelectItem value="weekends">Weekends Only</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="delivery-time">Delivery Time</Label>
            <Select defaultValue="business">
              <SelectTrigger id="delivery-time">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business">
                  Business Hours (9AM-5PM)
                </SelectItem>
                <SelectItem value="morning">Morning (8AM-12PM)</SelectItem>
                <SelectItem value="afternoon">Afternoon (12PM-5PM)</SelectItem>
                <SelectItem value="evening">Evening (5PM-8PM)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max-per-day">Maximum Messages Per Day</Label>
          <Input id="max-per-day" type="number" defaultValue="50" />
          <p className="text-xs text-muted-foreground">
            Limit the number of messages sent per day to avoid overwhelming your
            team or recipients
          </p>
        </div>

        <div className="space-y-2">
          <Label>Throttling</Label>
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium">Enable Message Throttling</h3>
              <p className="text-sm text-muted-foreground">
                Spread message delivery throughout the day to appear more
                natural
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Notifications</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium">
                Campaign Start Notification
              </h3>
              <p className="text-sm text-muted-foreground">
                Receive a notification when the campaign starts
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium">Daily Performance Report</h3>
              <p className="text-sm text-muted-foreground">
                Receive a daily summary of campaign performance
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium">Campaign End Notification</h3>
              <p className="text-sm text-muted-foreground">
                Receive a notification when the campaign ends
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>
    </div>
  );
}
