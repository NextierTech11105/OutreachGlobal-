"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Copy,
  Edit,
  Filter,
  Play,
  Search,
  Share,
  Trash,
} from "lucide-react";

export function SavedSearches() {
  const router = useRouter();
  const [searches, setSearches] = useState([
    {
      id: 1,
      name: "High Equity Queens Properties",
      criteria: "Queens County, Equity > 80%, Single Family",
      lastRun: "Today, 10:30 AM",
      results: 248,
      schedule: "Daily",
    },
    {
      id: 2,
      name: "Pre-Foreclosure Brooklyn",
      criteria: "Kings County, Lis Pendens, Filed within 30 days",
      lastRun: "Yesterday, 4:45 PM",
      results: 156,
      schedule: "Weekly",
    },
    {
      id: 3,
      name: "Vacant Properties Manhattan",
      criteria: "New York County, Vacant, Zoning R6-R8",
      lastRun: "May 5, 2025",
      results: 87,
      schedule: "None",
    },
    {
      id: 4,
      name: "Senior Owners with Reverse Mortgages",
      criteria: "All Counties, Reverse Mortgage, Owner Age > 65",
      lastRun: "May 3, 2025",
      results: 312,
      schedule: "Monthly",
    },
    {
      id: 5,
      name: "Absentee Owners Bronx",
      criteria: "Bronx County, Absentee Owner, Multi-Family",
      lastRun: "May 1, 2025",
      results: 203,
      schedule: "None",
    },
  ]);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchToDelete, setSearchToDelete] = useState<number | null>(null);

  const handleDeleteSearch = (id: number) => {
    setSearchToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (searchToDelete !== null) {
      setSearches(searches.filter((search) => search.id !== searchToDelete));
      setIsDeleteDialogOpen(false);
      setSearchToDelete(null);
    }
  };

  const runSearch = (id: number) => {
    // In a real app, this would run the search
    router.push("/search/advanced");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Your Saved Searches</h3>
        <div className="flex items-center space-x-2">
          <Input className="max-w-sm" placeholder="Filter saved searches..." />
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button onClick={() => router.push("/search/advanced")}>
            <Search className="mr-2 h-4 w-4" />
            New Search
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Search Name</TableHead>
              <TableHead>Criteria</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Results</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {searches.map((search) => (
              <TableRow key={search.id}>
                <TableCell className="font-medium">{search.name}</TableCell>
                <TableCell>{search.criteria}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{search.lastRun}</span>
                  </div>
                </TableCell>
                <TableCell>{search.results.toLocaleString()}</TableCell>
                <TableCell>
                  {search.schedule !== "None" ? (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                    >
                      <Calendar className="mr-1 h-3 w-3" />
                      {search.schedule}
                    </Badge>
                  ) : (
                    <Badge variant="outline">None</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => runSearch(search.id)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push("/search/advanced")}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Share className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSearch(search.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Saved Search</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this saved search? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
