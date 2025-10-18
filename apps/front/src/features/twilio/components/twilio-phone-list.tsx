"use client";

import { Button } from "@/components/ui/button";
import { useCurrentTeam } from "@/features/team/team.context";
import { useSingleQuery } from "@/graphql/hooks/use-single-query";
import { Trash2Icon } from "lucide-react";
import { TWILIO_PHONES_QUERY } from "../queries/twilio.queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading/loading-overlay";
import { useModalAlert } from "@/components/ui/modal";
import { useMutation } from "@apollo/client";
import { DELETE_TWILIO_PHONE_MUTATION } from "../mutations/twilio.mutations";
import { useApiError } from "@/hooks/use-api-error";
import { toast } from "sonner";

export const TwilioPhoneList = () => {
  const { team } = useCurrentTeam();
  const [phoneNumbers, { loading, refetch }] = useSingleQuery(
    TWILIO_PHONES_QUERY,
    {
      pick: "twilioPhones",
      variables: { teamId: team.id },
    },
  );

  const { showAlert } = useModalAlert();
  const [deletePhone] = useMutation(DELETE_TWILIO_PHONE_MUTATION);
  const { showError } = useApiError();

  const confirmDelete = (sid: string) => {
    showAlert({
      title: "Release this phone number from your account?",
      description: "This action cannot be undone.",
      onConfirm: async () => {
        try {
          await deletePhone({
            variables: {
              teamId: team.id,
              sid,
            },
          });
          await refetch();
          toast.success("Phone number released");
        } catch (error) {
          showError(error);
        }
      },
    });
  };

  return (
    <Card className="relative overflow-hidden">
      {loading && <LoadingOverlay />}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Phone Number</TableHead>
            <TableHead>Friendly Name</TableHead>
            <TableHead>Capabilities</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {phoneNumbers?.map((number) => (
            <TableRow key={number.sid}>
              <TableCell className="font-medium">
                {number.phoneNumber}
              </TableCell>
              <TableCell>{number.friendlyName}</TableCell>
              <TableCell>
                <div className="flex space-x-1">
                  {number.capabilities.voice && (
                    <Badge
                      variant="outline"
                      className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                    >
                      Voice
                    </Badge>
                  )}
                  {number.capabilities.sms && (
                    <Badge
                      variant="outline"
                      className="bg-green-500/10 text-green-500 border-green-500/20"
                    >
                      SMS
                    </Badge>
                  )}
                  {number.capabilities.mms && (
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 text-purple-500 border-purple-500/20"
                    >
                      MMS
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={number.status === "in-use" ? "default" : "secondary"}
                >
                  {number.status === "in-use" ? "In use" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => confirmDelete(number.sid)}
                  >
                    <Trash2Icon className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
