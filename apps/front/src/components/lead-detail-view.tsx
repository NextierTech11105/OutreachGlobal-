"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Mail,
  MessageSquare,
  Phone,
  Edit,
  Trash,
  Star,
  Calendar,
  MapPin,
  Tag,
  Users,
  Clock,
  FileText,
  BarChart2,
  Navigation,
  Plus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Lead, PhoneNumber } from "@/types/lead";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LeadActivityTimeline } from "@/components/lead-activity-timeline";
import { LeadDocuments } from "@/components/lead-documents";
import { LeadStatusSelect } from "@/components/lead-status-select";
import { LeadPropertyDetails } from "@/components/lead-property-details";
import { LeadContactHistory } from "@/components/lead-contact-history";
import { LeadTasksList } from "@/components/lead-tasks-list";
import { LeadNotesManager } from "@/components/lead-notes-manager";
import { LeadTagManager } from "@/components/lead-tag-manager";
import { PropertyMap } from "@/components/property-map";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MessageReply } from "@/components/message-reply";
import type { Message } from "@/types/message";
import { cn } from "@/lib/utils";
import { sf, sfc } from "@/lib/utils/safe-format";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeadPhoneNumbers } from "@/components/lead-phone-numbers";

interface LeadDetailViewProps {
  lead: Lead;
}

export function LeadDetailView({ lead }: LeadDetailViewProps) {
  const router = useRouter();
  const [isStarred, setIsStarred] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<Lead["status"]>(
    lead.status,
  );
  const [currentTags, setCurrentTags] = useState<string[]>(lead.tags || []);
  const [showMessageReply, setShowMessageReply] = useState<{
    type: "email" | "sms" | null;
    recipient: string;
    recipientName: string;
  } | null>(null);
  const [currentPhoneNumbers, setCurrentPhoneNumbers] = useState<PhoneNumber[]>(
    lead.phoneNumbers ||
      (lead.phone
        ? [
            {
              number: lead.phone,
              label: "Primary",
              isPrimary: true,
              verified: false,
            },
          ]
        : []),
  );
  const [showFullscreenMap, setShowFullscreenMap] = useState(false);

  // Determine if we should show the map (only for lead-4 in this example)
  const showMap = lead.id === "lead-4";

  const handleStatusChange = (newStatus: Lead["status"]) => {
    // In a real app, you would update the lead status via an API call
    setCurrentStatus(newStatus);
    toast({
      title: "Status updated",
      description: `Lead status changed to ${newStatus}`,
    });
  };

  const handleTagsChange = (newTags: string[]) => {
    // In a real app, you would update the lead tags via an API call
    setCurrentTags(newTags);
  };

  const handlePhoneNumbersChange = (newPhoneNumbers: PhoneNumber[]) => {
    // In a real app, you would update the lead phone numbers via an API call
    setCurrentPhoneNumbers(newPhoneNumbers);
  };

  const handleDelete = () => {
    // In a real app, you would delete the lead via an API call
    router.push("/leads");
  };

  const getPriorityColor = (priority: Lead["priority"]) => {
    switch (priority) {
      case "Low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "High":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "Urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusColor = (status: Lead["status"]) => {
    switch (status) {
      case "New":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Contacted":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "Qualified":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Proposal":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "Negotiation":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "Closed Won":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300";
      case "Closed Lost":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const handleEmail = () => {
    if (lead.email) {
      setShowMessageReply({
        type: "email",
        recipient: lead.email,
        recipientName: lead.name,
      });
    }
  };

  const handleCall = () => {
    const primaryPhone = currentPhoneNumbers.find((p) => p.isPrimary);
    if (primaryPhone) {
      // Dispatch a custom event to trigger the call
      const callEvent = new CustomEvent("nextier:startCall", {
        detail: {
          phoneNumber: primaryPhone.number,
          contactName: lead.name,
          contactInfo: {
            company: lead.company || "",
            position: "",
            location: `${lead.city}, ${lead.state}`,
            source: lead.source,
            status: currentStatus,
          },
        },
      });
      document.dispatchEvent(callEvent);

      // Show a toast notification
      toast({
        title: "Initiating call",
        description: `Calling ${lead.name} at ${primaryPhone.number}`,
      });
    } else {
      toast({
        title: "No phone number available",
        description: "This lead doesn't have a primary phone number set.",
        variant: "destructive",
      });
    }
  };

  const handleSMS = () => {
    const primaryPhone = currentPhoneNumbers.find((p) => p.isPrimary);
    if (primaryPhone) {
      setShowMessageReply({
        type: "sms",
        recipient: primaryPhone.number,
        recipientName: lead.name,
      });
    }
  };

  const handleCloseMessageReply = () => {
    setShowMessageReply(null);
  };

  const openDirections = () => {
    const address = encodeURIComponent(
      `${lead.address}, ${lead.city}, ${lead.state} ${lead.zipCode}`,
    );
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${address}`,
      "_blank",
    );
  };

  const handleAddTag = () => {
    // Open a dialog or modal to add a tag
    toast({
      title: "Add Tag",
      description: "Tag management functionality would open here",
    });
  };

  return (
    <div className="pb-0">
      {/* Header with back button, title, and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background sticky top-0 z-10 py-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href="/leads">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Back to leads</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {lead.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={() => setIsStarred(!isStarred)}
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    isStarred ? "fill-yellow-400 text-yellow-400" : "",
                  )}
                />
                <span className="sr-only">
                  {isStarred ? "Unstar" : "Star"} lead
                </span>
              </Button>
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge
                variant="outline"
                className={cn("font-medium", getPriorityColor(lead.priority))}
              >
                {lead.priority} Priority
              </Badge>
              <Badge
                variant="outline"
                className={cn("font-medium", getStatusColor(currentStatus))}
              >
                {currentStatus}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Created{" "}
                {formatDistanceToNow(new Date(lead.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {lead.address}, {lead.city}, {lead.state} {lead.zipCode}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Source: {lead.source}</span>
              {lead.assignedTo && (
                <>
                  <span className="text-muted-foreground mx-1">•</span>
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Assigned to: {lead.assignedTo}
                  </span>
                </>
              )}
            </div>
            {lead.email && (
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Email: {lead.email}</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {currentTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </Badge>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleAddTag}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Tag
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lead.email && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleEmail}
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </Button>
          )}
          {lead.phone && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleCall}
            >
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Call</span>
            </Button>
          )}
          {lead.phone && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleSMS}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">SMS</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              // Add task functionality
              toast({
                title: "Task added",
                description: "A new task has been created",
              });
            }}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Lead Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href={`/leads/${lead.id}/edit`}
                  className="flex items-center cursor-pointer"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Lead
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  // Add to campaign functionality
                  toast({
                    title: "Added to campaign",
                    description: "Lead has been added to the campaign",
                  });
                }}
              >
                <BarChart2 className="h-4 w-4 mr-2" />
                Add to Campaign
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  // Schedule follow-up functionality
                  toast({
                    title: "Follow-up scheduled",
                    description: "A follow-up has been scheduled",
                  });
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Follow-up
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  // Add note functionality
                  toast({
                    title: "Note added",
                    description: "A new note has been added",
                  });
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Add Note
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Lead
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the lead and all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Left column - Lead information */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status and Follow-up Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Status & Follow-up</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Current Status</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium",
                        getStatusColor(currentStatus),
                      )}
                    >
                      {currentStatus}
                    </Badge>
                  </div>
                  <LeadStatusSelect
                    value={currentStatus}
                    onValueChange={handleStatusChange}
                  />
                </div>
                {lead.nextFollowUp ? (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Next Follow-up</p>
                      <p className="text-sm">
                        {new Date(lead.nextFollowUp).toLocaleDateString()} at{" "}
                        {new Date(lead.nextFollowUp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Schedule Follow-up</p>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={() => {}}
                      >
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        Schedule now
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Phone Numbers */}
          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Phone Numbers</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadPhoneNumbers
                leadId={lead.id}
                phoneNumbers={currentPhoneNumbers}
                onPhoneNumbersChange={handlePhoneNumbersChange}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column - Key metrics and quick actions */}
        <div className="space-y-4">
          {/* Property Quick View */}
          {showMap && (
            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Property Overview</CardTitle>
                <CardDescription>
                  {lead.address}, {lead.city}, {lead.state} {lead.zipCode}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="aspect-video bg-muted">
                  <img
                    src={`/generic-house.png?height=200&width=400&query=property at ${lead.address}`}
                    alt="Property"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium">{lead.propertyType}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Value</p>
                      <p className="font-medium">${sf(lead.propertyValue)}</p>
                    </div>
                    {lead.bedrooms && lead.bathrooms && (
                      <>
                        <div>
                          <p className="text-muted-foreground">Bedrooms</p>
                          <p className="font-medium">{lead.bedrooms}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Bathrooms</p>
                          <p className="font-medium">{lead.bathrooms}</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowFullscreenMap(true)}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      View Map
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={openDirections}
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Directions
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lead Activity Summary */}
          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Activity Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-blue-100 text-blue-600">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="text-sm">Emails</span>
                </div>
                <span className="font-medium">2</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-green-100 text-green-600">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span className="text-sm">Calls</span>
                </div>
                <span className="font-medium">1</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-purple-100 text-purple-600">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <span className="text-sm">SMS</span>
                </div>
                <span className="font-medium">0</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-yellow-100 text-yellow-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <span className="text-sm">Notes</span>
                </div>
                <span className="font-medium">2</span>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" className="w-full" asChild>
                <Link href="#activity-tab">View Full Activity</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Upcoming Tasks */}
          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Upcoming Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">
                    Schedule property viewing
                  </p>
                  <Badge
                    variant="outline"
                    className="bg-yellow-100 text-yellow-800 border-yellow-300"
                  >
                    Due Soon
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Due in 2 days
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">
                    Send market analysis report
                  </p>
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800 border-green-300"
                  >
                    On Track
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Due in 5 days
                </p>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" className="w-full" asChild>
                <Link href="#tasks-tab">Manage Tasks</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Tabs for additional information */}
      <Tabs defaultValue="activity" className="mt-0">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full md:w-[800px]">
          <TabsTrigger value="activity" id="activity-tab">
            Activity
          </TabsTrigger>
          <TabsTrigger value="tasks" id="tasks-tab">
            Tasks
          </TabsTrigger>
          <TabsTrigger value="notes" id="notes-tab">
            Notes
          </TabsTrigger>
          <TabsTrigger value="property">Property</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>
                Track all interactions and changes for this lead
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadActivityTimeline leadId={lead.id} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>
                Manage tasks related to this lead
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadTasksList leadId={lead.id} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>
                Add and manage notes for this lead
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadNotesManager leadId={lead.id} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="property" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
              <CardDescription>
                Detailed information about the property
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadPropertyDetails lead={lead} />
              {showMap && (
                <div className="mt-6">
                  <PropertyMap
                    address={lead.address}
                    city={lead.city}
                    state={lead.state}
                    zipCode={lead.zipCode}
                    propertyType={lead.propertyType}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="communication" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Communication History</CardTitle>
              <CardDescription>
                Record of all communications with this lead
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadContactHistory leadId={lead.id} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tags" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
              <CardDescription>Manage tags for this lead</CardDescription>
            </CardHeader>
            <CardContent>
              <LeadTagManager
                leadId={lead.id}
                initialTags={currentTags}
                onTagsChange={handleTagsChange}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Manage documents related to this lead
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadDocuments leadId={lead.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fullscreen Map Dialog */}
      {showMap && (
        <Dialog open={showFullscreenMap} onOpenChange={setShowFullscreenMap}>
          <DialogContent className="max-w-5xl w-[95vw] h-[80vh] p-0">
            <div className="h-full">
              <PropertyMap
                address={lead.address}
                city={lead.city}
                state={lead.state}
                zipCode={lead.zipCode}
                propertyType={lead.propertyType}
                fullscreen={true}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Call Modal Integration */}
      {lead.phone && (
        <div className="hidden">
          {/* This is a workaround to trigger the call system */}
          <Button
            id="call-trigger-button"
            className="hidden"
            onClick={() => {
              // Dispatch a custom event to trigger the call
              const callEvent = new CustomEvent("nextier:startCall", {
                detail: {
                  phoneNumber: lead.phone || "",
                  contactName: lead.name,
                  contactInfo: {
                    company: lead.company || "",
                    position: "",
                    location: `${lead.city}, ${lead.state}`,
                    source: lead.source,
                    status: currentStatus,
                  },
                },
              });
              document.dispatchEvent(callEvent);
            }}
          />
        </div>
      )}

      {showMessageReply && (
        <Dialog
          open={!!showMessageReply}
          onOpenChange={() => setShowMessageReply(null)}
        >
          <DialogContent className="max-w-3xl">
            <MessageReply
              message={
                {
                  id: `new-message-${Date.now()}`,
                  type: showMessageReply.type || "email",
                  from: showMessageReply.recipientName,
                  email:
                    showMessageReply.type === "email"
                      ? showMessageReply.recipient
                      : undefined,
                  phone:
                    showMessageReply.type === "sms"
                      ? showMessageReply.recipient
                      : undefined,
                  subject: `Re: ${lead.address || "Your Property"}`,
                  preview: "",
                  content: "",
                  date: new Date().toISOString(),
                  status: "new",
                } as Message
              }
              onSend={(replyText) => {
                console.log(
                  `Sending ${showMessageReply.type} to ${showMessageReply.recipient}: ${replyText}`,
                );
                toast({
                  title: `${showMessageReply.type === "email" ? "Email" : "SMS"} sent`,
                  description: `Your message to ${showMessageReply.recipientName} has been sent.`,
                });
                handleCloseMessageReply();
              }}
              onCancel={handleCloseMessageReply}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
