"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  RefreshCw,
  Database,
  Shield,
  Clock,
  Mail,
  AlertTriangle,
  Loader2,
  Download,
  History,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  createDatabaseBackup,
  clearSystemCache,
  getSystemLogs,
  getCacheStatistics,
} from "@/lib/services/system-maintenance-service";
import { MaintenanceScheduleModal } from "@/components/admin/maintenance-schedule-modal";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import { BackupHistoryModal } from "@/components/admin/backup-history-modal";
import { format } from "date-fns";

export default function SystemSettingsPage() {
  // State for maintenance tab - starts with no data until loaded from API
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [lastCleared, setLastCleared] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState({
    size: "0 MB",
    items: 0,
  });
  const [auditLogs, setAuditLogs] = useState<
    Array<{
      timestamp: string;
      user: string;
      action: string;
      entityType: string;
      entityId: string;
    }>
  >([]);

  // State for modals
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false);
  const [backupHistoryOpen, setBackupHistoryOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // Handle database backup
  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const result = await createDatabaseBackup();
      if (result.success) {
        setLastBackup(format(new Date(result.timestamp), "PPP p"));
        toast({
          title: "Backup Created",
          description: `Database backup ${result.filename} created successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Backup Failed",
        description: "Failed to create database backup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  // Handle cache clearing
  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      const result = await clearSystemCache();
      if (result.success) {
        setLastCleared(format(new Date(), "PPP p"));
        setCacheStats((prev) => ({ ...prev, items: 0 }));
        toast({
          title: "Cache Cleared",
          description: `Successfully cleared ${result.clearedItems} cached items.`,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Clear Cache",
        description: "An error occurred while clearing the cache.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  // Handle logs download
  const handleDownloadLogs = async () => {
    setIsDownloading(true);
    try {
      const result = await getSystemLogs();
      if (result.success) {
        // In a real implementation, this would trigger a file download
        // For now, we'll just show a success message
        toast({
          title: "Logs Downloaded",
          description: "System logs have been downloaded successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download system logs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle system reset
  const handleResetSystem = async () => {
    setIsResetting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 3000));

      toast({
        title: "System Reset",
        description: "The system has been reset to default settings.",
      });
      setResetConfirmOpen(false);
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: "Failed to reset the system. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Handle data purge
  const handlePurgeData = async () => {
    setIsPurging(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 4000));

      toast({
        title: "Data Purged",
        description: "All data has been permanently deleted from the system.",
      });
      setPurgeConfirmOpen(false);
    } catch (error) {
      toast({
        title: "Purge Failed",
        description: "Failed to purge data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPurging(false);
    }
  };

  // Load cache statistics
  const loadCacheStats = async () => {
    try {
      const stats = await getCacheStatistics();
      setCacheStats({ size: stats.size, items: stats.items });
      setLastCleared(format(new Date(stats.lastCleared), "PPP p"));
    } catch (error) {
      console.error("Failed to load cache statistics:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="border-b p-6">
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure global system settings and monitor system health
        </p>
      </div>
      <div className="flex-1 space-y-6 p-6">
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="logs">Audit Logs</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure global system settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" defaultValue="OutreachGlobal" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <Input id="timezone" defaultValue="America/New_York" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Input id="dateFormat" defaultValue="MM/DD/YYYY" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeFormat">Time Format</Label>
                  <Input id="timeFormat" defaultValue="12-hour" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableAnalytics">Enable Analytics</Label>
                    <p className="text-xs text-muted-foreground">
                      Collect anonymous usage data to improve the platform
                    </p>
                  </div>
                  <Switch id="enableAnalytics" defaultChecked />
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>
                  View system information and status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">System Status</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">API Status</span>
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 text-green-500 border-green-500/20"
                        >
                          Operational
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Database Status</span>
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 text-green-500 border-green-500/20"
                        >
                          Operational
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Job Queue</span>
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 text-green-500 border-green-500/20"
                        >
                          Operational
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Storage</span>
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 text-green-500 border-green-500/20"
                        >
                          Operational
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      System Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Version</span>
                        <span className="text-sm font-medium">2.5.0</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Last Updated</span>
                        <span className="text-sm font-medium">
                          {format(new Date(), "MMMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Environment</span>
                        <span className="text-sm font-medium">
                          {process.env.NODE_ENV === "production"
                            ? "Production"
                            : "Development"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Database Size</span>
                        <span className="text-sm font-medium">—</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure security settings for your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="twoFactorAuth">
                      Require Two-Factor Authentication
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Require all users to set up two-factor authentication
                    </p>
                  </div>
                  <Switch id="twoFactorAuth" defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="passwordExpiration">
                      Password Expiration
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Require users to change their password periodically
                    </p>
                  </div>
                  <Switch id="passwordExpiration" defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordExpirationDays">
                    Password Expiration Days
                  </Label>
                  <Input
                    id="passwordExpirationDays"
                    type="number"
                    defaultValue="90"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ipRestriction">IP Restriction</Label>
                    <p className="text-xs text-muted-foreground">
                      Restrict access to specific IP addresses
                    </p>
                  </div>
                  <Switch id="ipRestriction" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowedIPs">
                    Allowed IP Addresses (comma separated)
                  </Label>
                  <Input
                    id="allowedIPs"
                    placeholder="e.g. 192.168.1.1, 10.0.0.1"
                  />
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button>
                    <Shield className="mr-2 h-4 w-4" />
                    Save Security Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Settings</CardTitle>
                <CardDescription>
                  Configure email settings for the system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpServer">SMTP Server</Label>
                  <Input id="smtpServer" defaultValue="smtp.example.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input id="smtpPort" type="number" defaultValue="587" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">SMTP Username</Label>
                  <Input
                    id="smtpUsername"
                    defaultValue="notifications@outreachglobal.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP Password</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    defaultValue="••••••••••••"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="useTLS">Use TLS</Label>
                    <p className="text-xs text-muted-foreground">
                      Use TLS encryption for SMTP connection
                    </p>
                  </div>
                  <Switch id="useTLS" defaultChecked />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="defaultFromEmail">Default From Email</Label>
                  <Input
                    id="defaultFromEmail"
                    defaultValue="notifications@outreachglobal.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultFromName">Default From Name</Label>
                  <Input
                    id="defaultFromName"
                    defaultValue="OutreachGlobal Notifications"
                  />
                </div>

                <Separator />

                <div className="flex justify-between">
                  <Button variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Test Connection
                  </Button>

                  <Button>
                    <Mail className="mr-2 h-4 w-4" />
                    Save Email Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>View system audit logs</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-12 text-muted-foreground"
                        >
                          <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="font-medium">No Audit Logs</p>
                          <p className="text-sm">
                            Activity logs will appear here as actions are
                            performed
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map((log, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{log.timestamp}</TableCell>
                          <TableCell>{log.user}</TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>{log.entityType}</TableCell>
                          <TableCell>{log.entityId}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Maintenance</CardTitle>
                <CardDescription>
                  Perform system maintenance tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Database Backup</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create a backup of the database
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">
                            Last Backup: {lastBackup || "Never"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setBackupHistoryOpen(true)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBackup}
                          disabled={isBackingUp}
                        >
                          {isBackingUp ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Backing Up...
                            </>
                          ) : (
                            <>
                              <Database className="mr-2 h-4 w-4" />
                              Backup Now
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Clear Cache</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Clear system cache to free up memory
                      </p>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm">
                            Last Cleared: {lastCleared || "Never"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Current Size: {cacheStats.size} ({cacheStats.items}{" "}
                            items)
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleClearCache}
                          disabled={isClearing}
                        >
                          {isClearing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Clearing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Clear Cache
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">System Logs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Download system logs for troubleshooting
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={handleDownloadLogs}
                        disabled={isDownloading}
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Download Logs
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        Scheduled Maintenance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Schedule system maintenance window
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setScheduleModalOpen(true)}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Schedule Maintenance
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <Card className="border-red-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-red-500 flex items-center">
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      Danger Zone
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Reset System</h4>
                          <p className="text-sm text-muted-foreground">
                            Reset the system to default settings
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setResetConfirmOpen(true)}
                        >
                          Reset System
                        </Button>
                      </div>

                      <Separator />

                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Purge All Data</h4>
                          <p className="text-sm text-muted-foreground">
                            Permanently delete all data from the system
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setPurgeConfirmOpen(true)}
                        >
                          Purge Data
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <MaintenanceScheduleModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
      />

      <ConfirmationDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Reset System"
        description="Are you sure you want to reset the system to default settings? This will reset all configuration but preserve your data."
        confirmText="Reset System"
        onConfirm={handleResetSystem}
        isDestructive={true}
        isLoading={isResetting}
      />

      <ConfirmationDialog
        open={purgeConfirmOpen}
        onOpenChange={setPurgeConfirmOpen}
        title="Purge All Data"
        description="Are you absolutely sure you want to permanently delete ALL data from the system? This action cannot be undone."
        confirmText="Purge All Data"
        onConfirm={handlePurgeData}
        isDestructive={true}
        isLoading={isPurging}
      />

      <BackupHistoryModal
        open={backupHistoryOpen}
        onOpenChange={setBackupHistoryOpen}
      />
    </div>
  );
}
