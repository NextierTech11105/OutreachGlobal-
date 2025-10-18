import { SchemaManager } from "@/components/admin/schema-manager";
import { SchemaValidator } from "@/components/admin/schema-validator";
import { ZohoSchemaMapper } from "@/components/admin/zoho-schema-mapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DataSchemaPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <Tabs defaultValue="schema" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schema">Schema Manager</TabsTrigger>
          <TabsTrigger value="zoho">Zoho CRM Mapping</TabsTrigger>
          <TabsTrigger value="validator">Schema Validator</TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="mt-6">
          <SchemaManager />
        </TabsContent>

        <TabsContent value="zoho" className="mt-6">
          <ZohoSchemaMapper />
        </TabsContent>

        <TabsContent value="validator" className="mt-6">
          <SchemaValidator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
