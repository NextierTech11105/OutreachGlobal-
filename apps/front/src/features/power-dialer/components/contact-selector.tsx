"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, X } from "lucide-react";
import { ExtractNode, LeadsQuery } from "@/graphql/types";
import { AnimatePresence } from "motion/react";
import { ContactSelectionModal } from "./contact-selection-modal";

interface Contact {
  lead: Lead;
}

type Lead = ExtractNode<LeadsQuery["leads"]>;

interface Props {
  selectedContacts?: Contact[];
  onContactsChange: (contacts: Contact[]) => void;
  powerDialerId: string;
}

export function ContactSelector({
  selectedContacts = [],
  onContactsChange,
  powerDialerId,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const handleRemoveContact = (leadId: string) => {
    onContactsChange(selectedContacts.filter((c) => c.lead.id !== leadId));
  };

  const handleOpenDialog = () => {
    setIsOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Selected Contacts Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Selected Contacts ({selectedContacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedContacts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No contacts selected. Use the button below to add contacts to your
              dialer queue.
            </p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedContacts.map((contact) => (
                <div
                  key={contact.lead.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{contact.lead.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {contact.lead.company}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveContact(contact.lead.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button onClick={handleOpenDialog} className="w-full mt-4 gap-2">
            <Plus className="w-4 h-4" />
            Add Contacts to Queue
          </Button>
        </CardContent>
      </Card>

      <AnimatePresence>
        {isOpen && (
          <ContactSelectionModal
            open={isOpen}
            defaultValues={selectedContacts}
            powerDialerId={powerDialerId}
            onOpenChange={setIsOpen}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
