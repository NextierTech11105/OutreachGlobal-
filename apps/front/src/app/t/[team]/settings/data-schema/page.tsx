import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function DataSchemaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Data Schema</h2>
        <p className="text-muted-foreground mt-2">
          Configure your data schema, custom fields, and data relationships
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="leads" className="space-y-4">
            <TabsList>
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="companies">Companies</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            </TabsList>

            <TabsContent value="leads" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium">Lead Schema</h3>
                  <p className="text-sm text-muted-foreground">
                    Define the structure of lead data in your system
                  </p>
                </div>
                <Button>Add Field</Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">firstName</TableCell>
                    <TableCell>String</TableCell>
                    <TableCell>Yes</TableCell>
                    <TableCell>First name of the lead</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">lastName</TableCell>
                    <TableCell>String</TableCell>
                    <TableCell>Yes</TableCell>
                    <TableCell>Last name of the lead</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">email</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Yes</TableCell>
                    <TableCell>Email address of the lead</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">phone</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>No</TableCell>
                    <TableCell>Phone number of the lead</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">company</TableCell>
                    <TableCell>String</TableCell>
                    <TableCell>No</TableCell>
                    <TableCell>Company name of the lead</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">title</TableCell>
                    <TableCell>String</TableCell>
                    <TableCell>No</TableCell>
                    <TableCell>Job title of the lead</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">status</TableCell>
                    <TableCell>Enum</TableCell>
                    <TableCell>Yes</TableCell>
                    <TableCell>Current status of the lead</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">source</TableCell>
                    <TableCell>Enum</TableCell>
                    <TableCell>Yes</TableCell>
                    <TableCell>Source of the lead</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4">
              {/* Contacts schema content */}
            </TabsContent>

            <TabsContent value="companies" className="space-y-4">
              {/* Companies schema content */}
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-4">
              {/* Campaigns schema content */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
