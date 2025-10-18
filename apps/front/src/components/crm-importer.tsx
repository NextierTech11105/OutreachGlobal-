"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CrmImporter() {
  const [crmType, setCrmType] = useState("zoho");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    // Simulate API connection
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Select CRM</Label>
        <RadioGroup
          defaultValue="zoho"
          value={crmType}
          onValueChange={setCrmType}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="zoho" id="zoho" />
            <Label htmlFor="zoho">Zoho CRM</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="internal" id="internal" />
            <Label htmlFor="internal">Internal Database</Label>
          </div>
        </RadioGroup>
      </div>

      {crmType === "zoho" && (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your Zoho API key"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="domain">Domain</Label>
            <Input id="domain" placeholder="yourcompany.zohocrm.com" />
          </div>
        </div>
      )}

      {crmType === "internal" && (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="db-connection">Database Connection</Label>
            <Input
              id="db-connection"
              placeholder="postgres://user:password@localhost:5432/db"
            />
          </div>
        </div>
      )}

      {isConnected && (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="record-type">Record Type</Label>
            <Select defaultValue="leads">
              <SelectTrigger id="record-type">
                <SelectValue placeholder="Select record type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="contacts">Contacts</SelectItem>
                <SelectItem value="accounts">Accounts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="record-count">Number of Records</Label>
            <Select defaultValue="100">
              <SelectTrigger id="record-count">
                <SelectValue placeholder="Select number of records" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="500">500</SelectItem>
                <SelectItem value="1000">1,000</SelectItem>
                <SelectItem value="all">All Records</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {!isConnected ? (
        <Button onClick={handleConnect} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect to CRM"}
        </Button>
      ) : (
        <div className="rounded-md bg-green-50 p-4 dark:bg-green-950">
          <div className="flex">
            <div className="shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Successfully connected to CRM
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
