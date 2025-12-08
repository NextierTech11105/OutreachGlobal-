import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CrmImporter } from "@/components/crm-importer";
import { ApiIntegrationImporter } from "@/components/api-integration-importer";
import { FileUploader } from "@/components/file-uploader";
import { DatalakeUploader } from "@/components/datalake-uploader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, Database } from "lucide-react";

export default function DataImportPage() {
  return (
    <div className="flex min-h-screen flex-col">
      
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Data Import</h2>
        </div>

        <Tabs defaultValue="datalake" className="space-y-4">
          <TabsList>
            <TabsTrigger value="datalake" className="gap-2">
              <Database className="h-4 w-4" />
              Datalake
            </TabsTrigger>
            <TabsTrigger value="crm">CRM Import</TabsTrigger>
            <TabsTrigger value="api">API Import</TabsTrigger>
            <TabsTrigger value="file">File Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="datalake">
            <DatalakeUploader />
          </TabsContent>

          <TabsContent value="crm">
            <Card>
              <CardHeader>
                <CardTitle>CRM Data Import</CardTitle>
                <CardDescription>
                  Import data from your CRM system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CrmImporter />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle>API Data Import</CardTitle>
                <CardDescription>
                  Import data from external APIs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApiIntegrationImporter />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="file">
            <Card>
              <CardHeader>
                <CardTitle>File Upload</CardTitle>
                <CardDescription>
                  Import data from CSV files to add leads, contacts, or other
                  data to your system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <InfoIcon className="h-4 w-4 mr-2" />
                  <AlertDescription>
                    Upload a CSV file to import data. The first row should
                    contain column headers. Make sure your CSV file is properly
                    formatted with the required fields.
                  </AlertDescription>
                </Alert>
                <FileUploader />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
