"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Plus, Trash, MessageSquare } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadDetailsQuery } from "@/graphql/types";
import { useApiError } from "@/hooks/use-api-error";
import { useCurrentTeam } from "@/features/team/team.context";
import { useMutation } from "@apollo/client";
import {
  CREATE_LEAD_PHONE_NUMBER_MUTATION,
  DELETE_LEAD_PHONE_NUMBER_MUTATION,
  UPDATE_LEAD_PHONE_NUMBER_MUTATION,
} from "../mutations/lead.mutations";
import { toast } from "sonner";
import { useModalAlert } from "@/components/ui/modal";

type PhoneNumber = LeadDetailsQuery["lead"]["phoneNumbers"][number];

interface LeadPhoneNumbersProps {
  leadId: string;
  phoneNumbers: PhoneNumber[];
  defaultPhoneNumber?: string | null;
  onCreate?: () => void | Promise<void>;
  onUpdate?: () => void | Promise<void>;
}

export function LeadPhoneNumbers({
  leadId,
  phoneNumbers,
  defaultPhoneNumber,
  onCreate,
  onUpdate,
}: LeadPhoneNumbersProps) {
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newPhoneLabel, setNewPhoneLabel] = useState("Mobile");
  const [loading, setLoading] = useState(false);
  const { showError } = useApiError();
  const { team, teamId, isTeamReady } = useCurrentTeam();
  const { showAlert } = useModalAlert();
  const [createPhoneNumber] = useMutation(CREATE_LEAD_PHONE_NUMBER_MUTATION);
  const [updatePhoneNumber] = useMutation(UPDATE_LEAD_PHONE_NUMBER_MUTATION);
  const [deletePhoneNumber] = useMutation(DELETE_LEAD_PHONE_NUMBER_MUTATION);

  if (!isTeamReady) {
    return null;
  }

  const handleAddPhoneNumber = async () => {
    if (!newPhoneNumber) {
      return toast.error("Phone number is required");
    }

    setLoading(true);
    try {
      await createPhoneNumber({
        variables: {
          teamId,
          leadId,
          input: {
            phone: newPhoneNumber,
            label: newPhoneLabel,
          },
        },
      });
      setLoading(false);
      toast.success("Phone number added");
      setNewPhoneNumber("");
      await onCreate?.();
    } catch (error) {
      showError(error, { gql: true });
      setLoading(false);
    }
  };

  const handleRemovePhoneNumber = (id: string) => {
    showAlert({
      title: "Remove Phone Number",
      description: "Are you sure you want to remove this phone number?",
      onConfirm: async () => {
        try {
          await deletePhoneNumber({
            variables: {
              teamId,
              leadPhoneNumberId: id,
              leadId,
            },
          });
          toast.success("Phone number removed");
          await onUpdate?.();
        } catch (error) {
          showError(error, { gql: true });
        }
      },
    });
  };

  const handleUpdateLabel = async (id: string, label: string) => {
    try {
      await updatePhoneNumber({
        variables: {
          teamId,
          leadPhoneNumberId: id,
          leadId,
          label,
        },
      });
      await onUpdate?.();
    } catch (error) {
      showError(error, { gql: true });
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium">Phone Numbers</h3>

      {phoneNumbers.length === 0 && !defaultPhoneNumber ? (
        <div className="text-center py-4 border rounded-md bg-muted/20">
          <Phone className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No phone numbers added yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {!!defaultPhoneNumber && (
            <Card className="border-primary/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-base">
                      {defaultPhoneNumber}
                    </span>
                    <Badge>Primary</Badge>
                  </div>
                </div>

                <p className="text-muted-foreground text-sm">
                  You can change primary phone number using edit lead
                </p>
              </CardContent>
            </Card>
          )}
          {phoneNumbers.map((phone, index) => (
            <Card
              key={index}
              // className={phone.isPrimary ? "border-primary/50" : ""}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-base">{phone.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {phone.label === "mobile" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      >
                        <MessageSquare className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Select
                      defaultValue={phone.label}
                      onValueChange={(value) =>
                        handleUpdateLabel(phone.id, value)
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Label" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mobile">Mobile</SelectItem>
                        <SelectItem value="Home">Home</SelectItem>
                        <SelectItem value="Work">Work</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemovePhoneNumber(phone.id)}
                    >
                      <Trash className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {phoneNumbers.length < 3 && (
        <div className="pt-4">
          <h4 className="text-sm font-medium mb-3">Add New Phone Number</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Input
                type="tel"
                placeholder="Enter phone number"
                value={newPhoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
              />
            </div>
            <Select value={newPhoneLabel} onValueChange={setNewPhoneLabel}>
              <SelectTrigger>
                <SelectValue placeholder="Label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mobile">Mobile</SelectItem>
                <SelectItem value="Home">Home</SelectItem>
                <SelectItem value="Work">Work</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="mt-3 w-full"
            onClick={handleAddPhoneNumber}
            loading={loading}
            disabled={!newPhoneNumber}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Phone Number
          </Button>
        </div>
      )}
    </div>
  );
}
