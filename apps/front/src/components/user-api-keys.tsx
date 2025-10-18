"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Copy, Key, Plus, Trash } from "lucide-react";

export function UserApiKeys() {
  const [apiKeys, setApiKeys] = useState([
    {
      id: 1,
      name: "RealEstateAPI Integration",
      key: "re_api_••••••••••••••••",
      created: "May 1, 2025",
      lastUsed: "Today",
      status: "active",
    },
    {
      id: 2,
      name: "Zoho CRM Integration",
      key: "zoho_api_••••••••••••••",
      created: "April 15, 2025",
      lastUsed: "Yesterday",
      status: "active",
    },
    {
      id: 3,
      name: "Development Environment",
      key: "dev_api_•••••••••••••••",
      created: "March 10, 2025",
      lastUsed: "1 week ago",
      status: "active",
    },
  ]);

  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateKey = () => {
    setIsCreating(true);
    // Simulate API call
    setTimeout(() => {
      const generatedKey = "api_" + Math.random().toString(36).substring(2, 15);
      setNewKey(generatedKey);
      setApiKeys([
        ...apiKeys,
        {
          id: apiKeys.length + 1,
          name: newKeyName,
          key: "api_••••••••••••••••",
          created: "Today",
          lastUsed: "Never",
          status: "active",
        },
      ]);
      setIsCreating(false);
      setShowNewKey(true);
      setNewKeyName("");
    }, 1000);
  };

  const handleDeleteKey = (id: number) => {
    setApiKeys(apiKeys.filter((key) => key.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">API Keys</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Create a new API key to integrate with external services.
              </DialogDescription>
            </DialogHeader>
            {!showNewKey ? (
              <>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">API Key Name</Label>
                    <Input
                      id="key-name"
                      placeholder="Enter a name for this API key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Give your API key a descriptive name to identify its
                      purpose
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateKey}
                    disabled={isCreating || !newKeyName}
                  >
                    {isCreating ? "Creating..." : "Create Key"}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <div className="space-y-4 py-4">
                  <div className="rounded-md bg-muted p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Your API Key</p>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="mt-2 font-mono text-sm">{newKey}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Make sure to copy your API key now. You won't be able to see
                    it again!
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setShowNewKey(false);
                      setIsDialogOpen(false);
                    }}
                  >
                    Done
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((apiKey) => (
              <TableRow key={apiKey.id}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{apiKey.name}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {apiKey.key}
                </TableCell>
                <TableCell>{apiKey.created}</TableCell>
                <TableCell>{apiKey.lastUsed}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                  >
                    Active
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteKey(apiKey.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="rounded-md border p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">API Documentation</p>
            <p className="text-sm text-muted-foreground">
              View the API documentation to learn how to use your API keys
            </p>
          </div>
          <Button variant="outline">View Documentation</Button>
        </div>
      </div>
    </div>
  );
}
