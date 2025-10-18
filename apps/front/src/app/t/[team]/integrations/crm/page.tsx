import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { ZohoIntegration } from "@/features/integration/components/zoho-integration";

export default function Page() {
  return (
    <TeamSection>
      <TeamHeader title="CRM Integrations" />

      <div className="container space-y-4">
        <div>
          <TeamTitle>CRM Integrations</TeamTitle>
        </div>

        <Tabs defaultValue="zoho" className="space-y-4">
          <TabsList>
            <TabsTrigger value="zoho">Zoho CRM</TabsTrigger>
            <TabsTrigger value="salesforce">Salesforce</TabsTrigger>
            <TabsTrigger value="hubspot">HubSpot</TabsTrigger>
          </TabsList>

          <TabsContent value="zoho">
            <Card>
              <CardContent>
                <ZohoIntegration />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salesforce">
            <Card>
              <CardContent className="pt-6">
                <div className="p-4 border rounded-md bg-muted/50 text-center">
                  <p>Salesforce integration is not yet configured.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hubspot">
            <Card>
              <CardContent className="pt-6">
                <div className="p-4 border rounded-md bg-muted/50 text-center">
                  <p>HubSpot integration is not yet configured.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TeamSection>
  );
}
