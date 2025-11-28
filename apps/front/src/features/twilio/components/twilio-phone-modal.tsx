"use client";

import { Button } from "@/components/ui/button";
import { FormItem } from "@/components/ui/form/form-item";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalCloseX,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalProps,
  ModalTitle,
} from "@/components/ui/modal";
import { AlertTriangleIcon } from "lucide-react";

import { z } from "@nextier/dto";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { FieldErrors } from "@/components/errors/field-errors";
import { useApolloClient, useMutation } from "@apollo/client";
import { PURCHASE_TWILIO_PHONE_MUTATION } from "../mutations/twilio.mutations";
import { useCurrentTeam } from "@/features/team/team.context";
import { useState } from "react";
import { useApiError } from "@/hooks/use-api-error";
import { TWILIO_PHONES_EVICT } from "../queries/twilio.queries";
import { toast } from "sonner";
const schema = z.object({
  areaCode: z.string().nonempty("area code is required"),
  friendlyName: z.string().nonempty("friendly name is required"),
});

interface Props extends ModalProps {}

export const TwilioPhoneModal: React.FC<Props> = ({
  onOpenChange,
  ...props
}) => {
  const { team } = useCurrentTeam();
  const { handleSubmit, register, registerError } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      areaCode: "",
      friendlyName: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [purchaseTwilioPhone] = useMutation(PURCHASE_TWILIO_PHONE_MUTATION);
  const { showError } = useApiError();
  const { cache } = useApolloClient();

  const purchaseNumber = async (input: z.infer<typeof schema>) => {
    setLoading(true);
    try {
      await purchaseTwilioPhone({
        variables: {
          teamId: team?.id,
          areaCode: input.areaCode,
          friendlyName: input.friendlyName,
        },
      });

      cache.evict(TWILIO_PHONES_EVICT);
      toast.success("Phone number purchased");
      onOpenChange?.(false);
    } catch (error) {
      showError(error, { gql: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal {...props} onOpenChange={onOpenChange}>
      <ModalContent className="sm:max-w-[500px]">
        <ModalHeader>
          <div className="flex flex-col">
            <ModalTitle>Add New Phone Number</ModalTitle>
            <ModalDescription>
              Purchase a new phone number from Twilio.
            </ModalDescription>
          </div>
          <ModalCloseX />
        </ModalHeader>
        <form onSubmit={handleSubmit(purchaseNumber)}>
          <ModalBody className="space-y-6">
            <FormItem>
              <Label htmlFor="areaCode">Area Code</Label>
              <Input
                {...register("areaCode")}
                id="areaCode"
                placeholder="e.g., 415"
                maxLength={3}
              />
              <FieldErrors {...registerError("areaCode")} />
            </FormItem>

            <FormItem>
              <Label htmlFor="friendlyName">Friendly Name</Label>
              <Input
                {...register("friendlyName")}
                id="friendlyName"
                placeholder="e.g., Sales Team"
              />
              <FieldErrors {...registerError("friendlyName")} />
            </FormItem>

            <div className="rounded-md bg-muted p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangleIcon className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium">Number Availability</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Number availability varies by area code and capabilities. If
                    no numbers are available with your selected criteria, try a
                    different area code.
                  </p>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalClose asChild>
              <Button variant="outline">Cancel</Button>
            </ModalClose>
            <Button type="submit" loading={loading}>
              Purchase Number
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
