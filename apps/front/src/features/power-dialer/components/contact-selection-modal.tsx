"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalCloseX,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalProps,
  ModalTitle,
} from "@/components/ui/modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LEAD_TAGS_QUERY,
  LEADS_QUERY,
} from "@/features/lead/queries/lead.queries";
import { useCurrentTeam } from "@/features/team/team.context";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { useSingleQuery } from "@/graphql/hooks/use-single-query";
import { ExtractNode, LeadsQuery } from "@/graphql/types";
import { useApolloClient, useMutation } from "@apollo/client";
import {
  BuildingIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  TagIcon,
} from "lucide-react";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { UPSERT_DIALER_CONTACT_MUTATION } from "../mutations/dialer-contact.mutations";
import { useApiError } from "@/hooks/use-api-error";
import { DIALER_CONTACTS_EVICT } from "../queries/dialer-contact.queries";

type Lead = ExtractNode<LeadsQuery["leads"]>;

type Contact = {
  lead: Lead;
};

interface Props extends ModalProps {
  defaultValues?: Contact[];
  powerDialerId: string;
}

export const ContactSelectionModal = ({
  defaultValues = [],
  powerDialerId,
  onOpenChange,
  ...props
}: Props) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchTerm, 350);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] =
    useState<Contact[]>(defaultValues);
  const { team } = useCurrentTeam();
  const [tags] = useSingleQuery(LEAD_TAGS_QUERY, {
    pick: "leadTags",
    variables: { teamId: team.id },
  });

  const [upsertDialerContacts, { loading: upsertLoading }] = useMutation(
    UPSERT_DIALER_CONTACT_MUTATION,
  );
  const { cache } = useApolloClient();
  const { showError } = useApiError();

  const [leads, pageInfo, { loading }] = useConnectionQuery(LEADS_QUERY, {
    pick: "leads",
    variables: {
      teamId: team.id,
      searchQuery: debouncedSearchQuery,
      tags: selectedTags,
      hasPhone: true,
    },
  });

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleContactToggle = (lead: Lead) => {
    const isSelected = selectedContacts.some((c) => c.lead.id === lead.id);
    if (isSelected) {
      setSelectedContacts(
        selectedContacts.filter((c) => c.lead.id !== lead.id),
      );
    } else {
      setSelectedContacts([...selectedContacts, { lead }]);
    }
  };

  const handleSelectAll = () => {
    //
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTags([]);
  };

  const addLeads = async () => {
    try {
      await upsertDialerContacts({
        variables: {
          teamId: team.id,
          powerDialerId,
          leadIds: selectedContacts.map((c) => c.lead.id),
        },
      });

      cache.evict(DIALER_CONTACTS_EVICT);
      onOpenChange?.(false);
    } catch (error) {
      showError(error);
    }
  };

  return (
    <Modal {...props} onOpenChange={onOpenChange}>
      <ModalContent className="sm:max-w-screen-lg">
        <ModalHeader className="flex justify-between items-center">
          <ModalTitle>Select Contacts for Dialer Queue</ModalTitle>
          <ModalCloseX />
        </ModalHeader>

        <ModalBody className="space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts by name, company, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tag Filters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <TagIcon className="w-4 h-4" />
                Filter by Tags
              </label>
              {(selectedTags.length > 0 || searchTerm) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {tags?.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Contact List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {loading
                  ? "Loading..."
                  : `${leads?.length || 0} contacts found`}
              </p>
              {leads?.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Select All Visible
                </Button>
              )}
            </div>

            <div className="border rounded-lg h-96 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      Loading contacts...
                    </div>
                  ) : !leads?.length ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No contacts found matching your criteria or no contacts
                      with phone numbers.
                    </div>
                  ) : (
                    leads.map((lead) => {
                      const isSelected = selectedContacts.some(
                        (c) => c.lead.id === lead.id,
                      );
                      return (
                        <div
                          key={lead.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => handleContactToggle(lead)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleContactToggle(lead)}
                              className="mt-1"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0 space-y-2">
                              <div>
                                <h4 className="font-medium">{lead.name}</h4>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <BuildingIcon className="w-3 h-3" />
                                  <span>{lead.company || "no company"}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <PhoneIcon className="w-3 h-3" />
                                  <span className="font-mono">
                                    {lead.phone || "no phone"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MailIcon className="w-3 h-3" />
                                  <span className="truncate">
                                    {lead.email || "no email"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPinIcon className="w-3 h-3" />
                                  <span>{lead.address || "no address"}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1">
                                {lead.tags?.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <ModalClose asChild>
            <Button variant="outline"> Cancel</Button>
          </ModalClose>
          <Button onClick={addLeads} loading={upsertLoading}>
            Add {selectedContacts.length} Lead(s)
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
