"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { scheduleSystemMaintenance } from "@/lib/services/system-maintenance-service";
import { toast } from "@/components/ui/use-toast";

interface MaintenanceScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaintenanceScheduleModal({
  open,
  onOpenChange,
}: MaintenanceScheduleModalProps) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("02:00");
  const [duration, setDuration] = useState("2");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSchedule = async () => {
    if (!date) {
      toast({
        title: "Date required",
        description: "Please select a date for the maintenance window",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create a new date with the selected time
      const [hours, minutes] = time.split(":").map(Number);
      const scheduledDate = new Date(date);
      scheduledDate.setHours(hours, minutes, 0, 0);

      const result = await scheduleSystemMaintenance(
        scheduledDate,
        Number(duration),
      );

      if (result.success) {
        toast({
          title: "Maintenance Scheduled",
          description: `System maintenance has been scheduled for ${format(
            new Date(result.scheduledTime),
            "PPP 'at' p",
          )}`,
        });
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: "Failed to schedule maintenance",
        description: "An error occurred while scheduling maintenance",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Maintenance</DialogTitle>
          <DialogDescription>
            Schedule a maintenance window for system updates and maintenance
            tasks.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline-solid"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="time">Time (24-hour format)</Label>
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="duration">Duration (hours)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="24"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={isSubmitting}>
            {isSubmitting ? "Scheduling..." : "Schedule Maintenance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
