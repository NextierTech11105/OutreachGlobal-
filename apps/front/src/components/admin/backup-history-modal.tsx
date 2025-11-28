"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { getBackupHistory } from "@/lib/services/system-maintenance-service";

interface BackupHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BackupHistoryModal({
  open,
  onOpenChange,
}: BackupHistoryModalProps) {
  const [backups, setBackups] = useState<
    Array<{ filename: string; timestamp: string; size: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getBackupHistory()
        .then((data) => {
          setBackups(data);
        })
        .catch((error) => {
          console.error("Failed to fetch backup history:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Backup History</DialogTitle>
          <DialogDescription>
            View and download previous database backups
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Filename</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((backup) => (
                <TableRow key={backup.filename}>
                  <TableCell>
                    {format(new Date(backup.timestamp), "PPP p")}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {backup.filename}
                  </TableCell>
                  <TableCell>{backup.size}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
