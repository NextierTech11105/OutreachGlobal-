"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Tag, Phone } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function VerificationResults() {
  const [activeTab, setActiveTab] = useState("matched");

  // Mock data for demonstration
  const matchedAddresses = [
    {
      id: 1,
      original: "123 Main St, Queens, NY",
      verified: "123 Main Street, Queens, NY 11101",
      property_id: "NY-QNS-12345",
      score: 98,
      tags: ["PreForeclosure", "Vacant"],
      api_source: "RealEstateAPI",
      zoho_status: "Synced",
      phone_verified: true,
    },
    {
      id: 2,
      original: "456 Oak Ave, Queens, NY",
      verified: "456 Oak Avenue, Queens, NY 11102",
      property_id: "NY-QNS-23456",
      score: 95,
      tags: ["SeniorOwner"],
      api_source: "RealEstateAPI",
      zoho_status: "Synced",
      phone_verified: true,
    },
    {
      id: 3,
      original: "789 Pine Blvd, Queens, NY",
      verified: "789 Pine Boulevard, Queens, NY 11103",
      property_id: "NY-QNS-34567",
      score: 92,
      tags: ["HighEquity", "R6+"],
      api_source: "RealEstateAPI",
      zoho_status: "Synced",
      phone_verified: false,
    },
    {
      id: 4,
      original: "321 Elm St, Queens, NY",
      verified: "321 Elm Street, Queens, NY 11104",
      property_id: "NY-QNS-45678",
      score: 97,
      tags: ["Absentee"],
      api_source: "RealEstateAPI",
      zoho_status: "New",
      phone_verified: true,
    },
    {
      id: 5,
      original: "654 Maple Dr, Queens, NY",
      verified: "654 Maple Drive, Queens, NY 11105",
      property_id: "NY-QNS-56789",
      score: 94,
      tags: ["LowEquity"],
      api_source: "RealEstateAPI",
      zoho_status: "Updated",
      phone_verified: true,
    },
  ];

  const failedAddresses = [
    {
      id: 6,
      original: "987 Invalid St, Queens, NY",
      reason: "Address not found",
      api_source: "RealEstateAPI",
    },
    {
      id: 7,
      original: "555 Nonexistent Ave, Queens, NY",
      reason: "Invalid street name",
      api_source: "RealEstateAPI",
    },
    {
      id: 8,
      original: "123 Incomplete, Queens",
      reason: "Missing zip code",
      api_source: "CSV Upload",
    },
  ];

  const verificationStats = {
    total: matchedAddresses.length + failedAddresses.length,
    matched: matchedAddresses.length,
    failed: failedAddresses.length,
    phoneVerified: matchedAddresses.filter((a) => a.phone_verified).length,
    zohoSynced: matchedAddresses.filter((a) => a.zoho_status === "Synced")
      .length,
    zohoNew: matchedAddresses.filter((a) => a.zoho_status === "New").length,
    zohoUpdated: matchedAddresses.filter((a) => a.zoho_status === "Updated")
      .length,
    tagged: matchedAddresses.reduce(
      (count, address) => count + address.tags.length,
      0,
    ),
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Verification Results</h3>
          <p className="text-sm text-muted-foreground">
            {verificationStats.matched} addresses verified,{" "}
            {verificationStats.failed} failed
          </p>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            {Math.round(
              (verificationStats.matched / verificationStats.total) * 100,
            )}
            % Success Rate
          </Badge>
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          >
            <Phone className="mr-1 h-3 w-3" />
            {Math.round(
              (verificationStats.phoneVerified / verificationStats.matched) *
                100,
            )}
            % Phone Verified
          </Badge>
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
          >
            <Tag className="mr-1 h-3 w-3" />
            {verificationStats.tagged} Tags Applied
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Total Records
            </p>
            <p className="text-2xl font-bold">{verificationStats.total}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Phone Verified
            </p>
            <p className="text-2xl font-bold">
              {verificationStats.phoneVerified}
            </p>
            <Progress
              value={
                (verificationStats.phoneVerified / verificationStats.matched) *
                100
              }
              className="h-2"
            />
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Zoho CRM Status
            </p>
            <div className="flex space-x-2">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {verificationStats.zohoSynced} Synced
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {verificationStats.zohoNew} New
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-700">
                {verificationStats.zohoUpdated} Updated
              </Badge>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Tags Applied
            </p>
            <p className="text-2xl font-bold">{verificationStats.tagged}</p>
            <p className="text-xs text-muted-foreground">
              Across {verificationStats.matched} records
            </p>
          </div>
        </Card>
      </div>

      <Tabs
        defaultValue="matched"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="matched">
            Matched ({matchedAddresses.length})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Failed ({failedAddresses.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="matched" className="mt-6">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Original Address</TableHead>
                  <TableHead>Verified Address</TableHead>
                  <TableHead>Property ID</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Match Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchedAddresses.map((address) => (
                  <TableRow key={address.id}>
                    <TableCell>{address.original}</TableCell>
                    <TableCell>{address.verified}</TableCell>
                    <TableCell>{address.property_id}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {address.tags.map((tag, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="bg-primary/10 text-primary"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="outline"
                          className={
                            address.zoho_status === "Synced"
                              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : address.zoho_status === "New"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          }
                        >
                          {address.zoho_status}
                        </Badge>
                        {address.phone_verified ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                          >
                            <Phone className="mr-1 h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                          >
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Unverified
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={address.score >= 95 ? "default" : "secondary"}
                      >
                        {address.score}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="failed" className="mt-6">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Original Address</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedAddresses.map((address) => (
                  <TableRow key={address.id}>
                    <TableCell>{address.original}</TableCell>
                    <TableCell>{address.api_source}</TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="font-normal">
                        <XCircle className="mr-1 h-3 w-3" />
                        {address.reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
