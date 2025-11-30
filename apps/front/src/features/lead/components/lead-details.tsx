"use client";

import { useState } from "react";
import { Mail, MessageSquare, MapPin, Tag, Navigation } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LeadTagManager } from "@/components/lead-tag-manager";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeadDetailsQuery } from "@/graphql/types";
import { TeamLink } from "@/features/team/components/team-link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentTeam } from "@/features/team/team.context";
import { useApolloClient, useMutation } from "@apollo/client";
import {
  BULK_DELETE_LEAD_MUTATION,
  UPDATE_LEAD_MUTATION,
} from "../mutations/lead.mutations";
import { useRouter } from "next/navigation";
import { LeadPropertyDetails } from "./lead-property-details";
import { MessageType } from "@nextier/common";
import { AnimatePresence } from "motion/react";
import { MessageModal } from "@/features/message/components/message-modal";
import { LeadMessageHistory } from "./lead-message-history";
import { useModalAlert } from "@/components/ui/modal";
import { LEADS_EVICT } from "../queries/lead.queries";
import { LeadPhoneNumbers } from "./lead-phone-numbers";
import { LeadActions } from "./lead-actions";

interface Props {
  lead: LeadDetailsQuery["lead"];
}

const statuses = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

export function LeadDetails({ lead }: Props) {
  const { team } = useCurrentTeam();
  const [currentStatus, setCurrentStatus] = useState(
    lead.status || "No Status",
  );
  const [currentTags, setCurrentTags] = useState<string[]>(lead.tags || []);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageType, setMessageType] = useState<MessageType>(
    MessageType.EMAIL,
  );

  const [updateLead] = useMutation(UPDATE_LEAD_MUTATION);
  const router = useRouter();
  const { showAlert } = useModalAlert();
  const { cache } = useApolloClient();
  const [deleteLead] = useMutation(BULK_DELETE_LEAD_MUTATION);

  const handleStatusChange = async (newStatus: string) => {
    const prevStatus = currentStatus;
    // In a real app, you would update the lead status via an API call
    setCurrentStatus(newStatus);

    try {
      await updateLead({
        variables: {
          teamId: team.id,
          id: lead.id,
          input: { status: newStatus },
        },
      });

      router.refresh();
    } catch (error) {
      toast.error("Failed to update lead status");
      setCurrentStatus(prevStatus);
    }
  };

  const handleTagsChange = async (newTags: string[]) => {
    // In a real app, you would update the lead tags via an API call
    setCurrentTags(newTags);
    await updateLead({
      variables: {
        teamId: team.id,
        id: lead.id,
        input: { tags: newTags },
      },
    });
  };

  const confirmDelete = () => {
    showAlert({
      title: "Delete Lead",
      description: "Are you sure you want to delete this lead?",
      onConfirm: async () => {
        try {
          await deleteLead({
            variables: {
              teamId: team.id,
              leadIds: [lead.id],
            },
          });
          cache.evict(LEADS_EVICT);
          toast.success("Lead deleted");
          router.replace(`/t/${team.slug}/leads`);
        } catch (error) {
          toast.error("Failed to delete lead");
        }
      },
    });
  };

  const handleEmail = () => {
    if (lead.email) {
      setMessageOpen(true);
      setMessageType(MessageType.EMAIL);
    }
  };

  const handleSMS = () => {
    if (lead.phone) {
      setMessageOpen(true);
      setMessageType(MessageType.SMS);
    }
  };

  const refreshLead = () => {
    router.refresh();
  };

  const openDirections = () => {
    const addresses = [
      lead.property?.address?.street,
      lead.property?.address?.city,
      lead.property?.address?.state,
      lead.property?.address?.zipCode,
    ]
      .filter(Boolean)
      .join(", ");
    const address = encodeURIComponent(addresses);
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${address}`,
      "_blank",
    );
  };

  return (
    <div className="pb-0">
      {/* Header with back button, title, and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background sticky top-0 z-10 py-4 border-b">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {lead.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline" className={cn("font-medium")}>
                {currentStatus}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Created{" "}
                {formatDistanceToNow(new Date(lead.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
            {!!lead.property && (
              <div className="flex items-center gap-2 mt-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {lead.property?.address?.street},{" "}
                  {lead.property?.address?.city},{" "}
                  {lead.property?.address?.state}{" "}
                  {lead.property?.address?.zipCode}
                </span>
              </div>
            )}
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
              onClick={handleSMS}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">SMS</span>
            </Button>
          )}
          <LeadActions
            lead={lead}
            variant="button"
            onStatusChange={(newStatus) => setCurrentStatus(newStatus)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <TeamLink
                  href={`/leads/${lead.id}/edit`}
                  className="flex items-center cursor-pointer"
                >
                  Edit Lead
                </TeamLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                variant="destructive"
                asChild
              >
                <button
                  className="w-full"
                  type="button"
                  onClick={confirmDelete}
                >
                  Delete Lead
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs for additional information */}
      <Tabs defaultValue="overview" className="mt-0">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="property">Property</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
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
                        <Badge variant="outline" className={cn("font-medium")}>
                          {currentStatus}
                        </Badge>
                      </div>
                      <Select
                        value={currentStatus}
                        onValueChange={handleStatusChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                        <SelectContent>
                          {!statuses.includes(currentStatus) && (
                            <SelectItem value={currentStatus}>
                              {currentStatus}
                            </SelectItem>
                          )}
                          {statuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <LeadPhoneNumbers
                leadId={lead.id}
                phoneNumbers={lead.phoneNumbers}
                defaultPhoneNumber={lead.phone}
                onCreate={refreshLead}
                onUpdate={refreshLead}
              />
            </div>

            {/* Right column - Key metrics and quick actions */}
            <div className="space-y-4">
              {/* Property Quick View */}
              <Card className="shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Property Overview</CardTitle>
                  {!!lead.property && (
                    <CardDescription>
                      {lead.property?.address?.street},{" "}
                      {lead.property?.address?.city},{" "}
                      {lead.property?.address?.state}{" "}
                      {lead.property?.address?.zipCode}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {!lead.property ? (
                    <p className="text-sm text-muted-foreground">
                      No property details available
                    </p>
                  ) : (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={openDirections}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Directions
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
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
              {!lead.property ? (
                <p className="text-center text-muted-foreground">
                  No property details available
                </p>
              ) : (
                <LeadPropertyDetails lead={lead} />
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
              <LeadMessageHistory leadId={lead.id} />
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
      </Tabs>

      <AnimatePresence>
        {messageOpen && (
          <MessageModal
            open={messageOpen}
            onOpenChange={setMessageOpen}
            name={lead.name || "No Lead Name"}
            address={
              messageType === MessageType.SMS
                ? lead.phone || "+1"
                : lead.email || "No Lead Phone or Email"
            }
            type={messageType}
            leadId={lead.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
