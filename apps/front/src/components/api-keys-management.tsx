"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { gql, useMutation, useQuery } from "@apollo/client";
import { useCurrentTeam } from "@/features/team/team.context";

const API_KEYS_QUERY = gql`
  query ApiKeys($teamId: String!) {
    apiKeys(teamId: $teamId) {
      id
      keyPrefix
      name
      type
      isActive
      lastUsedAt
      expiresAt
      createdAt
    }
  }
`;

const CREATE_API_KEY = gql`
  mutation CreateApiKey($input: CreateApiKeyInput!) {
    createApiKey(input: $input) {
      id
      key
      keyPrefix
      name
      type
      createdAt
    }
  }
`;

const REVOKE_API_KEY = gql`
  mutation RevokeApiKey($keyId: String!, $teamId: String!) {
    revokeApiKey(keyId: $keyId, teamId: $teamId)
  }
`;

const DEACTIVATE_API_KEY = gql`
  mutation DeactivateApiKey($keyId: String!, $teamId: String!) {
    deactivateApiKey(keyId: $keyId, teamId: $teamId)
  }
`;

const ACTIVATE_API_KEY = gql`
  mutation ActivateApiKey($keyId: String!, $teamId: String!) {
    activateApiKey(keyId: $keyId, teamId: $teamId)
  }
`;

interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  type: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface NewApiKey {
  id: string;
  key: string;
  keyPrefix: string;
  name: string;
  type: string;
  createdAt: string;
}

const KEY_TYPES = [
  { value: "USER", label: "User", description: "Basic access" },
  { value: "ADMIN", label: "Admin", description: "Team admin access" },
  { value: "DEV", label: "Developer", description: "API/Developer access" },
  { value: "OWNER", label: "Owner", description: "Full owner access" },
  { value: "WHITE_LABEL", label: "White Label", description: "Partner access" },
];

export function ApiKeysManagement() {
  const { teamId } = useCurrentTeam();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyType, setNewKeyType] = useState("USER");
  const [newKeyDescription, setNewKeyDescription] = useState("");
  const [createdKey, setCreatedKey] = useState<NewApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const { data, loading, refetch } = useQuery(API_KEYS_QUERY, {
    variables: { teamId },
    skip: !teamId,
  });

  const [createApiKey, { loading: creating }] = useMutation(CREATE_API_KEY, {
    onCompleted: (data) => {
      setCreatedKey(data.createApiKey);
      setNewKeyName("");
      setNewKeyDescription("");
      setNewKeyType("USER");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to create API key: " + error.message);
    },
  });

  const [revokeApiKey] = useMutation(REVOKE_API_KEY, {
    onCompleted: () => {
      toast.success("API key revoked");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to revoke: " + error.message);
    },
  });

  const [deactivateApiKey] = useMutation(DEACTIVATE_API_KEY, {
    onCompleted: () => {
      toast.success("API key deactivated");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to deactivate: " + error.message);
    },
  });

  const [activateApiKey] = useMutation(ACTIVATE_API_KEY, {
    onCompleted: () => {
      toast.success("API key activated");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to activate: " + error.message);
    },
  });

  const apiKeys: ApiKey[] = data?.apiKeys || [];

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }
    createApiKey({
      variables: {
        input: {
          teamId,
          name: newKeyName,
          type: newKeyType,
          description: newKeyDescription || undefined,
        },
      },
    });
  };

  const handleCopyKey = async () => {
    if (createdKey?.key) {
      await navigator.clipboard.writeText(createdKey.key);
      setCopied(true);
      toast.success("API key copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseCreatedDialog = () => {
    setCreatedKey(null);
    setIsCreateOpen(false);
    setShowKey(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "OWNER":
        return "bg-purple-100 text-purple-800";
      case "ADMIN":
        return "bg-red-100 text-red-800";
      case "DEV":
        return "bg-blue-100 text-blue-800";
      case "WHITE_LABEL":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!teamId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Please select a team to manage API keys.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage API keys for programmatic access to your account
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate New Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate New API Key</DialogTitle>
                  <DialogDescription>
                    Create a new API key for accessing the platform
                    programmatically.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Name</Label>
                    <Input
                      id="key-name"
                      placeholder="e.g., Production API Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="key-type">Access Level</Label>
                    <Select value={newKeyType} onValueChange={setNewKeyType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {KEY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex flex-col">
                              <span>{type.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {type.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="key-description">
                      Description (optional)
                    </Label>
                    <Input
                      id="key-description"
                      placeholder="What is this key for?"
                      value={newKeyDescription}
                      onChange={(e) => setNewKeyDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? "Generating..." : "Generate Key"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading API keys...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Key className="mx-auto h-12 w-12 mb-4 opacity-20" />
              <p>No API keys yet</p>
              <p className="text-sm">
                Generate your first API key to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    !key.isActive ? "opacity-50 bg-muted/50" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      <Badge
                        variant="secondary"
                        className={getTypeBadgeColor(key.type)}
                      >
                        {key.type}
                      </Badge>
                      {!key.isActive && (
                        <Badge variant="outline" className="text-yellow-600">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {key.keyPrefix}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {formatDate(key.createdAt)} | Last used:{" "}
                      {formatDate(key.lastUsedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {key.isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          deactivateApiKey({
                            variables: { keyId: key.id, teamId },
                          })
                        }
                      >
                        <EyeOff className="h-4 w-4 mr-1" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          activateApiKey({
                            variables: { keyId: key.id, teamId },
                          })
                        }
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Reactivate
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the API key &quot;
                            {key.name}&quot;. Any applications using this key
                            will immediately lose access. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() =>
                              revokeApiKey({
                                variables: { keyId: key.id, teamId },
                              })
                            }
                          >
                            Revoke Key
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Created Key Dialog - Shows the key only once */}
      <Dialog open={!!createdKey} onOpenChange={handleCloseCreatedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              API Key Created
            </DialogTitle>
            <DialogDescription>
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Copy this key now - you won&apos;t be able to see it again!
              </span>
            </DialogDescription>
          </DialogHeader>
          {createdKey && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <div className="font-medium">{createdKey.name}</div>
              </div>
              <div className="space-y-2">
                <Label>Your API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={createdKey.key}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyKey}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p className="font-medium mb-1">How to use:</p>
                <code className="text-xs">
                  X-API-Key: {createdKey.keyPrefix}
                </code>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleCloseCreatedDialog}>
              I&apos;ve copied my key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
