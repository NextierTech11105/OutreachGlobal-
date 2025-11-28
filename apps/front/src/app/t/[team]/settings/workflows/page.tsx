import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";

export default function WorkflowsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground mt-2">
            Configure automated workflows and triggers for your outreach
            campaigns
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Workflows</TabsTrigger>
          <TabsTrigger value="draft">Draft Workflows</TabsTrigger>
          <TabsTrigger value="archived">Archived Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">
                  Lead Response Follow-up
                </TableCell>
                <TableCell>When a lead responds to an email</TableCell>
                <TableCell>Apr 10, 2025</TableCell>
                <TableCell>2 hours ago</TableCell>
                <TableCell>
                  <div className="bg-black text-white px-2 py-1 rounded text-xs inline-block">
                    Active
                  </div>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm">
                    Pause
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  New Lead Assignment
                </TableCell>
                <TableCell>When a new lead is created</TableCell>
                <TableCell>Mar 22, 2025</TableCell>
                <TableCell>30 minutes ago</TableCell>
                <TableCell>
                  <div className="bg-black text-white px-2 py-1 rounded text-xs inline-block">
                    Active
                  </div>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm">
                    Pause
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  Campaign Completion Notification
                </TableCell>
                <TableCell>When a campaign is completed</TableCell>
                <TableCell>Feb 15, 2025</TableCell>
                <TableCell>3 days ago</TableCell>
                <TableCell>
                  <div className="bg-black text-white px-2 py-1 rounded text-xs inline-block">
                    Active
                  </div>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm">
                    Pause
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="draft">{/* Draft workflows content */}</TabsContent>

        <TabsContent value="archived">
          {/* Archived workflows content */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
