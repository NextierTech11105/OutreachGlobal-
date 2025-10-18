"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploader } from "@/components/file-uploader";
import { CrmImporter } from "@/components/crm-importer";
import { VerificationResults } from "@/components/verification-results";
import { ApiIntegrationImporter } from "@/components/api-integration-importer";

export function AddressVerificationModule() {
  const [activeTab, setActiveTab] = useState("upload");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);

  const handleVerify = () => {
    setIsVerifying(true);
    // Simulate API call
    setTimeout(() => {
      setIsVerifying(false);
      setVerificationComplete(true);
    }, 2000);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardDescription>
          Upload addresses from CSV, import from CRM, or use API integration to
          verify and enrich
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!verificationComplete ? (
          <Tabs
            defaultValue="upload"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">Upload CSV</TabsTrigger>
              <TabsTrigger value="crm">Import from CRM</TabsTrigger>
              <TabsTrigger value="api">API Integration</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-6">
              <FileUploader />
            </TabsContent>
            <TabsContent value="crm" className="mt-6">
              <CrmImporter />
            </TabsContent>
            <TabsContent value="api" className="mt-6">
              <ApiIntegrationImporter />
            </TabsContent>
          </Tabs>
        ) : (
          <VerificationResults />
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {!verificationComplete ? (
          <>
            <Button variant="outline" onClick={() => setActiveTab("upload")}>
              Cancel
            </Button>
            <Button onClick={handleVerify} disabled={isVerifying}>
              {isVerifying ? "Verifying..." : "Verify Addresses"}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => setVerificationComplete(false)}
            >
              Back
            </Button>
            <Button>Proceed to Enrichment</Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
