"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Plus, Star } from "lucide-react";

interface PhoneNumber {
  id: string;
  number: string;
  type?: string | null;
  isPrimary?: boolean;
}

interface LeadPhoneNumbersProps {
  leadId: string;
  phoneNumbers?: PhoneNumber[] | null;
  defaultPhoneNumber?: string | null;
  onCreate?: () => void;
  onUpdate?: () => void;
}

export function LeadPhoneNumbers({
  leadId,
  phoneNumbers,
  defaultPhoneNumber,
  onCreate,
  onUpdate,
}: LeadPhoneNumbersProps) {
  const numbers = phoneNumbers || [];

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Phone Numbers</CardTitle>
          <Button variant="outline" size="sm" onClick={onCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {numbers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No phone numbers</p>
        ) : (
          <div className="space-y-2">
            {numbers.map((phone) => (
              <div
                key={phone.id}
                className="flex items-center justify-between p-2 rounded-md border"
              >
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{phone.number}</span>
                  {phone.type && (
                    <Badge variant="secondary" className="text-xs">
                      {phone.type}
                    </Badge>
                  )}
                </div>
                {phone.isPrimary && (
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
