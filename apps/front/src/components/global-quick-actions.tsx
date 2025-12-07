"use client";

import * as React from "react";
import { useState } from "react";
import {
  Command,
  Send,
  Phone,
  Calendar,
  Plus,
  X,
  Clock,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useGlobalActions } from "@/lib/providers/global-actions-provider";
import { GlobalCommandPalette } from "./global-command-palette";
import { CalendarDashboard } from "./calendar-dashboard";

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING ACTION BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

export function GlobalQuickActions() {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    selectedLead,
    openCalendar,
    isSMSDialogOpen,
    openSMSDialog,
    closeSMSDialog,
    isScheduleCallDialogOpen,
    openScheduleCallDialog,
    closeScheduleCallDialog,
    pushToSMSCampaign,
    pushToPhoneCenter,
  } = useGlobalActions();

  // SMS Dialog state
  const [smsForm, setSmsForm] = useState({
    phone: "",
    name: "",
    message: "",
    templateId: "",
    scheduledAt: "",
  });

  // Schedule Call Dialog state
  const [callForm, setCallForm] = useState({
    phone: "",
    name: "",
    scheduledAt: "",
    notes: "",
    priority: "5",
  });

  // Prefill forms when dialogs open
  React.useEffect(() => {
    if (isSMSDialogOpen && selectedLead) {
      setSmsForm({
        phone: selectedLead.phone || "",
        name: selectedLead.name || "",
        message: "",
        templateId: "",
        scheduledAt: "",
      });
    }
  }, [isSMSDialogOpen, selectedLead]);

  React.useEffect(() => {
    if (isScheduleCallDialogOpen && selectedLead) {
      setCallForm({
        phone: selectedLead.phone || "",
        name: selectedLead.name || "",
        scheduledAt: "",
        notes: "",
        priority: "5",
      });
    }
  }, [isScheduleCallDialogOpen, selectedLead]);

  const handleSMSSubmit = () => {
    if (!smsForm.phone) return;

    pushToSMSCampaign(
      {
        id: selectedLead?.id || `temp_${Date.now()}`,
        phone: smsForm.phone,
        name: smsForm.name,
      },
      {
        message: smsForm.message,
        templateId: smsForm.templateId || undefined,
        scheduledAt: smsForm.scheduledAt ? new Date(smsForm.scheduledAt) : undefined,
      }
    );

    closeSMSDialog();
    setSmsForm({ phone: "", name: "", message: "", templateId: "", scheduledAt: "" });
  };

  const handleCallSubmit = () => {
    if (!callForm.phone) return;

    pushToPhoneCenter(
      {
        id: selectedLead?.id || `temp_${Date.now()}`,
        phone: callForm.phone,
        name: callForm.name,
      },
      {
        scheduledAt: callForm.scheduledAt ? new Date(callForm.scheduledAt) : new Date(),
        notes: callForm.notes,
        priority: parseInt(callForm.priority),
      }
    );

    closeScheduleCallDialog();
    setCallForm({ phone: "", name: "", scheduledAt: "", notes: "", priority: "5" });
  };

  return (
    <TooltipProvider>
      {/* Command Palette */}
      <GlobalCommandPalette />

      {/* Calendar Modal */}
      <CalendarDashboard />

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-2">
        {/* Expanded Actions */}
        {isExpanded && (
          <div className="flex flex-col gap-2 mb-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
                  onClick={() => openSMSDialog()}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Push to SMS Campaign</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full shadow-lg bg-green-600 hover:bg-green-700"
                  onClick={() => openScheduleCallDialog()}
                >
                  <Phone className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Schedule Call</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full shadow-lg bg-purple-600 hover:bg-purple-700"
                  onClick={() => openCalendar()}
                >
                  <Calendar className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Open Calendar</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Main FAB */}
        <Button
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-xl transition-all duration-200",
            isExpanded
              ? "bg-destructive hover:bg-destructive/90 rotate-45"
              : "bg-primary hover:bg-primary/90"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </Button>

        {/* Keyboard shortcut hint */}
        <div className="absolute -left-20 bottom-4 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded shadow">
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl</kbd>
          <span className="mx-0.5">+</span>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">K</kbd>
        </div>
      </div>

      {/* SMS Campaign Dialog */}
      <Dialog open={isSMSDialogOpen} onOpenChange={closeSMSDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Push to SMS Campaign Queue
            </DialogTitle>
            <DialogDescription>
              Add a lead to the initial message campaign queue
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sms-phone">Phone Number *</Label>
                <Input
                  id="sms-phone"
                  value={smsForm.phone}
                  onChange={(e) => setSmsForm({ ...smsForm, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sms-name">Name</Label>
                <Input
                  id="sms-name"
                  value={smsForm.name}
                  onChange={(e) => setSmsForm({ ...smsForm, name: e.target.value })}
                  placeholder="Lead name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-template">Template (optional)</Label>
              <Select
                value={smsForm.templateId}
                onValueChange={(value) => setSmsForm({ ...smsForm, templateId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial_outreach">Initial Outreach</SelectItem>
                  <SelectItem value="property_interest">Property Interest</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-message">Custom Message (optional)</Label>
              <Textarea
                id="sms-message"
                value={smsForm.message}
                onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                placeholder="Custom message (will override template)"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-schedule">Schedule Send (optional)</Label>
              <Input
                id="sms-schedule"
                type="datetime-local"
                value={smsForm.scheduledAt}
                onChange={(e) => setSmsForm({ ...smsForm, scheduledAt: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeSMSDialog}>
              Cancel
            </Button>
            <Button onClick={handleSMSSubmit} disabled={!smsForm.phone}>
              <Send className="h-4 w-4 mr-2" />
              Add to Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Call Dialog */}
      <Dialog open={isScheduleCallDialogOpen} onOpenChange={closeScheduleCallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-500" />
              Schedule Call
            </DialogTitle>
            <DialogDescription>
              Add a lead to the phone center call queue
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="call-phone">Phone Number *</Label>
                <Input
                  id="call-phone"
                  value={callForm.phone}
                  onChange={(e) => setCallForm({ ...callForm, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="call-name">Name</Label>
                <Input
                  id="call-name"
                  value={callForm.name}
                  onChange={(e) => setCallForm({ ...callForm, name: e.target.value })}
                  placeholder="Lead name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="call-schedule">Schedule Time</Label>
                <Input
                  id="call-schedule"
                  type="datetime-local"
                  value={callForm.scheduledAt}
                  onChange={(e) => setCallForm({ ...callForm, scheduledAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="call-priority">Priority</Label>
                <Select
                  value={callForm.priority}
                  onValueChange={(value) => setCallForm({ ...callForm, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">High</SelectItem>
                    <SelectItem value="5">Medium</SelectItem>
                    <SelectItem value="1">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="call-notes">Notes</Label>
              <Textarea
                id="call-notes"
                value={callForm.notes}
                onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })}
                placeholder="Call notes or talking points"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeScheduleCallDialog}>
              Cancel
            </Button>
            <Button onClick={handleCallSubmit} disabled={!callForm.phone}>
              <Clock className="h-4 w-4 mr-2" />
              Schedule Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
