import { AdminHeader } from "@/components/admin/admin-header";
import { AddressVerificationModule } from "@/components/address-verification-module";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkipTraceModule } from "@/components/skip-trace-module";
import { DataAppendModule } from "@/components/data-append-module";
import { Button } from "@/components/ui/button";
import { ArrowRight, Settings } from "lucide-react";
import Link from "next/link";

export default function DataVerificationPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Data Verification & Enrichment
            </h2>
            <p className="text-muted-foreground mt-1">
              Verify addresses, skip trace contacts, and append property data
              from premium sources
            </p>
          </div>
          <Link href="/admin/integrations/api">
            <Button variant="outline" className="shrink-0">
              <Settings className="mr-2 h-4 w-4" />
              Configure API Keys
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Data Services</CardTitle>
              <CardDescription>Select a service to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="verify" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="verify">Address Verification</TabsTrigger>
                  <TabsTrigger value="skip-trace">Skip Trace</TabsTrigger>
                  <TabsTrigger value="data-append">Data Append</TabsTrigger>
                </TabsList>

                <TabsContent value="verify" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1 space-y-4">
                      <div className="rounded-md border p-4 bg-muted/50">
                        <h3 className="font-medium">Address Verification</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          Validate addresses against USPS and other
                          authoritative sources to ensure deliverability and
                          accuracy.
                        </p>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center text-sm">
                            <ArrowRight className="mr-2 h-3 w-3 text-muted-foreground" />
                            <span>USPS validation</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <ArrowRight className="mr-2 h-3 w-3 text-muted-foreground" />
                            <span>Geocoding</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <ArrowRight className="mr-2 h-3 w-3 text-muted-foreground" />
                            <span>Standardization</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <ArrowRight className="mr-2 h-3 w-3 text-muted-foreground" />
                            <span>Deliverability check</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <AddressVerificationModule />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="skip-trace" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1 space-y-4">
                      <div className="rounded-md border p-4 bg-muted/50">
                        <h3 className="font-medium">Skip Tracing</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          Find contact information for property owners including
                          phone numbers, email addresses, and more.
                        </p>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center text-sm">
                            <ArrowRight className="mr-2 h-3 w-3 text-muted-foreground" />
                            <span>Phone numbers</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <ArrowRight className="mr-2 h-3 w-3 text-muted-foreground" />
                            <span>Email addresses</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <ArrowRight className="mr-2 h-3 w-3 text-muted-foreground" />
                            <span>Current address</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <ArrowRight className="mr-2 h-3 w-3 text-muted-foreground" />
                            <span>Relatives & associates</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <SkipTraceModule />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="data-append" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1 space-y-4">
                      <div className="rounded-md border p-4 bg-muted/50">
                        <h3 className="font-medium">Data Append</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          Enrich your property records with additional data like
                          property characteristics, owner information, and
                          market values.
                        </p>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center text-sm">
                            <ArrowRight className="mr-2 h-3 w-3 text-muted-foreground" />
                            <span>Property details</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <ArrowRight className="mr-2 h-3 w-3 text-muted-foreground" />
                            <span>Owner information</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <ArrowRight className="mr-2 h-3 w-3 text-muted-foreground" />
                            <span>Tax & mortgage data</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <ArrowRight className="mr-2 h-3 w-3 text-muted-foreground" />
                            <span>Market valuation</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <DataAppendModule />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
