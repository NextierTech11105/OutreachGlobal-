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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, XCircle, Download, Loader2 } from "lucide-react";

interface VerificationResult {
  original: string;
  verified: boolean;
  standardized?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  propertyId?: string;
  error?: string;
}

export function AddressVerificationModule() {
  const [activeTab, setActiveTab] = useState("single");
  const [isVerifying, setIsVerifying] = useState(false);
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [singleAddress, setSingleAddress] = useState("");
  const [bulkAddresses, setBulkAddresses] = useState("");

  const verifyAddress = async (address: string): Promise<VerificationResult> => {
    try {
      // Use PropertyDetail API with address parameter for verification
      const response = await fetch("/api/address/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });

      const data = await response.json();

      if (data.data && !data.error) {
        const prop = data.data;
        return {
          original: address,
          verified: true,
          standardized: prop.address?.address || prop.address?.street || address,
          city: prop.address?.city,
          state: prop.address?.state,
          zip: prop.address?.zip,
          county: prop.address?.county,
          propertyId: prop.id || prop.propertyId,
        };
      } else {
        return {
          original: address,
          verified: false,
          error: data.error || "Address not found in property database",
        };
      }
    } catch (error: any) {
      return {
        original: address,
        verified: false,
        error: error.message || "Verification failed",
      };
    }
  };

  const handleVerifySingle = async () => {
    if (!singleAddress.trim()) {
      toast.error("Please enter an address to verify");
      return;
    }

    setIsVerifying(true);
    const result = await verifyAddress(singleAddress);
    setResults([result]);
    setIsVerifying(false);

    if (result.verified) {
      toast.success("Address verified successfully");
    } else {
      toast.error("Address could not be verified");
    }
  };

  const handleVerifyBulk = async () => {
    const addresses = bulkAddresses
      .split("\n")
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    if (addresses.length === 0) {
      toast.error("Please enter addresses to verify (one per line)");
      return;
    }

    if (addresses.length > 100) {
      toast.error("Maximum 100 addresses at a time");
      return;
    }

    setIsVerifying(true);
    setResults([]);

    const verificationResults: VerificationResult[] = [];
    for (let i = 0; i < addresses.length; i++) {
      const result = await verifyAddress(addresses[i]);
      verificationResults.push(result);
      // Update results progressively
      setResults([...verificationResults]);
    }

    setIsVerifying(false);
    const verified = verificationResults.filter((r) => r.verified).length;
    toast.success(`Verified ${verified}/${addresses.length} addresses`);
  };

  const downloadResults = () => {
    if (results.length === 0) return;
    const csv = [
      ["Original", "Verified", "Standardized", "City", "State", "ZIP", "County", "Property ID", "Error"].join(","),
      ...results.map((r) =>
        [
          `"${r.original}"`,
          r.verified ? "Yes" : "No",
          `"${r.standardized || ""}"`,
          r.city || "",
          r.state || "",
          r.zip || "",
          r.county || "",
          r.propertyId || "",
          `"${r.error || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `address-verification-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardDescription>
          Verify addresses against RealEstateAPI property database
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="single" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Address</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Verify</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Enter Address</Label>
              <Input
                id="address"
                placeholder="123 Main St, Miami, FL 33101"
                value={singleAddress}
                onChange={(e) => setSingleAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerifySingle()}
              />
            </div>
            <Button onClick={handleVerifySingle} disabled={isVerifying} className="w-full">
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Address"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="bulk" className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk">Enter Addresses (one per line, max 100)</Label>
              <Textarea
                id="bulk"
                placeholder="123 Main St, Miami, FL 33101&#10;456 Oak Ave, Houston, TX 77001&#10;789 Pine Rd, Denver, CO 80202"
                rows={6}
                value={bulkAddresses}
                onChange={(e) => setBulkAddresses(e.target.value)}
              />
            </div>
            <Button onClick={handleVerifyBulk} disabled={isVerifying} className="w-full">
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying {results.length}/{bulkAddresses.split("\n").filter((a) => a.trim()).length}...
                </>
              ) : (
                "Verify All Addresses"
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {results.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">
                Results ({results.filter((r) => r.verified).length}/{results.length} verified)
              </h3>
              <Button variant="outline" size="sm" onClick={downloadResults}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </div>
            <div className="max-h-64 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Original</th>
                    <th className="p-2 text-left">Standardized</th>
                    <th className="p-2 text-left">City/State</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{r.original}</td>
                      <td className="p-2">{r.standardized || "-"}</td>
                      <td className="p-2">
                        {r.city && r.state ? `${r.city}, ${r.state} ${r.zip || ""}` : "-"}
                      </td>
                      <td className="p-2 text-center">
                        {r.verified ? (
                          <CheckCircle className="h-4 w-4 text-green-500 inline" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => { setResults([]); setSingleAddress(""); setBulkAddresses(""); }}>
          Clear
        </Button>
        {results.length > 0 && results.some((r) => r.propertyId) && (
          <Button onClick={() => toast.info("Proceeding to enrichment...")}>
            Enrich Verified Addresses
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
