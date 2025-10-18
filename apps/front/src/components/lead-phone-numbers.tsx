"use client";

import { useState } from "react";
import type { PhoneNumber, PhoneLineType } from "@/types/lead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone,
  Plus,
  Trash,
  Check,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { twilioLineTypeService } from "@/lib/services/twilio-line-type-service";
import { toast } from "sonner";

interface LeadPhoneNumbersProps {
  leadId: string;
  phoneNumbers: PhoneNumber[];
  onPhoneNumbersChange: (phoneNumbers: PhoneNumber[]) => void;
}

export function LeadPhoneNumbers({
  leadId,
  phoneNumbers,
  onPhoneNumbersChange,
}: LeadPhoneNumbersProps) {
  const [isVerifying, setIsVerifying] = useState<Record<string, boolean>>({});
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newPhoneLabel, setNewPhoneLabel] = useState("Mobile");

  const getLineTypeBadgeColor = (lineType: PhoneLineType | undefined) => {
    switch (lineType) {
      case "mobile":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "landline":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "voip":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "toll_free":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "premium":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const handleAddPhoneNumber = async () => {
    if (!newPhoneNumber) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    // Check if phone number already exists
    if (phoneNumbers.some((phone) => phone.number === newPhoneNumber)) {
      toast({
        title: "Error",
        description: "This phone number already exists",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying({ ...isVerifying, [newPhoneNumber]: true });

    try {
      // Detect line type using Twilio
      const lineTypeResult =
        await twilioLineTypeService.detectLineType(newPhoneNumber);

      const newPhone: PhoneNumber = {
        number: newPhoneNumber,
        label: newPhoneLabel,
        isPrimary: phoneNumbers.length === 0, // Make primary if it's the first phone number
        lineType: lineTypeResult.lineType,
        carrier: lineTypeResult.carrier,
        verified: true,
        lastVerified: new Date().toISOString(),
      };

      const updatedPhoneNumbers = [...phoneNumbers, newPhone];
      onPhoneNumbersChange(updatedPhoneNumbers);

      // Reset form
      setNewPhoneNumber("");
      setNewPhoneLabel("Mobile");

      toast({
        title: "Phone number added",
        description: `Added ${newPhoneNumber} (${lineTypeResult.lineType})`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify phone number",
        variant: "destructive",
      });
    } finally {
      setIsVerifying({ ...isVerifying, [newPhoneNumber]: false });
    }
  };

  const handleRemovePhoneNumber = (index: number) => {
    const updatedPhoneNumbers = [...phoneNumbers];

    // If removing the primary number, make the first remaining number primary
    const wasRemovingPrimary = updatedPhoneNumbers[index].isPrimary;

    updatedPhoneNumbers.splice(index, 1);

    if (wasRemovingPrimary && updatedPhoneNumbers.length > 0) {
      updatedPhoneNumbers[0].isPrimary = true;
    }

    onPhoneNumbersChange(updatedPhoneNumbers);

    toast({
      title: "Phone number removed",
    });
  };

  const handleSetPrimary = (index: number) => {
    const updatedPhoneNumbers = phoneNumbers.map((phone, i) => ({
      ...phone,
      isPrimary: i === index,
    }));

    onPhoneNumbersChange(updatedPhoneNumbers);

    toast({
      title: "Primary phone updated",
      description: `Set ${phoneNumbers[index].number} as primary`,
    });
  };

  const handleVerifyPhoneNumber = async (index: number) => {
    const phoneNumber = phoneNumbers[index];

    setIsVerifying({ ...isVerifying, [phoneNumber.number]: true });

    try {
      // Detect line type using Twilio
      const lineTypeResult = await twilioLineTypeService.detectLineType(
        phoneNumber.number,
      );

      const updatedPhoneNumbers = [...phoneNumbers];
      updatedPhoneNumbers[index] = {
        ...phoneNumber,
        lineType: lineTypeResult.lineType,
        carrier: lineTypeResult.carrier,
        verified: true,
        lastVerified: new Date().toISOString(),
      };

      onPhoneNumbersChange(updatedPhoneNumbers);

      toast({
        title: "Phone number verified",
        description: `Detected as ${lineTypeResult.lineType}${lineTypeResult.carrier ? ` (${lineTypeResult.carrier})` : ""}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify phone number",
        variant: "destructive",
      });
    } finally {
      setIsVerifying({ ...isVerifying, [phoneNumber.number]: false });
    }
  };

  const handleUpdateLabel = (index: number, label: string) => {
    const updatedPhoneNumbers = [...phoneNumbers];
    updatedPhoneNumbers[index] = {
      ...updatedPhoneNumbers[index],
      label,
    };

    onPhoneNumbersChange(updatedPhoneNumbers);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium">Phone Numbers</h3>

      {phoneNumbers.length === 0 ? (
        <div className="text-center py-4 border rounded-md bg-muted/20">
          <Phone className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No phone numbers added yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {phoneNumbers.map((phone, index) => (
            <Card
              key={index}
              className={phone.isPrimary ? "border-primary/50" : ""}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-base">
                      {phone.number}
                    </span>
                    {phone.isPrimary && (
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        Primary
                      </Badge>
                    )}
                    {phone.lineType && (
                      <Badge
                        variant="outline"
                        className={getLineTypeBadgeColor(phone.lineType)}
                      >
                        {phone.lineType.charAt(0).toUpperCase() +
                          phone.lineType.slice(1)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => {
                        // Handle call action
                        const callState = window.callState;
                        if (
                          callState &&
                          typeof callState.activateCall === "function"
                        ) {
                          callState.activateCall(phone.number, "Call", {});
                        }
                      }}
                    >
                      <Phone className="h-5 w-5" />
                    </Button>
                    {phone.lineType === "mobile" && (
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
                      value={phone.label}
                      onValueChange={(value) => handleUpdateLabel(index, value)}
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
                    {phone.carrier && (
                      <span className="text-sm text-muted-foreground">
                        {phone.carrier}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {!phone.isPrimary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPrimary(index)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Set Primary
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerifyPhoneNumber(index)}
                      disabled={isVerifying[phone.number]}
                    >
                      <RefreshCw
                        className={`h-4 w-4 mr-1 ${isVerifying[phone.number] ? "animate-spin" : ""}`}
                      />
                      {isVerifying[phone.number] ? "Verifying..." : "Verify"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemovePhoneNumber(index)}
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
          disabled={!newPhoneNumber || isVerifying[newPhoneNumber]}
        >
          {isVerifying[newPhoneNumber] ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Phone Number
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
